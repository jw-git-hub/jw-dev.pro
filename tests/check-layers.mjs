/**
 * Статические бюджеты слоёв. Три вещи в CSS стоят кадру дорого, но выглядят
 * в коде как одна безобидная строка, и ни одни ворота их не видят:
 * `check:budget` взвешивает байты, `check:runtime` меряет главную под прокруткой
 * и до кейса или статьи не доезжает.
 *
 * Три правила:
 *   1. Режимы смешивания. Несепарабельные (`hue`, `saturation`, `color`,
 *      `luminosity`) запрещены: браузер ради них раскладывает цвет всей подложки
 *      под слоем, а не смешивает каналы по одному. Плюс потолок на число
 *      объявлений — храповик, чтобы слои не заводились сами собой.
 *   2. `will-change` стоит только там, где что-то действительно движется:
 *      скрипт пишет элемент каждый кадр или на нём висит бесконечная анимация.
 *      Иначе это слой композитора, который держит память вечно и не показывает
 *      ничего.
 *   3. `@keyframes` анимирует только дешёвое: `transform`, `opacity`, `filter`,
 *      `background-position`. Прочее считает раскладку или красит заново
 *      шестьдесят раз в секунду.
 *
 * Замысел плана был «парный сброс для каждого `will-change`». Он не работает:
 * у пятен фона и дрейфа окон анимация бесконечная, сбрасывать нечего — правило
 * пришлось бы глушить исключениями. Проверяется причина, а не сброс.
 */
import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { filesWithExt } from './lib/walk.mjs';
import { report } from './lib/report.mjs';
import { propDecls, keyframeBlocks, inScope } from './lib/css.mjs';
import { FRAME_TARGETS } from './check-frames.mjs';

const STYLES = 'src/styles';

const BLEND_PROPS = ['mix-blend-mode', 'background-blend-mode'];

/** Режимы, которые смешивают не канал с каналом, а цвет с цветом. */
const NON_SEPARABLE = new Set(['hue', 'saturation', 'color', 'luminosity']);

/**
 * Потолок — сегодняшнее число объявлений, а не идеал: пятно света, зерно
 * страницы, зерно стекла, зерно шапки и подложка скриншота. Опускается вместе
 * с уборкой слоёв, поднимается только осознанно.
 */
const BLEND_CEILING = 5;

/**
 * Несепарабельный режим, оставленный сознательно, — с причиной.
 *
 * Подложка скриншота красит кадр в акцент кейса. Замерено 28.08.2026: цена нулевая
 * и на главной, и на странице кейса, и на резком флике — кадр совпадает до десятой
 * с прогоном, где слой выключен вовсе. Правило остаётся: оно про новые слои,
 * а этот измерен.
 */
const BLEND_REASONS = {
  '.shot-tint': 'акцент кейса на скриншоте; замер 28.08.2026 — разницы в кадре нет',
};

/** Свойства, которые композитор отдаёт без пересчёта раскладки и перекраски. */
const CHEAP = new Set(['transform', 'opacity', 'filter', 'background-position']);

/** Кадр с дорогим свойством, оставленный сознательно, — с причиной. */
const KEYFRAME_REASONS = {};

/**
 * `will-change` без покадрового скрипта — с причиной. Бесконечная анимация стоит
 * не на самом классе, а на его вариантах (`.b1`…`.b5`, `.drift1`…`.drift3`):
 * разбором их не связать, поэтому запись, а не вывод.
 */
const WILL_CHANGE_REASONS = {
  '.blob': 'дрейф пятен фона: бесконечные drift-1…5 на .b1…b5',
  '.win-drift': 'дрейф окон сцены: бесконечные drift-a…c на .drift1…3',
};

/** Каждое объявление названных свойств по всем файлам, с именем файла. */
const declsOf = (sources, props) =>
  sources.flatMap(({ css, where }) =>
    props.flatMap((prop) => propDecls(css, prop).map((decl) => ({ ...decl, where }))),
  );

