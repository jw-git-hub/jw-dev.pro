/**
 * Фоновый граф — DESIGN-GUIDE §9.
 *
 * Живая сеть во весь экран: узлы дрейфуют, ближние соединяются, по рёбрам
 * бегут искры, а элементы интерфейса с `data-nx` висят в этой сети
 * на собственных нитях. Порядок отрисовки — снизу вверх: рёбра, нити
 * якорей, узлы, искры, и последними дыры под текстом.
 *
 * Один requestAnimationFrame на всю страницу. Граф не параллаксится:
 * его нити привязаны к настоящим элементам и обязаны попадать в них точно.
 *
 * Геометрия якорей и дыр пересчитывается раз в 560 мс, а не каждый кадр.
 * getBoundingClientRect заставляет браузер пересчитать layout, и делать это
 * шестьдесят раз в секунду ради блоков, которые стоят на месте, — самый
 * дорогой способ ничего не изменить.
 */
import { reducedMotion } from './lib/motion.js';
import { TINTS } from './graph/paint.js';
import { buildNodes, stepNodes, drawEdges, drawNodes, edgeLimit } from './graph/field.js';
import * as anchors from './graph/anchors.js';
import * as pulses from './graph/pulses.js';
import * as damp from './graph/damp.js';

/**
 * Один пиксель растра на пиксель CSS, без ретины. Канвас растянут во весь
 * экран, и удвоение плотности учетверяет число пикселей, которые нужно
 * очистить и залить каждый кадр: на 1440×900 это разница между 17 и 67 мс
 * на кадр, то есть между шестьюдесятью кадрами в секунду и пятнадцатью.
 * Сеть — это линии в один пиксель под непрозрачностью .66 (backdrop.css);
 * чёткости, за которую платят вчетверо, на них не видно.
 */
const MAX_DPR = 1;

const MEASURE_EVERY = 560; // мс
/** На узком экране двигать якоря нечему: сцена плоская, параллакса нет. */
const MEASURE_EVERY_NARROW = 1120;
const DRAW_EVERY_NARROW = 1000 / 30;
const RESIZE_DELAY = 180;
const TINT_EASE = 0.035; // доля пути к цвету секции за кадр
const DEFAULT_TINT = 'cyan';

const narrow = window.matchMedia('(max-width: 900px)');

const canvas = document.getElementById('graph');
const ctx = canvas ? canvas.getContext('2d', { alpha: true }) : null;

let width = 0;
let height = 0;
let limit = 0;
let nodes = [];
let anchorElements = [];
let anchorPoints = [];
let dampElements = [];
let dampHoles = [];
let frameId = 0;
let staticId = 0;
let lastSpawn = 0;
let lastMeasure = 0;
let lastDraw = 0;
let resizeTimer = 0;

const sparks = [];
const pointer = { x: 0, y: 0, on: false };

/** Стартовый цвет — акцент страницы: на внутренних он не cyan. */
const startTint = TINTS[document.documentElement.dataset.acc] ?? TINTS[DEFAULT_TINT];
const tintNow = [...startTint];
let tintTarget = [...startTint];

/** Список привязанных элементов меняется только при перестройке DOM. */
function collect() {
  anchorElements = anchors.collect();
  dampElements = damp.collect();
  measure();
}

function measure() {
  anchorPoints = anchors.measure(anchorElements, window.scrollY);
  dampHoles = damp.measure(dampElements, window.scrollY);
}

/**
 * Размер канваса в CSS-пикселях задаёт разметка (position: fixed; inset: 0),
 * здесь настраивается только растр под плотность экрана.
 */
