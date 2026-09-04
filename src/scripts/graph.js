/**
 * Фон — DESIGN-GUIDE §9. Плата: процессор в центре экрана и дорожки под 90°
 * и 45°, сходящиеся к его выводам с четырёх краёв. По дорожкам бегут импульсы.
 *
 * Два цвета, и они говорят о разном. Дорожки и импульсы держат акцент читаемой
 * секции — по ним видно, где посетитель. Корпус процессора перебирает всю
 * палитру по кругу и прокрутке не подчиняется: он один на странице и показывает,
 * что плата под током.
 *
 * Устройство слоя, ради которого всё и переписано: геометрия дорожек не зависит
 * от времени, поэтому она запекается белой маской в закадровый холст один раз
 * на размер окна. Каждый кадр маска копируется одним drawImage и красится одной
 * заливкой в режиме source-in. Прежняя сеть пересобиралась покадрово —
 * восемьдесят восемь узлов, все их попарные расстояния и нити к элементам
 * интерфейса.
 *
 * Порядок отрисовки — снизу вверх: разводка, корпус, импульсы, и последними
 * дыры под текстом. Один requestAnimationFrame на всю страницу.
 */
import { reducedMotion } from './lib/motion.js';
import { TINTS, rgba } from './graph/paint.js';
import { buildBoard, paintTraces, paintChip } from './graph/traces.js';
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
const DEFAULT_TINT = 'cyan';

/**
 * Процессор перебирает всю палитру по кругу, независимо от прокрутки: дорожки
 * говорят, какой раздел читают, а корпус — что плата под током. Один цвет
 * перетекает в следующий за CHIP_PERIOD, без пауз на чистом цвете: пауза
 * читается как «зависло», а не как «работает».
 */
const CHIP_CYCLE = ['cyan', 'indigo', 'violet', 'amber', 'rose'];
const CHIP_PERIOD = 3400; // мс на переход между соседними цветами

const narrow = window.matchMedia('(max-width: 900px)');

const canvas = document.getElementById('graph');
const ctx = canvas ? canvas.getContext('2d', { alpha: true }) : null;

/**
 * Два закадровых холста. `mask` — разводка белым, её геометрия зависит только
 * от размера окна. `tinted` — она же в цвете текущей секции.
 *
 * Перекраска стоит полноэкранной композиции, поэтому её нельзя делать каждый
 * кадр: замер показал скачок пропущенных кадров с 3,5% до 11,6%. Но и каждый
 * кадр она не нужна — цвет меняется секунду на смене раздела и дальше стоит.
 * Поэтому `tinted` пересобирается, только когда округлённый цвет отличается
 * от запечённого, а в остальные кадры слой просто копируется.
 */
const mask = ctx ? document.createElement('canvas') : null;
const maskCtx = mask ? mask.getContext('2d', { alpha: true }) : null;
const tinted = ctx ? document.createElement('canvas') : null;
const tintedCtx = tinted ? tinted.getContext('2d', { alpha: true }) : null;

/** Цвет, в котором сейчас запечён `tinted`. Пустой — значит слоя ещё нет. */
let bakedTint = '';

let width = 0;
let height = 0;
let dpr = 1;
let board = { chip: null, traces: [] };
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
let tint = [...startTint];

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

  for (const surface of [canvas, mask, tinted]) {
    surface.width = Math.round(width * dpr);
    surface.height = Math.round(height * dpr);
  }

  for (const context of [ctx, maskCtx, tintedCtx]) {
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Растр пересоздан — запечённая копия вместе с ним обнулилась.
  bakedTint = '';
}

/** Разводка строится заново и сразу запекается в маску. */
function rebuildBoard() {
  board = buildBoard(width, height);
  sparks.length = 0;

  maskCtx.clearRect(0, 0, width, height);
  paintTraces(maskCtx, board.traces);
  bakedTint = '';
}

/**
 * Перекрасить маску в заданный цвет — но только если он и правда сменился.
 * `source-in` сохраняет альфу назначения и берёт цвет источника, то есть
 * красит ровно нарисованные дорожки и ничего кроме них.
 */
function bakeTint(tint) {
  const key = tint.join(',');
  if (key === bakedTint) return;
  bakedTint = key;

  tintedCtx.globalCompositeOperation = 'source-over';
  tintedCtx.clearRect(0, 0, width, height);
  tintedCtx.drawImage(mask, 0, 0, width, height);
  tintedCtx.globalCompositeOperation = 'source-in';
  tintedCtx.fillStyle = rgba(tint, 1);
  tintedCtx.fillRect(0, 0, width, height);
}

/** Цвет корпуса: перетекание между соседними цветами палитры по кругу. */
function chipColor(time) {
  const position = time / CHIP_PERIOD;
  const index = Math.floor(position) % CHIP_CYCLE.length;
  const from = TINTS[CHIP_CYCLE[index]];
  const to = TINTS[CHIP_CYCLE[(index + 1) % CHIP_CYCLE.length]];
  const k = position - Math.floor(position);

  return from.map((channel, i) => Math.round(channel + (to[i] - channel) * k));
}

/**
 * Кадр целиком: копия окрашенной разводки, поверх корпус и импульсы своими
 * цветами, и последними дыры под текстом.
 */
function paintFrame(time, moving) {
  bakeTint(tint);

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(tinted, 0, 0, width, height);

  paintChip(ctx, board.chip, chipColor(time));
  if (moving) pulses.draw(ctx, sparks, tint);

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
    pulses.spawn(sparks, board.traces);
  }

  const measureEvery = narrow.matches ? MEASURE_EVERY_NARROW : MEASURE_EVERY;
  if (time - lastMeasure > measureEvery) {
    lastMeasure = time;
    measure();
  }

  if (drawDue(time)) paintFrame(time, true);
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
  paintFrame(0, false);
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
  rebuildBoard();
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
  rebuildBoard();
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

/**
 * Перекрасить разводку и импульсы в акцент секции. Имена — те же, что у `data-acc`.
 *
 * Цвет ставится сразу, без перетекания, — то же правило, что у CSS-акцента
 * (DESIGN-GUIDE §2, отступление «Акцент без перетекания»), и по той же причине.
 * Здесь она даже жёстче: каждый промежуточный цвет означает перепечь
 * полноэкранный слой заново. Замер прокрутки главной: с перетеканием
 * пропущенных кадров 15,2%, без него — прежние 3–4%.
 */
export function setTint(name) {
  if (!TINTS[name]) return;
  tint = [...TINTS[name]];

  // Цикл не запущен — статичный кадр перерисовать некому.
  if (reducedMotion.matches) requestStatic();
}

if (ctx) {
  listen();
  sync();
}
