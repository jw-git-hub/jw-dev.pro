/**
 * Разбор CSS для ворот: объявления с их селектором, переходы и потребители
 * пользовательских свойств.
 *
 * Полноценный парсер тут не нужен и вреден: у ворот один вопрос — какое
 * свойство объявлено под каким селектором. Сканер держит стек прелюдий,
 * поэтому селектор внутри `@media` доезжает до правила, а не теряется.
 */

export const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

export function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

/** Разбивает список по запятым верхнего уровня: `var(--e)` внутри не режется. */
export function splitTop(value) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of value) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** Зовёт `visit(текст объявления, стек прелюдий, позиция)` на каждое объявление. */
function eachDeclaration(css, visit) {
  const stack = [];
  let buffer = '';
  let start = 0;
  let depth = 0;

  const flush = (end) => {
    if (buffer.trim()) visit(buffer, stack, start);
    buffer = '';
    start = end;
  };

  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;

    if (depth === 0 && ch === '{') {
      stack.push(buffer.trim());
      buffer = '';
      start = i + 1;
    } else if (depth === 0 && ch === '}') {
      flush(i + 1);
      stack.pop();
    } else if (depth === 0 && ch === ';') {
      flush(i + 1);
    } else {
      if (!buffer.trim()) start = i;
      buffer += ch;
    }
  }
}

/** Ближайший селектор: прелюдия `@media` селектором не является. */
const selectorOf = (stack) => [...stack].reverse().find((s) => s && !s.startsWith('@')) ?? '';

const TIMING = new Set([
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'linear',
  'step-start',
  'step-end',
]);
const IDENT = /^(?:--[\w-]+|-?[a-z][\w-]*)$/i;

/**
 * Имя свойства в одном слагаемом `transition`. `null` — список не задан:
 * `transition: .4s var(--e)` означает `all`, то есть «интерполировать всё».
 */
function propOf(part) {
  const [first] = part
    .replace(/!important/i, '')
    .trim()
    .split(/\s+/);
  if (!first || !IDENT.test(first)) return null;
  if (TIMING.has(first.toLowerCase())) return null;
  return first.toLowerCase();
}

/** Каждое свойство из `transition`/`transition-property` со своим селектором. */
export function transitionDecls(css) {
  const clean = stripComments(css);
  const decls = [];

  eachDeclaration(clean, (text, stack, index) => {
    const match = /^\s*transition(?:-property)?\s*:\s*([\s\S]+)$/i.exec(text);
    if (!match) return;
    const selector = selectorOf(stack);
    const line = lineOf(clean, index);
    for (const part of splitTop(match[1])) {
      const prop = propOf(part);
      if (prop === 'none') continue;
      decls.push({ selector, prop, line, source: part });
    }
  });

  return decls;
}

/** `--dx` → свойства, которые собираются из него через `var()`. */
export function varConsumers(css) {
  const consumers = new Map();

  eachDeclaration(stripComments(css), (text) => {
    const match = /^\s*(-{0,2}[a-z][\w-]*)\s*:\s*([\s\S]+)$/i.exec(text);
    if (!match || match[1].startsWith('--')) return;
    for (const used of match[2].matchAll(/var\(\s*(--[\w-]+)/g)) {
      if (!consumers.has(used[1])) consumers.set(used[1], new Set());
      consumers.get(used[1]).add(match[1].toLowerCase());
    }
  });

  return consumers;
}

const SIMPLE = /^[a-z][\w-]*|[.#][\w-]+|\[[^\]]*\]|::?[\w-]+(?:\([^)]*\))?/gi;

const compounds = (selector) =>
  selector
    .trim()
    .split(/\s*[>+~]\s*|\s+/)
    .filter(Boolean);
const simples = (compound) => new Set(compound.match(SIMPLE) ?? []);

/** Правило покрывает цель, если несёт все её простые селекторы. */
function covers(ruleCompound, targetCompound) {
  const have = simples(ruleCompound);
  return [...simples(targetCompound)].every((s) => have.has(s));
}

/**
 * Правило действует на цель: составные части цели идут подпоследовательностью.
 * `.prail i` узнаётся в `.proc .prail i.on`, но не в `.pstep-i`.
 */
export function inScope(ruleSelector, target) {
  const want = compounds(target);
  return splitTop(ruleSelector).some((part) => {
    let matched = 0;
    for (const compound of compounds(part)) {
      if (matched < want.length && covers(compound, want[matched])) matched++;
    }
    return matched === want.length;
  });
}
