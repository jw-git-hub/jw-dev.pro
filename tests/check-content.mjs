/**
 * Схема контента: обязательные поля кейсов и статей.
 *
 * Наполняется в фазе 5 вместе с коллекциями. Пока коллекций нет,
 * проверка честно сообщает, что проверять нечего, и не притворяется
 * зелёной ради красивого лога.
 */
import { access } from 'node:fs/promises';
import { report } from './lib/report.mjs';

const CONTENT_DIR = 'src/content';

const hasContent = await access(CONTENT_DIR)
  .then(() => true)
  .catch(() => false);

if (!hasContent) {
  console.log('  контента ещё нет — проверка схемы включится в фазе 5');
  process.exit(0);
}

const problems = [];
// TODO(фаза 5): обязательные поля, ровно три метрики, длина title и summary,
// linkNote при link: null, alt на двух языках, пара RU↔EN для каждого документа.

process.exit(report('схема контента', problems, 0, 'документов'));
