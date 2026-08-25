/** Список адресов сайта, собранный из готовой сборки. */
import { relative, sep } from 'node:path';
import { filesWithExt } from './walk.mjs';

const DIST = 'dist';

/**
 * Адреса всех страниц в `dist`.
 *
 * Собираем из сборки, а не из списка в коде: список пришлось бы дописывать
 * руками при каждой новой странице, и однажды его забыли бы — проверка
 * молча перестала бы смотреть на новый раздел.
 */
export async function pageUrls() {
  const files = await filesWithExt(DIST, '.html');
  return files
    .map((file) => {
      const rel = relative(DIST, file).split(sep).join('/');
      if (rel === 'index.html') return '/';
      return rel.endsWith('/index.html') ? `/${rel.slice(0, -'index.html'.length)}` : `/${rel}`;
    })
    .sort();
}
