/**
 * Эффект, спорящий сам с собой. Переход не сглаживает свойство, которое
 * скрипт переписывает каждый кадр, — он перезапускается шестьдесят раз
 * в секунду и жжёт бюджет кадра, ничего при этом не показывая.
 *
 * Ревизия 26.08.2026 нашла три таких места руками: кольцо дока, точку рельсы
 * процесса и размытие шапки. Ни одни существующие ворота их не видят:
 * `check:budget` взвешивает байты, `check:lighthouse` меряет окно загрузки
 * и не прокручивает.
 *
 * Два правила:
 *   1. `transition` обязан называть свойства. Без списка это `all` —
 *      разрешение интерполировать всё, включая покадровое и дорогое.
 *   2. Ни один переход не стоит на свойстве, которое скрипт пишет каждый кадр.
 */
import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { filesWithExt } from './lib/walk.mjs';
import { report } from './lib/report.mjs';
import { transitionDecls, varConsumers, inScope } from './lib/css.mjs';

const SCRIPTS = 'src/scripts';
const STYLES = 'src/styles';

/**
 * Элементы, которым скрипты пишут инлайн-стиль каждый кадр, — в селекторах CSS.
 *
 * Карта нужна потому, что скрипт и стили адресуют один элемент по-разному:
 * `dock.js` берёт кольцо как `#dock-arc`, а `dock.css` красит его как
 * `.dock-p .fg`. Связать их по имени файла нельзя — в `process.css` рядом
 * с покадровой точкой рельсы законно живёт переход `transform` на карточке шага.
 *
 * `.plane` стоит вместе с `#aurora`: аврора — один из двух слоёв этого класса,
 * и переход, поставленный на класс, достанется и ей.
 */
export const FRAME_TARGETS = {
  'dock.js': ['#dock-arc', '.dock-p .fg'],
  'parallax.js': ['.stage-in', '.win', '.hud', '.caustic'],
  'pointer.js': ['#light', '#aurora', '.plane'],
  'process.js': ['[data-pr-line]', '.prpath2', '[data-pr-dot]', '.prail i'],
  'ring.js': ['.chip3'],
};

const kebab = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** Свойства, которые скрипт пишет в инлайн-стиль: `setProperty` и `style.имя =`. */
export function frameProps(js) {
  const props = new Set();
  for (const call of js.matchAll(/\.style\.setProperty\(\s*['"]([^'"]+)['"]/g)) props.add(call[1]);
  for (const write of js.matchAll(/\.style\.([A-Za-z][A-Za-z0-9]*)\s*=[^=]/g))
    props.add(kebab(write[1]));
  return props;
}

/** Переходы, которые стоят на покадровом свойстве нужного элемента. */
export function conflicts({ targets, props, decls }) {
  return decls.filter(
    (decl) =>
      decl.prop !== null &&
      decl.prop !== 'all' &&
      props.has(decl.prop) &&
      targets.some((target) => inScope(decl.selector, target)),
  );
}

/** `--dx` пишется покадрово — значит и `transform`, который из него собран. */
function expand(props, consumers) {
  const all = new Set(props);
  for (const prop of props) for (const consumer of consumers.get(prop) ?? []) all.add(consumer);
  return all;
}

async function collectScripts() {
  const files = await filesWithExt(SCRIPTS, '.js');
  const writers = new Map();
  for (const file of files) {
    const props = frameProps(await readFile(file, 'utf8'));
    if (props.size) writers.set(relative(SCRIPTS, file), props);
  }
  return writers;
}

async function collectStyles() {
  const files = await filesWithExt(STYLES, '.css');
  const decls = [];
  const consumers = new Map();
  for (const file of files) {
    const css = await readFile(file, 'utf8');
    const where = relative(STYLES, file);
    for (const decl of transitionDecls(css)) decls.push({ ...decl, where });
    for (const [name, props] of varConsumers(css)) {
      if (!consumers.has(name)) consumers.set(name, new Set());
      for (const prop of props) consumers.get(name).add(prop);
    }
  }
  return { files, decls, consumers };
}

/** Правило 1: `transition: .4s var(--e)` — это `all`. */
const nameless = (decls) =>
  decls
    .filter((decl) => decl.prop === null || decl.prop === 'all')
    .map(
      (decl) =>
        `${decl.where}:${decl.line} — «${decl.source}» у ${decl.selector || '?'}: ` +
        'transition без списка свойств означает all',
    );

/** Правило 2 плюс присмотр за самой картой: устареть молча она не должна. */
function frameConflicts(writers, decls, consumers) {
  const problems = [];

  for (const name of Object.keys(FRAME_TARGETS)) {
    if (!writers.has(name))
      problems.push(`FRAME_TARGETS: ${name} больше не пишет стиль — снять запись`);
  }

  for (const [name, props] of writers) {
    const targets = FRAME_TARGETS[name];
    if (!targets) {
      problems.push(`FRAME_TARGETS: ${name} пишет ${[...props].join(', ')} — назвать его элементы`);
      continue;
    }
    for (const hit of conflicts({ targets, props: expand(props, consumers), decls })) {
      problems.push(
        `${hit.where}:${hit.line} — переход ${hit.prop} у ${hit.selector}: ${name} пишет это свойство каждый кадр`,
      );
    }
  }

  return problems;
}

async function run() {
  const writers = await collectScripts();
  const { files, decls, consumers } = await collectStyles();
  const problems = [...nameless(decls), ...frameConflicts(writers, decls, consumers)];
  return report('покадровые свойства и переходы', problems, files.length, 'файлов стилей');
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) process.exit(await run());
