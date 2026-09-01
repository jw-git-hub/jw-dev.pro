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
 *   2. Какую долю прокрутки главный поток был занят работой.
 *
 * Оба показателя меряют сделанную работу, а не прождённое время, и поэтому
 * не зависят от загрузки машины. Прогонов всё равно три, средний — как
 * в Lighthouse: дешевле, чем разбираться потом, был ли прогон особенным.
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
 * До 01.09.2026 хвост кадра стерёг 95-й перцентиль с порогом 30 мс, и ворота
 * краснели примерно на половине прогонов чистого дерева. Причина не в пороге,
 * а в самой величине: длительность кадра квантована развёрткой, поэтому p95
 * принимает только значения 16,7 / 33,3 / 50 — между ними нет ничего. «Порог
 * 30 мс» читался как бюджет в миллисекундах, а был скрытым «не больше 5%
 * пропущенных кадров», и обещанного запаса до него не существовало вовсе.
 * Замер это подтвердил: здоровая главная на свободной машине пропускает
 * 3,3–3,9% кадров, она же при восьми занятых ядрах — 9,0–10,4%, и p95
 * переваливал с 17,6 сразу на 33,3. Ворота реагировали на загрузку хоста.
 *
 * Заменять величину пришлось, а не порог. Кадр меряет, сколько поток **ждал**,
 * а ждёт он и из-за чужих процессов. Занятость меряет, сколько он **работал**,
 * и на неё чужая нагрузка почти не действует: девять прогонов здорового дерева —
 * от простоя до восьми занятых ядер — дали 39,4–46,1%, тогда как доля пропущенных
 * кадров в тех же прогонах ходила от 2,2% до 10,4%. Дерево `9b2b0f9^`, где ревизия
 * 26.08.2026 нашла восемь ошибок руками, даёт 71,4–80,7%. Порог 55% стоит между:
 * девять пунктов до худшего здорового замера и шестнадцать до лучшего больного.
 *
 * Медианы кадра здесь больше нет. Она квантована так же, а на больном дереве
 * равна 16,8 мс — половина кадров выходила вовремя даже там, и порог 20 мс
 * не мог сработать ни на чём, кроме полного обвала.
 */
const LIMITS = { busyShare: 55, reads: 320 };

const PHONE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
  // Явно, а не по умолчанию: при `reduce` канвас уходит в `display:none`,
  // и ворота мерили бы пустой экран, ничего об этом не сказав.
  reducedMotion: 'no-preference',
};

/**
 * Доля прокрутки, которую главный поток провёл в задачах, в процентах с десятой.
 *
 * `TaskDuration` — счётчик самого браузера: сумма длительности задач главного
 * потока. Чужая нагрузка растягивает окно и задачи одинаково, поэтому отношение
 * к ней почти нечувствительно, в отличие от длины кадра.
 */
export function busyShareOf(before, after) {
  const window = after.Timestamp - before.Timestamp;
  if (window <= 0) return 0;
  return Math.round(((after.TaskDuration - before.TaskDuration) / window) * 1000) / 10;
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
    ['busyShare', 'занятость главного потока', '%'],
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

/** Счётчики браузера по имени: `Performance.getMetrics` отдаёт их списком пар. */
async function metricsOf(cdp) {
  const { metrics } = await cdp.send('Performance.getMetrics');
  return Object.fromEntries(metrics.map((metric) => [metric.name, metric.value]));
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

  await cdp.send('Performance.enable');
  const before = await metricsOf(cdp);
  await page.evaluate(() => {
    // eslint-disable-next-line no-undef
    window.__probe.start();
  });
  await drive(cdp, height);
  await page.evaluate(() => {
    // eslint-disable-next-line no-undef
    window.__probe.stop();
  });
  const after = await metricsOf(cdp);
  // eslint-disable-next-line no-undef
  const { reads, frames } = await page.evaluate(() => window.__probe.result());

  await context.close();
  return {
    reads,
    busyShare: busyShareOf(before, after),
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
    busyShare: middleOf(runs, 'busyShare'),
    reads: middleOf(runs, 'reads'),
  };

  // Пустой замер проходит любой порог: нулевая медиана меньше всего на свете.
  // Молчать об этом нельзя — зелёные ворота выглядели бы как исправная страница.
  const problems = problemsOf(measured, LIMITS, PAGE);
  if (runs.some((one) => one.frames.length === 0)) {
    problems.push(`${PAGE} — зонд не записал ни одного кадра: замера не было`);
  }

  // Доля пропущенных кадров порогом не стережётся — она и есть та величина,
  // которая шумит от чужой нагрузки, — но краснеющие ворота без неё не объяснить:
  // она отвечает на вопрос «видно ли это глазом».
  console.log(
    `    ${PAGE} — главный поток занят ${measured.busyShare}% прокрутки, ` +
      `обращений к геометрии ${measured.reads}, ` +
      `пропущенных кадров ${middleOf(runs, 'longShare')}% из ${runs[0].frames.length}`,
  );

  return report('бюджет кадра под прокруткой', problems, RUNS, 'прогона');
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) process.exit(await run());
