/**
 * Фон — DESIGN-GUIDE §9. Плоская разводка платы во весь экран: серые дорожки
 * под 90° и 45°, площадки на концах, и по дорожкам бегут импульсы акцентом
 * текущей секции.
 *
 * Устройство слоя, ради которого он и переписан: разводка статична и рисуется
 * один раз в закадровый холст, а каждый кадр только копируется одним
 * drawImage. Двигается и красится один десяток пикселей импульсов. Прежняя
 * сеть пересобиралась покадрово — восемьдесят восемь узлов, все их попарные
 * расстояния и нити к элементам интерфейса.
 *
 * Порядок отрисовки — снизу вверх: разводка, импульсы, и последними дыры
 * под текстом. Один requestAnimationFrame на всю страницу.
 */
import { reducedMotion } from './lib/motion.js';
import { TINTS } from './graph/paint.js';
import { buildTraces, paintTraces } from './graph/traces.js';
import * as pulses from './graph/pulses.js';
import * as damp from './graph/damp.js';

/**
 * Один пиксель растра на пиксель CSS, без ретины. Канвас растянут во весь
 * экран, и удвоение плотности учетверяет число пикселей. Дорожки — линии
 * в один пиксель под непрозрачностью .66 (backdrop.css); чёткости,
 * за которую платят вчетверо, на них не видно.
 */
const MAX_DPR = 1;

const MEASURE_EVERY = 560; // мс
/** На узком экране блоки те же и стоят так же — мерить их вдвое реже. */
const MEASURE_EVERY_NARROW = 1120;
const DRAW_EVERY_NARROW = 1000 / 30;
const RESIZE_DELAY = 180;
const TINT_EASE = 0.035; // доля пути к цвету секции за кадр
const DEFAULT_TINT = 'cyan';

const narrow = window.matchMedia('(max-width: 900px)');

const canvas = document.getElementById('graph');
const ctx = canvas ? canvas.getContext('2d', { alpha: true }) : null;

/** Закадровый холст с разводкой: рисуется на смену размера, дальше копируется. */
const layer = ctx ? document.createElement('canvas') : null;
const layerCtx = layer ? layer.getContext('2d', { alpha: true }) : null;

let width = 0;
let height = 0;
let dpr = 1;
let traces = [];
let dampElements = [];
let dampHoles = [];
let frameId = 0;
let staticId = 0;
let lastSpawn = 0;
let lastMeasure = 0;
let lastDraw = 0;
let resizeTimer = 0;

const sparks = [];

/** Стартовый цвет — акцент страницы: на внутренних он не cyan. */
const startTint = TINTS[document.documentElement.dataset.acc] ?? TINTS[DEFAULT_TINT];
const tintNow = [...startTint];
let tintTarget = [...startTint];

/** Список затеняемых блоков меняется только при перестройке DOM. */
function collect() {
  dampElements = damp.collect();
  measure();
}

function measure() {
  dampHoles = damp.measure(dampElements, window.scrollY);
}

/**
 * Размер канваса в CSS-пикселях задаёт разметка (position: fixed; inset: 0),
 * здесь настраивается только растр под плотность экрана.
 */
function resizeRaster() {
  dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
  width = canvas.clientWidth;
  height = canvas.clientHeight;

  for (const surface of [canvas, layer]) {
    surface.width = Math.round(width * dpr);
    surface.height = Math.round(height * dpr);
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** Разводка строится заново и сразу запекается в закадровый холст. */
function rebuildTraces() {
  traces = buildTraces(width, height);
  sparks.length = 0;

  layerCtx.clearRect(0, 0, width, height);
  paintTraces(layerCtx, traces);
}

/** Цвет импульсов догоняет акцент секции, а не прыгает вместе с ним. */
function easeTint() {
  for (let i = 0; i < tintNow.length; i++) {
    tintNow[i] += (tintTarget[i] - tintNow[i]) * TINT_EASE;
  }
  return tintNow.map((channel) => Math.round(channel));
}

/** Общая часть живого и статичного кадра: разводка и дыры под текстом. */
function paintFrame(withPulses) {
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(layer, 0, 0, width, height);
  if (withPulses) pulses.draw(ctx, sparks, easeTint());
  damp.draw(ctx, dampHoles, { scrollY: window.scrollY, height });
}

/**
 * На узком экране фон рисуется тридцать раз в секунду вместо шестидесяти.
 * Перерисовка канваса во весь экран тянет за собой всё, что лежит поверх
 * него, поэтому она и есть самая дорогая строка кадра. Движение импульсов
 * при этом идёт покадрово: пять сложений стоят несравнимо меньше.
 */
function drawDue(time) {
  if (!narrow.matches) return true;
  if (time - lastDraw < DRAW_EVERY_NARROW) return false;

  lastDraw = time;
  return true;
}

function frame(time) {
  pulses.step(sparks);

  if (time - lastSpawn > pulses.SPAWN_EVERY) {
    lastSpawn = time;
    pulses.spawn(sparks, traces);
  }

  const measureEvery = narrow.matches ? MEASURE_EVERY_NARROW : MEASURE_EVERY;
  if (time - lastMeasure > measureEvery) {
    lastMeasure = time;
    measure();
  }

  if (drawDue(time)) paintFrame(true);
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
 * Фон без движения. Просьба «меньше движения» — это просьба про импульсы,
 * а не про разводку: гайд §5 требует, чтобы под стеклом была видимая
 * структура, и дорожки — единственное, что её даёт.
 */
function staticFrame() {
  paintFrame(false);
}

/**
 * Перерисовать статичный кадр, но не чаще кадра экрана. Канвас фиксирован,
 * а дыры привязаны к блокам, которые уезжают при прокрутке: без этого
 * затенение оставалось бы там, где текст был на момент загрузки.
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

/** Первая настройка: растр под плотность экрана, разводка, геометрия дыр. */
function sync() {
  resizeRaster();
  rebuildTraces();
  collect();
  restart();
}

/**
 * Экран изменился. Разводка перестраивается при любой смене размера: в отличие
 * от прежней сети, она тянется через весь экран и по высоте тоже. Ресайз
 * приходит уже сглаженным таймером, поэтому прятанье адресной строки
 * на телефоне до перестройки не доходит.
 */
function onResize() {
  if (canvas.clientWidth === width && canvas.clientHeight === height) return;

  resizeRaster();
  rebuildTraces();
  collect();
  restart();
}

function listen() {
  window.addEventListener(
    'resize',
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(onResize, RESIZE_DELAY);
    },
    { passive: true },
  );

  // В обычном режиме положение дыр догоняет цикл, в статичном — некому.
  window.addEventListener(
    'scroll',
    () => {
      if (reducedMotion.matches) requestStatic();
    },
    { passive: true },
  );

  // Вкладку только приостанавливаем: перестраивать разводку незачем, экран тот же.
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  reducedMotion.addEventListener('change', restart);
}

/** Перекрасить импульсы в акцент секции. Имена — те же, что у `data-acc`. */
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
