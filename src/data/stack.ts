/**
 * Стек — план Ф7, DESIGN-GUIDE §12.
 *
 * Список закрытый и проверяемый: каждое имя стоит либо в поле `tech`
 * какого-то кейса, либо в сборке этого сайта. Технологии «для солидности»
 * здесь нет — на собеседовании по такому чипу спросят, и отвечать придётся.
 *
 * Группа `ai` — один чип, и это не недосмотр. Claude CLI стоит в двух кейсах,
 * больше ИИ в работе не участвует; дописать соседей значило бы придумать их.
 */
import type { Accent } from './accent';

export interface StackGroup {
  /** Код группы: он же `data-g` чипа и кнопки легенды. */
  id: string;
  /** Ключ подписи в src/i18n. */
  key: string;
  accent: Accent;
}

export interface Chip {
  name: string;
  group: string;
}

export const STACK_GROUPS: StackGroup[] = [
  { id: 'be', key: 'stack.be', accent: 'cyan' },
  { id: 'fe', key: 'stack.fe', accent: 'indigo' },
  { id: 'infra', key: 'stack.infra', accent: 'violet' },
  { id: 'qa', key: 'stack.qa', accent: 'amber' },
  { id: 'ai', key: 'stack.ai', accent: 'rose' },
];

/**
 * Порядок важен: кольцо раскладывает чипы по трём ярусам подряд, поэтому
 * группы идут вперемешку. Сложить их по группам значило бы получить кольцо,
 * у которого один бок целиком бирюзовый, а противоположный — жёлтый.
 */
export const CHIPS: Chip[] = [
  { name: 'Python', group: 'be' },
  { name: 'Astro', group: 'fe' },
  { name: 'Docker', group: 'infra' },
  { name: 'pytest', group: 'qa' },
  { name: 'aiogram 3', group: 'be' },
  { name: 'TypeScript', group: 'fe' },
  { name: 'Nginx', group: 'infra' },
  { name: 'ESLint', group: 'qa' },
  { name: 'Telethon', group: 'be' },
  { name: 'JavaScript', group: 'fe' },
  { name: 'GitHub Actions', group: 'infra' },
  { name: 'Stylelint', group: 'qa' },
  { name: 'SQLite', group: 'be' },
  { name: 'HTML', group: 'fe' },
  { name: 'GitHub Pages', group: 'infra' },
  { name: 'html-validate', group: 'qa' },
  { name: 'Jinja2', group: 'be' },
  { name: 'CSS', group: 'fe' },
  { name: 'cron', group: 'infra' },
  { name: 'Lighthouse', group: 'qa' },
  { name: 'yt-dlp', group: 'be' },
  { name: 'Claude CLI', group: 'ai' },
];

/** Цвет чипа берётся у его группы: второй копии цвета на чипе не существует. */
export function groupAccent(id: string): Accent {
  return STACK_GROUPS.find((group) => group.id === id)!.accent;
}
