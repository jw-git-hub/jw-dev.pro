/**
 * Что происходит под прокруткой: бюджет кадра и обращения к геометрии.
 *
 * Ревизия 26.08.2026 нашла восемь ошибок производительности руками, и ни одни
 * ворота их не видели: `check:budget` взвешивает байты, а проблема целиком
 * в рантайме; `check:lighthouse` меряет окно загрузки и **не прокручивает** —
 * страница, которая грузится за 0,6 с и потом жжёт по 18 мс на кадр вечно,
 * получает у него сто баллов.
 *
 * Здесь всё наоборот: загрузку не смотрим вовсе, а шесть секунд катаем страницу
 * свайпом на замедленном вчетверо процессоре — так выглядит средний Android.
 * Два вывода за один прогон:
 *
 *   1. Сколько раз код спросил у браузера геометрию во время прокрутки.
 *   2. Сколько элементов браузер из-за этого пересчитал — на кадр.
 *
 * Обе величины считают **работу**, а не время. Время сюда не годится
 * принципиально, и это проверено дважды за один день (см. «Пороги» ниже).
 * Прогонов всё равно три, средний — как в Lighthouse.
 *
 * Прокрутка идёт настоящим жестом, а не `scrollTo`: событие проходит весь
 * конвейер ввода браузера, включая ту его часть, которая и тормозила.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { serveDist } from './lib/serve.mjs';
import { report } from './lib/report.mjs';

// Главная: на ней собрано всё тяжёлое сразу — фоновая сеть, параллакс сцены,
// кольцо стека и бегущий импульс процесса. На внутренних живёт только часть.
const PAGE = '/ru/';

const RUNS = 3;
const SCROLL_MS = 6000;
const SETTLE_MS = 700;
const CPU_SLOWDOWN = 4;

// Уверенный свайп пальцем. Медленнее — и ворота не увидят ничего, кроме
// холостых кадров; быстрее — и замер упрётся в резкий флик, на котором
// сегодня рвётся и здоровая страница.
const SCROLL_SPEED = 2500;

/** Кадр длиннее этого пропустил хотя бы один интервал развёртки (16,7 мс при 60 Гц). */
const LONG_FRAME_MS = 25;

/**
 * Пороги — сегодняшний замер плюс запас, а не идеал.
 *
 * Ворота стерегут счёт работы, а не время, и это далось не сразу: 01.09.2026
 * две временные величины подряд оказались непригодны, каждая по-своему.
 *
 * Длительность кадра квантована развёрткой: 95-й перцентиль принимает только
 * 16,7 / 33,3 / 50, между ними нет ничего. Порог «30 мс» читался как бюджет
 * в миллисекундах, а работал как скрытое «не больше 5% пропущенных кадров»,
 * и запаса до него не существовало вовсе. Здоровая главная пропускает 2,3–3,3%
 * кадров на свободной машине и 9,7–12,8% на занятой — число перепрыгивало порог
 * целиком, не меняя ни байта кода. На маке ворота краснели через раз.
 *
 * Занятость главного потока (`TaskDuration` к окну замера) держалась на маке
 * ровно, 39,4–46,1% от простоя до восьми занятых ядер, — и развалилась на общей
 * виртуалке: один коммит на двух раннерах в одну минуту дал 48,8% и 69,6% при
 * пропущенных 0,1% и 0,3%. `TaskDuration` — время по часам, а не время
 * процессора, и украденное у vCPU ложится прямо в него.
 *
 * Счёт пересчитанных элементов от машины не зависит: на маке при вчетверо
 * замедленном процессоре здоровая главная даёт 60 на кадр, при полностью занятых
 * восьми ядрах — те же 60, при вдвое более медленном процессоре — 64–67, втрое —
 * 81–90. Дерево `9b2b0f9^`, где ревизия 26.08.2026 нашла восемь ошибок руками,
 * даёт 274–279 на любой скорости. Порог 150 стоит посередине: до него
 * шестидесятикратный запас от худшего здорового замера и вдвое от лучшего больного.
 *
 * Счёт **событий** пересчёта на эту роль не годится и был проверен: у больного
 * дерева их 1,43 на кадр против 1,55 у здорового — меньше, просто каждое дороже
 * вчетверо. Считать надо элементы, а не события.
 *
 * Доля пропущенных кадров осталась в выводе справкой, без порога. Она отвечает
 * на вопрос «видно ли это глазом», но переносить её между машинами нельзя:
 * на раннере она в десять раз лучше, чем на маке, на том же самом коде.
 */
