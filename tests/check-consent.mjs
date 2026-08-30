/**
 * Согласие на аналитику.
 *
 * Правило, которое нельзя проверить чтением кода: пока человек не ответил,
 * к счётчику не уходит ни одного запроса. Нарушить его можно случайно —
 * забытым импортом, порядком модулей, обработчиком, который выстрелит раньше
 * подписки. Красный CI здесь дешевле объяснений, почему сайт следил за теми,
 * кто отказался.
 *
 * Запросы к счётчику перехватываются и обрываются: ворота считают попытки,
 * а не ходят в сеть. Иначе прогон писал бы визиты в настоящую статистику
 * и падал бы вместе с чужим сервисом.
 */
import { chromium } from 'playwright';
import { serveDist } from './lib/serve.mjs';
import { report } from './lib/report.mjs';

const MOBILE = { width: 390, height: 844 };

/** Чуть больше простоя, после которого счётчик стартует сам (metrika.js). */
const PAST_IDLE = 4600;

const BANNER = '#consent';
const ACCEPT = '#consent-yes';
const DECLINE = '#consent-no';
const REOPEN = 'footer [data-consent]';

/**
 * Страница с чистым хранилищем и перехватом счётчика.
 *
 * `hits` наполняется попытками уйти к Метрике — их отсутствие и есть предмет
 * проверки. Контекст каждый раз новый: сохранённый ответ прошлого сценария
 * превратил бы следующий в тавтологию.
 */
async function openContext(browser, { javaScriptEnabled = true, doNotTrack = false } = {}) {
  const context = await browser.newContext({ viewport: MOBILE, javaScriptEnabled });

  if (doNotTrack) {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' });
    });
  }

  const hits = [];
  await context.route('**mc.yandex.ru/**', (route) => {
    hits.push(route.request().url());
    return route.abort();
  });

  return { context, page: await context.newPage(), hits };
}

/**
 * Дождаться, пока баннер уедет. Уходит он с переходом в полсекунды, и вопрос
 * «пропал ли» сразу после клика — это вопрос про кадр анимации, а не про ответ.
 */
async function waitGone(page) {
  try {
    await page.locator(BANNER).waitFor({ state: 'hidden', timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/** Первый экран плюс попытка расшевелить страницу: скролл — событие пробуждения. */
async function visit(page, origin) {
  await page.goto(`${origin}/ru/`);
  await page.mouse.wheel(0, 400);
}

const CHECKS = [
  {
    name: 'до ответа счётчик не грузится',
    async run({ page, hits }, origin, fail) {
      await visit(page, origin);

      if (!(await page.locator(BANNER).isVisible())) fail('баннер не показан');

      await page.waitForTimeout(PAST_IDLE);
      if (hits.length) fail(`к счётчику ушло запросов: ${hits.length}`);
    },
  },
  {
    name: '«Отклонить» держится и после перезагрузки',
    async run({ page, hits }, origin, fail) {
      await visit(page, origin);
      await page.locator(DECLINE).click();

      if (!(await waitGone(page))) fail('баннер остался после ответа');

      await visit(page, origin);
      if (await page.locator(BANNER).isVisible()) fail('баннер вернулся сам, без просьбы');

      await page.waitForTimeout(PAST_IDLE);
      if (hits.length) fail(`после отказа к счётчику ушло запросов: ${hits.length}`);
    },
  },
  {
    name: '«Принять» запускает счётчик и держится после перезагрузки',
    async run({ page, hits }, origin, fail) {
      await visit(page, origin);
      await page.locator(ACCEPT).click();

      if (!(await waitGone(page))) fail('баннер остался после ответа');

      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(PAST_IDLE);
      if (hits.length === 0) return fail('согласие дано, а счётчик так и не запросили');

      const before = hits.length;
      await visit(page, origin);
      if (await page.locator(BANNER).isVisible()) fail('баннер спросил во второй раз');

      await page.waitForTimeout(PAST_IDLE);
      if (hits.length === before) fail('на второй странице счётчик не запросили');
    },
  },
  {
    name: 'ссылка «Куки» в подвале возвращает вопрос',
    async run({ page }, origin, fail) {
      await visit(page, origin);
      await page.locator(ACCEPT).click();

      const link = page.locator(REOPEN).first();
      if ((await link.count()) === 0) return fail('в подвале нет ссылки «Куки»');

      await link.click();
      if (!(await page.locator(BANNER).isVisible())) fail('баннер не вернулся по ссылке');
    },
  },
  {
    name: '«не отслеживать» — ни счётчика, ни вопроса',
    options: { doNotTrack: true },
    async run({ page, hits }, origin, fail) {
      await visit(page, origin);

      if (await page.locator(BANNER).isVisible()) fail('баннер спрашивает вопреки настройке');

      await page.waitForTimeout(PAST_IDLE);
      if (hits.length) fail(`к счётчику ушло запросов: ${hits.length}`);
    },
  },
  {
    name: 'без JavaScript нет ни баннера, ни счётчика',
    options: { javaScriptEnabled: false },
    async run({ page, hits }, origin, fail) {
      await visit(page, origin);

      if (await page.locator(BANNER).isVisible()) fail('баннер виден при выключенном JS');
      if (hits.length) fail(`к счётчику ушло запросов: ${hits.length}`);
    },
  },
];

const site = await serveDist();
const browser = await chromium.launch();

const problems = [];
for (const check of CHECKS) {
  const fail = (why) => problems.push(`${check.name}: ${why}`);
  const session = await openContext(browser, check.options);
  try {
    await check.run(session, site.origin, fail);
  } catch (error) {
    fail(`проверка сорвалась — ${error.message.split('\n')[0]}`);
  }
  await session.context.close();
}

await browser.close();
await site.stop();

process.exit(report('согласие на аналитику', problems, CHECKS.length, 'сценариев'));