function resizeRaster() {
  const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** Поле строится заново: и число узлов, и радиус связи считаются от ширины. */
function rebuildField() {
  limit = edgeLimit(width);
  nodes = buildNodes(width, height);
  sparks.length = 0;
}

/** Цвет рёбер догоняет акцент секции, а не прыгает вместе с ним. */
function easeTint() {
  for (let i = 0; i < tintNow.length; i++) {
    tintNow[i] += (tintTarget[i] - tintNow[i]) * TINT_EASE;
  }
  return tintNow.map((channel) => Math.round(channel));
}

function draw(time) {
  const scrollY = window.scrollY;

  ctx.clearRect(0, 0, width, height);
  drawEdges(ctx, nodes, { limit, tint: easeTint(), pointer });
  anchors.draw(ctx, anchorPoints, { nodes, scrollY, height });
  drawNodes(ctx, nodes, { time, pointer });
  pulses.draw(ctx, sparks, nodes);
  damp.draw(ctx, dampHoles, { scrollY, height });
}

/**
 * На узком экране сеть рисуется тридцать раз в секунду вместо шестидесяти.
 * Узел проходит за кадр 0,13 px, между отрисовками выйдет 0,26 — на слое
 * с непрозрачностью .66 такой шаг не читается. А каждая перерисовка канваса
 * во весь экран тянет за собой всё, что лежит поверх него, поэтому она
 * и есть самая дорогая строка кадра.
 *
 * Движение узлов и искр при этом идёт покадрово: тридцать восемь сложений
 * стоят несравнимо меньше, чем один проход по холсту.
 */
function drawDue(time) {
  if (!narrow.matches) return true;
  if (time - lastDraw < DRAW_EVERY_NARROW) return false;

  lastDraw = time;
  return true;
}

function frame(time) {
  stepNodes(nodes, width, height);
  pulses.step(sparks, nodes, limit);

  if (time - lastSpawn > pulses.SPAWN_EVERY) {
    lastSpawn = time;
    pulses.spawn(sparks, nodes, limit);
  }

  const measureEvery = narrow.matches ? MEASURE_EVERY_NARROW : MEASURE_EVERY;
  if (time - lastMeasure > measureEvery) {
    lastMeasure = time;
    measure();
  }

  if (drawDue(time)) draw(time);
  frameId = requestAnimationFrame(frame);
}

function start() {
  if (frameId || document.hidden || reducedMotion.matches) return;
  frameId = requestAnimationFrame(frame);
}

function stop() {
  if (!frameId) return;
  cancelAnimationFrame(frameId);
  frameId = 0;
}

/**
 * Сеть без движения. Просьба «меньше движения» — это просьба про движение,
 * а не про сеть: гайд §5 требует, чтобы под стеклом была видимая структура,
 * и нити якорей — единственное, что привязывает карточки к фону.
 *
 * Рисуется тот же кадр, что и в цикле, но один раз и без искр: они живут
 * только пока их двигают. Время нулевое — мерцание узлов тоже завязано на нём.
 */
function staticFrame() {
  const scrollY = window.scrollY;

  ctx.clearRect(0, 0, width, height);
  drawEdges(ctx, nodes, { limit, tint: tintNow.map(Math.round), pointer });
  anchors.draw(ctx, anchorPoints, { nodes, scrollY, height });
  drawNodes(ctx, nodes, { time: 0, pointer });
  damp.draw(ctx, dampHoles, { scrollY, height });
}

/**
 * Перерисовать статичный кадр, но не чаще кадра экрана.
 *
 * Канвас фиксирован, а якоря привязаны к элементам, которые уезжают при
 * прокрутке: без этого нити оставались бы там, где карточка была на момент
 * загрузки. Это не анимация — это то же самое, что видит любой fixed-слой.
 */
function requestStatic() {
  if (staticId) return;
  staticId = requestAnimationFrame(() => {
    staticId = 0;
    measure();
    staticFrame();
  });
}

/** Цикл или один статичный кадр — смотря о чём просил посетитель. */
function restart() {
  stop();

  if (reducedMotion.matches) {
    staticFrame();
    return;
  }

  start();
}

/** Первая настройка: растр под плотность экрана, поле, геометрия якорей. */
function sync() {
  resizeRaster();
  rebuildField();
  collect();
  restart();
}

/**
 * Экран изменился. Поле перестраивается только при смене ширины: от неё
 * считаются и число узлов, и радиус связи (field.js), а высота на них
 * не влияет. Мобильный браузер шлёт resize на каждое прятанье адресной
 * строки, то есть посреди прокрутки, — и перестройка по высоте рассыпала бы
 * сеть заново прямо под пальцем.
 */
function onResize() {
  const widthChanged = canvas.clientWidth !== width;
  const heightChanged = canvas.clientHeight !== height;
  if (!widthChanged && !heightChanged) return;

  resizeRaster();
  if (widthChanged) rebuildField();
  collect();
  restart();
}

function listen() {
  // §9 описывает подсветку как курсорную. Палец курсором не является:
  // pointerleave на тач-экране не приходит вовсе, поэтому один тап включал бы
  // подсветку до конца сессии — и кадр за кадром считал бы расстояние
  // от каждого узла и каждого ребра до точки, где посетитель однажды коснулся.
  window.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse') return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.on = true;
    },
    { passive: true },
  );

  for (const away of ['pointerleave', 'pointerup', 'pointercancel']) {
    window.addEventListener(away, () => (pointer.on = false), { passive: true });
  }

  window.addEventListener(
    'resize',
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(onResize, RESIZE_DELAY);
    },
    { passive: true },
  );

  // В обычном режиме положение якорей догоняет цикл, в статичном — некому.
  window.addEventListener(
    'scroll',
    () => {
      if (reducedMotion.matches) requestStatic();
    },
    { passive: true },
  );

  // Вкладку только приостанавливаем: перестраивать поле незачем, экран тот же.
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  reducedMotion.addEventListener('change', restart);
}

/** Перекрасить сеть в акцент секции. Имена цветов — те же, что у `data-acc`. */
export function setTint(name) {
  if (!TINTS[name]) return;
  tintTarget = [...TINTS[name]];

  // Плавно догонять цель некому: цикл не запущен. Ставим цвет сразу.
  if (reducedMotion.matches) {
    tintNow.splice(0, tintNow.length, ...tintTarget);
    requestStatic();
  }
}

if (ctx) {
  listen();
  sync();
}
