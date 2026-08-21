/**
 * Полнота переводов.
 *
 * Русский — источник истины, английский переводится с него. Значит дыра
 * в EN — это невыполненная работа, а дыра в RU — опечатка в ключе.
 * И то и другое должно валить сборку, а не всплывать на живом сайте.
 */
import { readFile } from 'node:fs/promises';
import { report } from './lib/report.mjs';

const ru = JSON.parse(await readFile('src/i18n/ru.json', 'utf8'));
const en = JSON.parse(await readFile('src/i18n/en.json', 'utf8'));

const problems = [];

for (const key of Object.keys(ru)) {
  if (!(key in en)) problems.push(`«${key}» есть в ru.json, но не переведён в en.json`);
}
for (const key of Object.keys(en)) {
  if (!(key in ru)) problems.push(`«${key}» есть в en.json, но отсутствует в ru.json (источнике)`);
}
for (const [key, value] of Object.entries(ru)) {
  if (typeof value !== 'string' || value.trim() === '') problems.push(`«${key}» пуст в ru.json`);
}
for (const [key, value] of Object.entries(en)) {
  if (typeof value !== 'string' || value.trim() === '') problems.push(`«${key}» пуст в en.json`);
}

process.exit(report('полнота переводов', problems, Object.keys(ru).length, 'ключей'));