const LIMITS = { stylePerFrame: 150, reads: 320 };

const PHONE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
  // Явно, а не по умолчанию: при `reduce` канвас уходит в `display:none`,
  // и ворота мерили бы пустой экран, ничего об этом не сказав.
  reducedMotion: 'no-preference',
};

/** Сколько элементов браузер пересчитал за все события пересчёта стиля. */
export function styleElementsOf(events) {
  return events
    .filter((event) => event.name === 'UpdateLayoutTree')
    .reduce((total, event) => total + (event.args?.elementCount ?? 0), 0);
}

/** Доля кадров длиннее порога, в процентах с десятой. Показывается, но не стережётся. */
export function longFrameShare(frames, limitMs) {
  if (frames.length === 0) return 0;
  const long = frames.filter((frame) => frame > limitMs).length;
  return Math.round((long / frames.length) * 1000) / 10;
}

/** Значение, ниже которого лежит доля `p` замеров. */
export function percentile(numbers, p) {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

/** Нарушенные пороги, по одной строке на каждый. */
export function problemsOf(measured, limits, page) {
  const named = [
    ['stylePerFrame', 'пересчитано элементов на кадр', ''],
    ['reads', 'обращений к геометрии за прокрутку', ''],
  ];
  return named
    .filter(([key]) => measured[key] > limits[key])
    .map(
      ([key, title, unit]) =>
        `${page} — ${title} ${measured[key]}${unit}, порог ${limits[key]}${unit}`,
    );
}

/** Высота прокрутки страницы. Читается до записи — иначе попадёт в счётчик. */
const scrollableHeight = (page) =>
  page.evaluate(
    // Тело уезжает в браузер, где `document` есть; ESLint судит его по правилам
    // Node, где его нет. Исключение точечное, на одну строку.
    // eslint-disable-next-line no-undef
    () => document.documentElement.scrollHeight - window.innerHeight,
  );

/**
 * Один жест прокрутки вместо сотен отдельных команд.
 *
 * `Input.synthesizeScrollGesture` браузер разыгрывает у себя внутри с родной
 * частотой. Прокрутка колесом из Node давала ту же картину, но каждое колесо —
 * отдельный вызов по отладочному протоколу, и дрожь стенда подмешивалась
 * в замер страницы.
 */
function drive(cdp, height) {
  return cdp.send('Input.synthesizeScrollGesture', {
    x: PHONE.viewport.width / 2,
    y: PHONE.viewport.height / 2,
    xDistance: 0,
    yDistance: -Math.min(height, (SCROLL_SPEED * SCROLL_MS) / 1000),
    speed: SCROLL_SPEED,
    repeatCount: 1,
    gestureSourceType: 'touch',
  });
}

/** Кусок, которым читается поток трассировки. Мегабайт — компромисс вызовов и памяти. */
const TRACE_CHUNK = 1 << 20;

/** Категория, в которой у события пересчёта стиля есть счётчик элементов. */
const TRACE_CATEGORY = 'disabled-by-default-devtools.timeline';

/**
 * Трассировка браузера, собранная в память.
 *
 * `Tracing.end` только запускает выгрузку, поэтому сначала подписка на конец,
 * потом команда: иначе событие успевает прийти раньше подписки и чтение зависает.
 */
async function collectTrace(cdp) {
  const finished = new Promise((done) => cdp.on('Tracing.tracingComplete', done));
  await cdp.send('Tracing.end');
  const { stream } = await finished;

  const parts = [];
  for (;;) {
    const chunk = await cdp.send('IO.read', { handle: stream, size: TRACE_CHUNK });
    parts.push(chunk.base64Encoded ? Buffer.from(chunk.data, 'base64').toString() : chunk.data);
    if (chunk.eof) break;
  }
  await cdp.send('IO.close', { handle: stream });
  return JSON.parse(parts.join('')).traceEvents;
}

/** Один прогон: свежая вкладка, замедленный процессор, шесть секунд прокрутки. */
async function runOnce(browser, url, probeScript) {
  const context = await browser.newContext(PHONE);
  await context.addInitScript({ content: probeScript });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  await page.goto(url, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle');
  const height = await scrollableHeight(page);

  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });
  await page.mouse.move(PHONE.viewport.width / 2, PHONE.viewport.height / 2);
  await page.waitForTimeout(SETTLE_MS);

  await cdp.send('Tracing.start', {
    transferMode: 'ReturnAsStream',
    traceConfig: { includedCategories: [TRACE_CATEGORY] },
  });
  await page.evaluate(() => {
    // eslint-disable-next-line no-undef
    window.__probe.start();
  });
  await drive(cdp, height);
  await page.evaluate(() => {
    // eslint-disable-next-line no-undef
    window.__probe.stop();
  });
  const events = await collectTrace(cdp);
  // eslint-disable-next-line no-undef
  const { reads, frames } = await page.evaluate(() => window.__probe.result());

  await context.close();
  const styleElements = styleElementsOf(events);
  return {
    reads,
    styleElements,
    stylePerFrame: frames.length === 0 ? 0 : Math.round(styleElements / frames.length),
    longShare: longFrameShare(frames, LONG_FRAME_MS),
    frames,
  };
}

