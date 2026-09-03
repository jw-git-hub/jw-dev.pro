/**
 * Правило проекта: сайт работает с выключенным JavaScript.
 *
 * Навигация, кейсы, статьи, журнал, переключение языка и отправка формы обязаны
 * работать без скриптов. Проверяем не разметку глазами, а переходы в браузере
 * с выключенным JS: ссылка, которая на самом деле кнопка с обработчиком,
 * в разметке выглядит прилично и молча ломается только у посетителя.
 *
 * Отправку формы проверяем до кнопки, а не после: приёмник живёт отдельным
 * контейнером, его разбирают тринадцать проверок в `server/contact-api`.
 * Здесь важно, что браузеру есть куда и чем отправить — `method`, `action`
 * и обязательное поле на месте.
 */
import { chromium } from 'playwright';
import { serveDist } from './lib/serve.mjs';
import { report } from './lib/report.mjs';

const MOBILE = { width: 390, height: 844 };

/** Переход по первой ссылке, подходящей под селектор. Возвращает адрес после перехода. */
async function followFirst(page, selector) {
  const link = page.locator(selector).first();
  const href = await link.getAttribute('href');
  await link.click();
  await page.waitForURL(`**${href}`);
  return href;
}

/** Ссылка в разбор кейса, но не на саму витрину: её адрес — префикс их адресов. */
const TO_CASE = 'a[href^="/ru/work/"]:not([href="/ru/work/"])';

const CHECKS = [
  {
    name: 'главная открывается и ведёт в разделы',
    async run(page, origin, fail) {
      await page.goto(`${origin}/ru/`);
      if ((await page.locator('h1').count()) !== 1) fail('на главной не один <h1>');
      if ((await page.locator('header a[href]').count()) === 0) fail('в шапке нет ссылок');
    },
  },
  {
    name: 'карточка кейса — ссылка, а не кнопка со скриптом',
    async run(page, origin, fail) {
      await page.goto(`${origin}/ru/`);
      // Саму витрину исключаем: на неё ведут и пункт шапки, и кнопка «Все
      // работы», а проверяем мы здесь карточку. Пункт шапки на этой ширине
      // ещё и спрятан под бургером — клик по нему просто истёк бы по времени.
      if ((await page.locator(TO_CASE).count()) === 0) {
        return fail('с главной не ведёт ни одной ссылки на кейс');
      }

      const href = await followFirst(page, TO_CASE);
      if ((await page.locator('h1').count()) !== 1) fail(`кейс ${href} открылся без <h1>`);
    },
  },
  {
    name: 'витрина работ открывается и ведёт в разбор',
    async run(page, origin, fail) {
      await page.goto(`${origin}/ru/`);
      // Именно из содержимого страницы: пункт шапки ведёт туда же, но на этой
      // ширине он спрятан под бургером, и клик по нему истёк бы по времени.
      await followFirst(page, 'main a[href="/ru/work/"]');

      if ((await page.locator('h1').count()) !== 1) fail('на витрине не один <h1>');
      if ((await page.locator(TO_CASE).count()) === 0) {
        return fail('с витрины не ведёт ни одной ссылки на кейс');
      }

      const href = await followFirst(page, TO_CASE);
      if ((await page.locator('.case-full').count()) === 0) {
        fail(`кейс ${href} открылся без разбора`);
      }
    },
  },
  {
    name: 'журнал и статья открываются',
    async run(page, origin, fail) {
      await page.goto(`${origin}/ru/log/`);
      // Сам адрес журнала исключаем: на странице есть табы, ведущие на неё же.
      const toArticle = 'a[href^="/ru/log/"]:not([href="/ru/log/"])';
      if ((await page.locator(toArticle).count()) === 0) {
        return fail('в журнале нет ссылок на статьи');
      }
      const href = await followFirst(page, toArticle);
      if ((await page.locator('.prose').count()) === 0) fail(`статья ${href} открылась без текста`);
    },
  },
  {
    name: 'язык переключается ссылкой',
    async run(page, origin, fail) {
      await page.goto(`${origin}/ru/`);
      await followFirst(page, 'a[hreflang="en"]');
      const lang = await page.locator('html').getAttribute('lang');
      if (lang !== 'en') fail(`с русской главной попали на страницу с lang="${lang}"`);

      await followFirst(page, 'a[hreflang="ru"]');
      const back = await page.locator('html').getAttribute('lang');
      if (back !== 'ru') fail(`обратно с английской попали на страницу с lang="${back}"`);
    },
  },
  {
    name: 'форму есть чем и куда отправить',
    async run(page, origin, fail) {
      await page.goto(`${origin}/ru/`);
      const form = page.locator('form#frm');

      const method = (await form.getAttribute('method'))?.toLowerCase();
      if (method !== 'post') fail(`у формы method="${method}", нужен post`);
      if (!(await form.getAttribute('action'))) fail('у формы нет action — отправлять некуда');
      if ((await form.locator('[name="contact"][required]').count()) !== 1) {
        fail('обязательного поля обратного адреса нет');
      }
      if ((await form.locator('button[type="submit"], button:not([type])').count()) === 0) {
        fail('у формы нет кнопки отправки');
      }
    },
  },
];

const site = await serveDist();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: MOBILE, javaScriptEnabled: false });
const page = await context.newPage();

const problems = [];
for (const check of CHECKS) {
  const fail = (why) => problems.push(`${check.name}: ${why}`);
  try {
    await check.run(page, site.origin, fail);
  } catch (error) {
    fail(`проверка сорвалась — ${error.message.split('\n')[0]}`);
  }
}

await browser.close();
await site.stop();

process.exit(report('работа без JavaScript', problems, CHECKS.length, 'сценариев'));