/** Каждый блок `@keyframes` по всем файлам, с именем файла. */
const blocksOf = (sources) =>
  sources.flatMap(({ css, where }) => keyframeBlocks(css).map((block) => ({ ...block, where })));

const at = (item) => `${item.where}:${item.line}`;

/** Причина, которая никого не описывает, хуже отсутствующей: она врёт про код. */
const staleReasons = (reasons, described, what) =>
  Object.keys(reasons)
    .filter((key) => !described.has(key))
    .map((key) => `${what}: «${key}» в стилях больше нет — снять запись`);

/** Правило 1: несепарабельные режимы смешивания. */
export function nonSeparable(decls, reasons) {
  const described = new Set();
  const problems = [];

  for (const decl of decls) {
    if (!NON_SEPARABLE.has(decl.value)) continue;
    if (reasons[decl.selector]) {
      described.add(decl.selector);
      continue;
    }
    problems.push(
      `${at(decl)} — режим ${decl.value} у ${decl.selector}: ` +
        'несепарабельный режим пересчитывает цвет всей подложки под слоем',
    );
  }

  return [...problems, ...staleReasons(reasons, described, 'BLEND_REASONS')];
}

/** Правило 1, вторая половина: потолок на число слоёв со смешиванием. */
export function overCeiling(decls, ceiling) {
  if (decls.length <= ceiling) return [];
  return [
    `режимов смешивания ${decls.length} при потолке ${ceiling} — ` +
      'снять лишний слой или поднять потолок осознанно',
  ];
}

/** Правило 2: `will-change` там, где ничего не движется. */
export function unjustified(decls, frameTargets, reasons) {
  const underScript = (selector) =>
    Object.values(frameTargets).some((targets) =>
      targets.some((target) => inScope(selector, target)),
    );
  const described = new Set();
  const problems = [];

  for (const decl of decls) {
    if (decl.value === 'auto') continue;
    const script = underScript(decl.selector);
    const reason = Boolean(reasons[decl.selector]);

    if (reason) described.add(decl.selector);
    if (script && reason) {
      problems.push(
        `WILL_CHANGE_REASONS: «${decl.selector}» и так под покадровым скриптом — лишняя запись`,
      );
      continue;
    }
    if (script || reason) continue;

    problems.push(
      `${at(decl)} — will-change у ${decl.selector}: ` +
        'ни скрипт его не пишет, ни бесконечной анимации на нём нет — слой держится зря',
    );
  }

  return [...problems, ...staleReasons(reasons, described, 'WILL_CHANGE_REASONS')];
}

/** Правило 3: дорогое свойство внутри `@keyframes`. */
export function costlyKeyframes(blocks, reasons) {
  const described = new Set();
  const problems = [];

  for (const block of blocks) {
    const costly = [...block.props].filter((prop) => !CHEAP.has(prop));
    if (!costly.length) continue;
    if (reasons[block.name]) {
      described.add(block.name);
      continue;
    }
    problems.push(
      `${at(block)} — @keyframes ${block.name} анимирует ${costly.join(', ')}: ` +
        'кадру это стоит раскладки или перекраски',
    );
  }

  return [...problems, ...staleReasons(reasons, described, 'KEYFRAME_REASONS')];
}

async function readSources() {
  const files = await filesWithExt(STYLES, '.css');
  const sources = [];
  for (const file of files) {
    sources.push({ css: await readFile(file, 'utf8'), where: relative(STYLES, file) });
  }
  return sources;
}

async function run() {
  const sources = await readSources();
  const blend = declsOf(sources, BLEND_PROPS);
  const problems = [
    ...nonSeparable(blend, BLEND_REASONS),
    ...overCeiling(blend, BLEND_CEILING),
    ...unjustified(declsOf(sources, ['will-change']), FRAME_TARGETS, WILL_CHANGE_REASONS),
    ...costlyKeyframes(blocksOf(sources), KEYFRAME_REASONS),
  ];

  return report('бюджеты слоёв', problems, sources.length, 'файлов стилей');
}

export { declsOf, blocksOf, BLEND_PROPS };

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) process.exit(await run());
