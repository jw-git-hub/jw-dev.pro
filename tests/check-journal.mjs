/**
 * Контент журнала: то, что живёт между файлами и между языками.
 *
 * Длины и типы полей проверяет zod на сборке. Здесь — пара RU↔EN, формат слага,
 * дата не из будущего и теги, у которых есть перевод. Отдельно от `check-content`
 * намеренно: у кейса свои правила (снимки, метрики, порядок в сетке), и держать
 * два набора в одном файле значит однажды применить чужой.
 */
import { readFile } from 'node:fs/promises';
import { report } from './lib/report.mjs';
import { SLUG, readDocs } from './lib/front-matter.mjs';

const SOURCE = 'ru';
const TARGET = 'en';

/** Коллекции журнала и поля, которые обязан нести перевод. */
const COLLECTIONS = [
  { dir: 'src/content/notes', name: 'notes', translated: ['title', 'summary'] },
  { dir: 'src/content/updates', name: 'updates', translated: ['text'] },
];

/**
 * Поля, которых в английском документе быть не должно.
 *
 * Языконезависимое живёт только в русском источнике — второй копии даты
 * не существует, и разъезжаться нечему. Копия, которую zod молча выбросит,
 * опаснее ошибки: редактор правит её и не понимает, почему на сайте старое.
 */
const SOURCE_ONLY = ['date', 'tags'];

const ru = JSON.parse(await readFile('src/i18n/ru.json', 'utf8'));
const en = JSON.parse(await readFile('src/i18n/en.json', 'utf8'));

const problems = [];
let checked = 0;

/** Дата из будущего — это опечатка в годе или месяце: запись уже написана. */
function checkDate(value, where) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    problems.push(`${where}: дата «${value}» не разбирается`);
    return;
  }
  if (date.getTime() > Date.now()) problems.push(`${where}: дата ${value} из будущего`);
}

/** Тег подписывается строкой интерфейса: без пары он вылезет на сайт ключом. */
function checkTags(tags, where) {
  for (const tag of tags ?? []) {
    const key = `tag.${tag}`;
    if (!(key in ru)) problems.push(`${where}: тег «${tag}» без ключа «${key}» в ru.json`);
    if (!(key in en)) problems.push(`${where}: тег «${tag}» без ключа «${key}» в en.json`);
  }
}

for (const collection of COLLECTIONS) {
  const source = await readDocs(
    `${collection.dir}/${SOURCE}`,
    `${collection.name}/${SOURCE}`,
    problems,
  );
  const target = await readDocs(
    `${collection.dir}/${TARGET}`,
    `${collection.name}/${TARGET}`,
    problems,
  );
  checked += source.size + target.size;

  for (const [slug, data] of source) {
    const where = `${collection.name}/${SOURCE}/${slug}`;
    if (!SLUG.test(slug)) problems.push(`${where}: слаг из строчной латиницы, цифр и дефисов`);
    checkDate(data.date, where);
    checkTags(data.tags, where);

    const pair = target.get(slug);
    if (!pair) {
      problems.push(`${where}: нет английской пары ${collection.name}/${TARGET}/${slug}.md`);
      continue;
    }

    const there = `${collection.name}/${TARGET}/${slug}`;
    for (const field of collection.translated) {
      if (pair[field] === undefined) problems.push(`${there}: поле «${field}» не переведено`);
    }
    for (const field of SOURCE_ONLY) {
      if (pair[field] !== undefined) {
        problems.push(`${there}: поле «${field}» живёт только в русском документе`);
      }
    }
  }

  for (const slug of target.keys()) {
    if (!source.has(slug)) {
      problems.push(`${collection.name}/${TARGET}/${slug}: нет русского оригинала`);
    }
  }
}

process.exit(report('контент журнала', problems, checked, 'документов'));
