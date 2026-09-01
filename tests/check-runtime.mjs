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
 *   1. Сколько раз код спросил у браузера геометрию во время прокрутки. Счёт
 *      не зависит от загрузки машины, поэтому эти ворота падают воспроизводимо.
 *   2. Медиана и 95-й перцентиль длительности кадра. Здесь загрузка раннера
 *      уже мешает, поэтому прогонов три и берётся средний — как в Lighthouse.
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

/**
 * Пороги — сегодняшний замер плюс запас, а не идеал.
 *
 * `frameP95` опущен с 60 до 30 мс 28.08.2026, вместе с починкой: перехода
 * у акцента больше нет, и хвост рывков ушёл. Замер на маке — 17,6–17,7 мс
 * три прогона подряд, разброс в десятую. Запас почти двукратный: на чужой
 * машине кадр дороже, а ворота обязаны ловить ухудшение, а не шум.
 */
const LIMITS = { frameMedian: 20, frameP95: 30, reads: 320 };

const PHONE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
  // Явно, а не по умолчанию: при `reduce` канвас уходит в `display:none`,
  // и ворота мерили бы пустой экран, ничего об этом не сказав.
  reducedMotion: 'no-preference',
};

/** Значение, ниже которого лежит доля `p` замеров. */
export function percentile(numbers, p) {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

/** Нарушенные пороги, по одной строке на каждый. */
export function problemsOf(measured, limits, page) {
  const named = [
    ['frameMedian', 'медиана кадра', 'мс'],
    ['frameP95', '95-й перцентиль кадра', 'мс'],
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

  await page.evaluate(() => {
    // eslint-disable-next-line no-undef
    window.__probe.start();
  });
  await drive(cdp, height);
  await page.evaluate(() => {
    // eslint-disable-next-line no-undef
    window.__probe.stop();
  });
  // eslint-disable-next-line no-undef
  const { reads, frames } = await page.evaluate(() => window.__probe.result());

  await context.close();
  return { reads, frameMedian: percentile(frames, 50), frameP95: percentile(frames, 95), frames };
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
    frameMedian: middleOf(runs, 'frameMedian'),
    frameP95: middleOf(runs, 'frameP95'),
    reads: middleOf(runs, 'reads'),
  };

  // Пустой замер проходит любой порог: нулевая медиана меньше всего на свете.
  // Молчать об этом нельзя — зелёные ворота выглядели бы как исправная страница.
  const problems = problemsOf(measured, LIMITS, PAGE);
  if (runs.some((one) => one.frames.length === 0)) {
    problems.push(`${PAGE} — зонд не записал ни одного кадра: замера не было`);
  }

  console.log(
    `    ${PAGE} — кадр ${measured.frameMedian} мс, p95 ${measured.frameP95} мс, ` +
      `обращений к геометрии ${measured.reads}, кадров в замере ${runs[0].frames.length}`,
  );

  return report('бюджет кадра под прокруткой', problems, RUNS, 'прогона');
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) process.exit(await run());
