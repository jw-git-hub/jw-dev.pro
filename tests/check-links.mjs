/**
 * Битые внутренние ссылки.
 *
 * Сайт собирается в каталоги (`/work/slug/` → `work/slug/index.html`),
 * поэтому проверяем именно так, как это увидит Nginx.
 * Внешние адреса и mailto/tel не трогаем — их живость не наше дело.
 */
import { readFile, access } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { filesWithExt } from './lib/walk.mjs';
import { report } from './lib/report.mjs';

const DIST = 'dist';

const exists = async (p) =>
  access(p)
    .then(() => true)
    .catch(() => false);

/** Путь из адреса → файл, который реально отдаст сервер. */
async function resolves(pathname) {
  const clean = decodeURIComponent(pathname.split(/[?#]/)[0]);
  const asFile = join(DIST, clean);
  if (await exists(asFile)) return true;
  return exists(join(DIST, clean, 'index.html'));
}

const files = await filesWithExt(DIST, '.html');
const problems = [];
let checked = 0;

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const where = relative(DIST, file);
  const re = /(?:href|src)\s*=\s*"([^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const value = m[1];
    if (/^(https?:|mailto:|tel:|data:|#|\/\/)/i.test(value)) continue;
    if (!value.startsWith('/')) continue;
    checked += 1;
    if (!(await resolves(value))) problems.push(`${where} → ${value} никуда не ведёт`);
  }
}

process.exit(report('внутренние ссылки', problems, checked, 'ссылок'));
