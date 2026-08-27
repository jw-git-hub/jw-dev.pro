/**
 * Три движка: Chrome, Firefox и Safari.
 *
 * iOS и Android нам подменяет мобильный экран в тех же движках: WebKit здесь —
 * тот же, что в Safari на iPhone, Chromium — тот же, что в Chrome на Android.
 * Настоящие телефоны это не заменяет, и ручной обход остаётся в плане.
 *
 * Смотрим на три вещи, которые ломаются молча и по-разному в каждом движке:
 * ошибки в консоли, поездка страницы вбок на узком экране и пропавший заголовок.
 * Вбок — потому что вёрстка держится на `clamp()` и сцене: перелившийся блок
 * не роняет ничего, он просто даёт горизонтальную прокрутку у посетителя.
 */
import { chromium, firefox, webkit } from 'playwright';
import { serveDist } from './lib/serve.mjs';
import { report } from './lib/report.mjs';

/**
 * `isMobile` Firefox не поддерживает и падает с ошибкой при запуске контекста,
 * поэтому там остаётся только касание. Разница не косметическая: без `isMobile`
 * движок не применяет `<meta viewport>` и не считает себя телефоном, а вместе
 * с `hasTouch` от этого зависит ветка `@media (hover: none)` и `(pointer: coarse)` —
 * мобильные стили, ради которых узкий экран и открывается.
 */
const ENGINES = [
  { name: 'Chrome', launch: chromium, mobile: true },
  { name: 'Firefox', launch: firefox, mobile: false },
  { name: 'Safari', launch: webkit, mobile: true },
];

// Узкий экран телефона: на нём поездка вбок заметнее всего.
const MOBILE = { width: 390, height: 844 };

// Двойная плотность растра — как у любого телефона последних десяти лет.
const PIXEL_RATIO = 2;

// По одной странице каждого типа: главная, кейс, статья, журнал.
const PAGES = ['/ru/', '/ru/work/vn-neva-beauty/', '/ru/log/unicode-range-fonts/', '/ru/log/'];

/** Насколько страница шире экрана. Единица допуска — на округление движка. */
const overflowOf = (page) =>
  // Тело evaluate уезжает в браузер и там `document` есть; ESLint судит его
  // по правилам Node, где его нет. Исключение точечное, на одну строку.
  // eslint-disable-next-line no-undef
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/**
 * Правда ли страница открыта как на телефоне.
 *
 * Без этой строки правка контекста непроверяема: ворота были зелёными и когда
 * контекст был настольным, и после. Значение `coarse` даёт `hasTouch`, а его
 * понимают все три движка — в отличие от `isMobile`.
 */
const isCoarse = (page) =>
  // eslint-disable-next-line no-undef
  page.evaluate(() => window.matchMedia('(pointer: coarse)').matches);

async function checkPage(page, origin, url, engine, fail) {
  const noise = [];
  const onConsole = (msg) => msg.type() === 'error' && noise.push(msg.text());
  const onError = (error) => noise.push(error.message);
  page.on('console', onConsole);
  page.on('pageerror', onError);

  await page.goto(origin + url, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle');

  if (!(await isCoarse(page))) fail(`${engine} ${url} — контекст не мобильный: касания нет`);

  if ((await page.locator('h1').count()) !== 1) fail(`${engine} ${url} — не один <h1>`);

  const overflow = await overflowOf(page);
  if (overflow > 1) fail(`${engine} ${url} — страница шире экрана на ${overflow}px`);

  for (const line of noise) fail(`${engine} ${url} — ошибка в консоли: ${line.split('\n')[0]}`);

  page.off('console', onConsole);
  page.off('pageerror', onError);
}

const site = await serveDist();
const problems = [];
const fail = (why) => problems.push(why);

for (const engine of ENGINES) {
  const browser = await engine.launch.launch();
  const context = await browser.newContext({
    viewport: MOBILE,
    deviceScaleFactor: PIXEL_RATIO,
    hasTouch: true,
    isMobile: engine.mobile,
  });
  const page = await context.newPage();

  for (const url of PAGES) {
    try {
      await checkPage(page, site.origin, url, engine.name, fail);
    } catch (error) {
      fail(`${engine.name} ${url} — проверка сорвалась: ${error.message.split('\n')[0]}`);
    }
  }
  await browser.close();
}

await site.stop();

process.exit(
  report('три движка на узком экране', problems, ENGINES.length * PAGES.length, 'проверок'),
);
