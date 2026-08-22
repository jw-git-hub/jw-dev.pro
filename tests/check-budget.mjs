/**
 * Бюджет веса.
 *
 * Сайт обещает быструю загрузку. Обещание должно проверяться на каждом
 * деплое, а не помниться. Считаем не только сумму, но и вес одной
 * страницы вместе со всем, что она тянет: посетитель качает именно её.
 */
import { readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { filesWithExt } from './lib/walk.mjs';
import { report } from './lib/report.mjs';

const DIST = 'dist';
const KB = 1024;

const BUDGET = {
  html: 100 * KB,
  cssTotal: 90 * KB,
  jsTotal: 90 * KB,
  page: 260 * KB,
};

const sizeOf = async (p) => (await stat(p)).size;
const fmt = (bytes) => `${(bytes / KB).toFixed(1)} КБ`;

const htmlFiles = await filesWithExt(DIST, '.html');
const cssFiles = await filesWithExt(DIST, '.css');
const jsFiles = await filesWithExt(DIST, '.js');
const fontFiles = await filesWithExt(DIST, '.woff2');

const problems = [];

let cssTotal = 0;
for (const f of cssFiles) cssTotal += await sizeOf(f);
let jsTotal = 0;
for (const f of jsFiles) jsTotal += await sizeOf(f);

/**
 * Шрифты лежат в public/, а не в _astro/, и по ссылкам из разметки их
 * не собрать: подмножество тянет CSS через unicode-range. Считаем всё,
 * что вообще может уехать к посетителю, и прибавляем к каждой странице.
 * Бюджет обязан быть пессимистом — иначе обещание про вес не обещание.
 */
let fontTotal = 0;
for (const f of fontFiles) fontTotal += await sizeOf(f);

if (cssTotal > BUDGET.cssTotal) {
  problems.push(`весь CSS — ${fmt(cssTotal)}, бюджет ${fmt(BUDGET.cssTotal)}`);
}
if (jsTotal > BUDGET.jsTotal) {
  problems.push(`весь JS — ${fmt(jsTotal)}, бюджет ${fmt(BUDGET.jsTotal)}`);
}

for (const file of htmlFiles) {
  const where = relative(DIST, file);
  const html = await readFile(file, 'utf8');
  const htmlSize = Buffer.byteLength(html);

  if (htmlSize > BUDGET.html) {
    problems.push(`${where} — HTML ${fmt(htmlSize)}, бюджет ${fmt(BUDGET.html)}`);
  }

  let pageSize = htmlSize + fontTotal;
  const re = /(?:href|src)\s*=\s*"(\/_astro\/[^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      pageSize += await sizeOf(join(DIST, m[1]));
    } catch {
      /* битую ссылку ловит check-links, здесь молчим */
    }
  }
  if (pageSize > BUDGET.page) {
    problems.push(`${where} — страница целиком ${fmt(pageSize)}, бюджет ${fmt(BUDGET.page)}`);
  }
}

if (problems.length === 0) {
  console.log(
    `  CSS ${fmt(cssTotal)} · JS ${fmt(jsTotal)} · шрифты ${fmt(fontTotal)} · страниц ${htmlFiles.length}`,
  );
}
process.exit(report('бюджет веса', problems, htmlFiles.length, 'страниц'));