/** Средний прогон из трёх по каждому показателю. */
const middleOf = (runs, key) =>
  Math.round(
    percentile(
      runs.map((run) => run[key]),
      50,
    ) * 10,
  ) / 10;

/**
 * Исходник зонда как обычный скрипт для страницы.
 *
 * `export` снимается построчно: в браузер уезжает классический скрипт, а модулем
 * файл остаётся ради линтеров и тестов. `import` внутри зонда запрещён — его
 * отсутствие проверяют ворота на сами ворота.
 */
async function probeSource() {
  const file = new URL('./lib/probe.mjs', import.meta.url);
  const source = await readFile(file, 'utf8');
  return `${source.replace(/^export /gm, '')}\ninstallProbe();`;
}

async function run() {
  const probeScript = await probeSource();
  const site = await serveDist();
  const browser = await chromium.launch();

  const runs = [];
  for (let i = 0; i < RUNS; i += 1) {
    runs.push(await runOnce(browser, site.origin + PAGE, probeScript));
  }

  await browser.close();
  await site.stop();

  const measured = {
    stylePerFrame: middleOf(runs, 'stylePerFrame'),
    reads: middleOf(runs, 'reads'),
  };

  // Пустой замер проходит любой порог: нулевая медиана меньше всего на свете.
  // Молчать об этом нельзя — зелёные ворота выглядели бы как исправная страница.
  const problems = problemsOf(measured, LIMITS, PAGE);
  if (runs.some((one) => one.frames.length === 0)) {
    problems.push(`${PAGE} — зонд не записал ни одного кадра: замера не было`);
  }
  // Пустая трассировка даёт ноль элементов, а ноль проходит любой порог.
  if (runs.some((one) => one.styleElements === 0)) {
    problems.push(`${PAGE} — трассировка не дала ни одного пересчёта стиля: замера не было`);
  }

  console.log(
    `    ${PAGE} — пересчитано элементов ${measured.stylePerFrame} на кадр, ` +
      `обращений к геометрии ${measured.reads}, ` +
      `пропущенных кадров ${middleOf(runs, 'longShare')}% из ${runs[0].frames.length}`,
  );

  return report('бюджет кадра под прокруткой', problems, RUNS, 'прогона');
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) process.exit(await run());
