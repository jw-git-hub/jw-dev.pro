/**
 * Числа дизайн-системы. Гайд — источник истины, но пока его значения живут
 * только в голове, они разъезжаются: появляется седьмой брейкпоинт,
 * blur(24px) «чтобы красивее», свой easing в одном компоненте.
 *
 * Проверяем ровно то, что расхождение делает заметным не сразу:
 * брейкпоинты, easing, радиус блюра и палитру.
 */
import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { filesWithExt } from './lib/walk.mjs';
import { report } from './lib/report.mjs';

const STYLES = 'src/styles';
const TOKENS = 'src/styles/tokens.css';

/** DESIGN-GUIDE §17. */
const BREAKPOINTS = [1180, 1020, 900, 680, 640, 420];

/** DESIGN-GUIDE §5: шапка и `.stuck`/`.blur`. Других значений в проекте нет. */
const BLUR_RADII = ['11px', '14px'];

/** DESIGN-GUIDE §1: в разметке и компонентах — только через var(). */
const PALETTE = [
  '#070912',
  '#05060d',
  '#0d1120',
  '#0a0e1b',
  '#f0f4fa',
  '#4f46e5',
  '#22d3ee',
  '#a855f7',
  '#ffb020',
  '#ff4d9e',
  '#34d399',
  '#94a3b8',
  '#05070e',
];

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

/** Собирает нарушения одного правила: регулярка + решение, что считать ошибкой. */
function scan(css, where, re, judge) {
  const problems = [];
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(css)) !== null) {
    const message = judge(m);
    if (message) problems.push(`${where}:${lineOf(css, m.index)} — ${message}`);
  }
  return problems;
}

const files = await filesWithExt(STYLES, '.css');
const problems = [];

for (const file of files) {
  const where = relative(STYLES, file);
  const css = stripComments(await readFile(file, 'utf8'));

  problems.push(
    ...scan(css, where, /\(\s*(?:max|min)-width:\s*(\d+)px/gi, (m) =>
      BREAKPOINTS.includes(Number(m[1]))
        ? null
        : `брейкпоинт ${m[1]}px вне набора гайда (${BREAKPOINTS.join(', ')})`,
    ),
  );

  problems.push(
    ...scan(css, where, /backdrop-filter:[^;]*?blur\(([^)]+)\)/gi, (m) =>
      BLUR_RADII.includes(m[1].trim())
        ? null
        : `blur(${m[1].trim()}) в backdrop-filter: разрешены только ${BLUR_RADII.join(' и ')}`,
    ),
  );

  if (file !== TOKENS) {
    problems.push(
      ...scan(
        css,
        where,
        /cubic-bezier\([^)]*\)/gi,
        () => 'свой easing: в проекте один — var(--e)',
      ),
    );

    problems.push(
      ...scan(css, where, /#[0-9a-f]{6}\b/gi, (m) =>
        PALETTE.includes(m[0].toLowerCase())
          ? `цвет палитры ${m[0]} литералом: подставь токен из tokens.css`
          : null,
      ),
    );
  }
}

process.exit(report('числа дизайн-системы', problems, files.length, 'файлов стилей'));
