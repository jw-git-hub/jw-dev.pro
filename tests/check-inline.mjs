/**
 * Запрет инлайна в отданном HTML — главное техническое правило проекта.
 *
 * Без него нельзя включить строгий CSP без unsafe-inline, а стили и скрипты
 * перестают кешироваться отдельно от разметки.
 *
 * Единственное разрешённое исключение — <script type="application/ld+json">:
 * это блок данных для поисковых систем, браузер его не исполняет, и CSP
 * его не блокирует.
 */
import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { filesWithExt } from './lib/walk.mjs';
import { report } from './lib/report.mjs';

const DIST = 'dist';

const RULES = [
  {
    name: 'атрибут style=',
    re: /\sstyle\s*=\s*["']/gi,
    hint: 'вынеси в класс-модификатор',
  },
  {
    name: 'тег <style>',
    re: /<style[\s>]/gi,
    hint: 'стили должны быть внешним файлом',
  },
  {
    name: 'обработчик on*=',
    re: /\son(?:click|load|error|change|submit|input|focus|blur|mouse[a-z]+|key[a-z]+)\s*=\s*["']/gi,
    hint: 'вешай слушатель из модуля',
  },
];

/** Ищет <script> без src, пропуская блоки данных вроде JSON-LD. */
function findInlineScripts(html) {
  const hits = [];
  const re = /<script\b([^>]*)>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1];
    if (/\bsrc\s*=/i.test(attrs)) continue;
    if (/type\s*=\s*["']application\/ld\+json["']/i.test(attrs)) continue;
    hits.push({ index: m.index, text: m[0] });
  }
  return hits;
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

const files = await filesWithExt(DIST, '.html');
const problems = [];

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const where = relative(DIST, file);

  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(html)) !== null) {
      problems.push(`${where}:${lineOf(html, m.index)} — ${rule.name} (${rule.hint})`);
    }
  }

  for (const hit of findInlineScripts(html)) {
    problems.push(`${where}:${lineOf(html, hit.index)} — инлайн <script> (вынеси в модуль с src)`);
  }
}

if (files.length === 0) {
  console.error('✗ инлайн — в dist нет ни одного HTML. Сначала `npm run build`.');
  process.exit(1);
}

process.exit(report('ноль инлайна в HTML', problems, files.length, 'страниц'));
