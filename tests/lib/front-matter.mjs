/**
 * Чтение front-matter документов коллекции.
 *
 * Astro читает контент своим загрузчиком, а проверкам нужен тот же front-matter
 * до сборки и без запуска Astro. Один разбор на все проверки: если кейсы и журнал
 * начнут читать YAML каждый по-своему, они разойдутся в первой же кавычке.
 */
import { readdir, readFile } from 'node:fs/promises';
import { parse } from 'yaml';

/** Слаг живёт в адресе страницы: кириллица и пробелы там недопустимы. */
export const SLUG = /^[a-z0-9-]+$/;

/** Front-matter между первой и второй строкой «---». */
export function frontMatter(raw, where, problems) {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    problems.push(`${where}: нет front-matter между «---»`);
    return null;
  }
  try {
    return parse(match[1]);
  } catch (error) {
    problems.push(`${where}: YAML не разбирается — ${error.message.split('\n')[0]}`);
    return null;
  }
}

/** Все документы папки, ключ — слаг (он же имя файла). */
export async function readDocs(dir, label, problems) {
  const files = (await readdir(dir)).filter((name) => name.endsWith('.md'));
  const docs = new Map();
  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const data = frontMatter(
      await readFile(`${dir}/${file}`, 'utf8'),
      `${label}/${file}`,
      problems,
    );
    if (data) docs.set(slug, data);
  }
  return docs;
}
