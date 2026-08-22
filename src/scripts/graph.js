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

/** Выше двух ретина уже не различает, а площадь канваса растёт квадратом. */
const MAX_DPR = 2;

const MEASURE_EVERY = 560; // мс
const RESIZE_DELAY = 180;
const TINT_EASE = 0.035; // доля пути к цвету секции за кадр
const DEFAULT_TINT = 'cyan';

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
function resize() {
  const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  limit = edgeLimit(width);
  nodes = buildNodes(width, height);
  sparks.length = 0;
  collect();
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

function frame(time) {
  stepNodes(nodes, width, height);
  pulses.step(sparks, nodes, limit);

  if (time - lastSpawn > pulses.SPAWN_EVERY) {
    lastSpawn = time;
    pulses.spawn(sparks, nodes, limit);
  }

  if (time - lastMeasure > MEASURE_EVERY) {
    lastMeasure = time;
    measure();
  }

  draw(time);
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

/** Условия рисования изменились: перестроить поле под новый экран и продолжить. */
function sync() {
  stop();
  resize();

  if (reducedMotion.matches) {
    staticFrame();
    return;
  }

  start();
}

function listen() {
  window.addEventListener(
    'pointermove',
    (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.on = true;
    },
    { passive: true },
  );

  window.addEventListener(
    'pointerleave',
    () => {
      pointer.on = false;
    },
    { passive: true },
  );

  window.addEventListener(
    'resize',
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(sync, RESIZE_DELAY);
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
  reducedMotion.addEventListener('change', sync);
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
