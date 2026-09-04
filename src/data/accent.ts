/**
 * Акценты палитры — DESIGN-GUIDE §2. Пять имён, и других не бывает:
 * произвольный цвет в разметке — это уже не дизайн-система.
 *
 * Имя одно на два места: `data-acc` секции
 * и пары `--acc`/`--acc2` в `src/styles/accent.css`.
 */
export const ACCENTS = ['cyan', 'indigo', 'violet', 'amber', 'rose'] as const;

export type Accent = (typeof ACCENTS)[number];
