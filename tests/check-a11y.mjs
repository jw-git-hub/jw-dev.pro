/**
 * Доступность: WCAG 2.2 AA на каждой странице сборки.
 *
 * Проверяем движком axe в настоящем браузере, а не разметку глазами: контраст,
 * имена у кнопок и ссылок, порядок заголовков и роли видны только после того,
 * как применились стили. Смотрим все страницы, а не выборку, — их тридцать.
 *
 * Чего эта проверка не заменяет: живого скринридера и прохода по клавиатуре
 * руками. Автомат ловит около половины нарушений — остальное в Ф11 закрывает
 * ручной обход, записанный в план.
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { serveDist } from './lib/serve.mjs';
import { pageUrls } from './lib/pages.mjs';
import { report } from './lib/report.mjs';

// Теги axe ровно под требование плана. `best-practice` намеренно не берём:
// это советы сверх стандарта, и падать из-за них ворота не должны.
const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

const MOBILE = { width: 390, height: 844 };

/** Нарушения axe на одной странице, уже готовые строкой для отчёта. */
async function violationsOn(page, origin, url) {
  await page.goto(origin + url, { waitUntil: 'load' });
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();

  return violations.map((v) => {
    const where = v.nodes[0]?.target?.join(' ') ?? '?';
    return `${url} — ${v.id} (${v.impact}): ${v.help}. Первый узел: ${where}`;
  });
}

const urls = await pageUrls();
const site = await serveDist();
const browser = await chromium.launch();
// axe требует страницу из явного контекста, из browser.newPage() он её не берёт.
const context = await browser.newContext({ viewport: MOBILE });
const page = await context.newPage();

const problems = [];
for (const url of urls) {
  problems.push(...(await violationsOn(page, site.origin, url)));
}

await browser.close();
await site.stop();

process.exit(report('доступность WCAG 2.2 AA', problems, urls.length, 'страниц'));
