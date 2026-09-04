/**
 * Плата: процессор в центре и дорожки, сходящиеся к нему с краёв экрана —
 * DESIGN-GUIDE §9.
 *
 * Каждая дорожка начинается за кромкой экрана и заканчивается на выводе
 * корпуса. Геометрия та же, что у настоящей разводки: прямой участок,
 * поворот под 45°, снова прямой — и вход в вывод по нормали. Всё лежит
 * на сетке в 26px, поэтому диагональ выходит ровно 45°, а дорожка попадает
 * в вывод, а не рядом.
 *
 * Дорожки рисуются белым: цвет им даёт graph.js одной композитной заливкой
 * на кадр. Так слой остаётся запечённым, а цвет всё равно следует за секцией.
 */
import { rgba, dot } from './paint.js';

/** Шаг сетки. Все повороты кратны ему, поэтому диагонали выходят ровно 45°. */
const GRID = 26;

const NARROW_WIDTH = 760;

/** Сторона корпуса и число выводов на каждой из четырёх сторон. */
const CHIP_SIDE = 182;
const CHIP_SIDE_NARROW = 112;
const PINS_PER_SIDE = 5;
const PINS_PER_SIDE_NARROW = 3;

/** Прямая шейка перед выводом: дорожка входит в корпус по нормали. */
const LEAD = GRID;

/**
 * Уступ дорожки — короткий: не больше этого числа клеток и не больше половины
 * свободного места. Без потолка диагональ вырастает во весь экран и читается
 * как случайная линия поперёк страницы, а не как обход препятствия на плате.
 */
const RISE_MAX_CELLS = 5;
const RISE_SHARE = 0.5;

const TRACE_WIDTH = 1;
const TRACE_ALPHA = 0.42;

/** Переходное отверстие на изломе. */
const VIA_RADIUS = 1.7;
const VIA_ALPHA = 0.55;
const VIA_CHANCE = 0.5;

/** Корпус: рамка, кристалл внутри, выводы, метка первого вывода. */
const DIE_SHARE = 0.52;
const PIN_LENGTH = 9;
const PIN_WIDTH = 3;
const BODY_ALPHA = 0.14;
const EDGE_ALPHA = 0.85;
const DIE_ALPHA = 0.45;
const MARK_RADIUS = 2.4;
const MARK_INSET = 13;

const snap = (value) => Math.round(value / GRID) * GRID;
const rand = () => Math.random();
const between = (min, max) => min + rand() * (max - min);

/**
 * Корпус в центре экрана. Сторона и центр посажены на сетку: выводы обязаны
 * стоять в её узлах, иначе диагональ дорожки придёт в вывод под 44°.
 */
function buildChip(width, height) {
  const narrow = width < NARROW_WIDTH;
  const half = snap((narrow ? CHIP_SIDE_NARROW : CHIP_SIDE) / 2);
  const perSide = narrow ? PINS_PER_SIDE_NARROW : PINS_PER_SIDE;
  const cx = snap(width / 2);
  const cy = snap(height / 2);
  const step = snap((half * 2) / (perSide + 1)) || GRID;
  const first = -step * ((perSide - 1) / 2);

  const pins = [];
  for (let i = 0; i < perSide; i += 1) {
    const offset = first + step * i;
    pins.push({ x: cx - half, y: cy + offset, side: 'left' });
    pins.push({ x: cx + half, y: cy + offset, side: 'right' });
    pins.push({ x: cx + offset, y: cy - half, side: 'top' });
    pins.push({ x: cx + offset, y: cy + half, side: 'bottom' });
  }

  return { cx, cy, half, pins };
}

/**
 * Дорожка к выводу на левой или правой стороне. Идёт по горизонтали от кромки
 * экрана, один раз ломается под 45°, чтобы попасть на строку вывода, и входит
 * в него прямой шейкой.
 */
function routeHorizontal(pin, width, height) {
  const fromLeft = pin.side === 'left';
  const edge = fromLeft ? -GRID : width + GRID;
  const gate = pin.x + (fromLeft ? -LEAD : LEAD);
  const room = Math.abs(gate - edge) - GRID;
  if (room < GRID * 2) return null;

  const rise = snap(between(0, Math.min(room * RISE_SHARE, RISE_MAX_CELLS * GRID)));
  const startY = pin.y + (rand() < 0.5 ? -rise : rise);
  if (startY < GRID || startY > height - GRID) return null;

  const straight = snap(between(GRID, room - rise));
  const turn = fromLeft ? edge + straight : edge - straight;
  const land = fromLeft ? turn + rise : turn - rise;

  return [
    [edge, startY],
    [turn, startY],
    [land, pin.y],
    [gate, pin.y],
    [pin.x, pin.y],
  ];
}

/** То же для верхней и нижней сторон: оси меняются местами. */
function routeVertical(pin, width, height) {
  const fromTop = pin.side === 'top';
  const edge = fromTop ? -GRID : height + GRID;
  const gate = pin.y + (fromTop ? -LEAD : LEAD);
  const room = Math.abs(gate - edge) - GRID;
  if (room < GRID * 2) return null;

  const rise = snap(between(0, Math.min(room * RISE_SHARE, RISE_MAX_CELLS * GRID)));
  const startX = pin.x + (rand() < 0.5 ? -rise : rise);
  if (startX < GRID || startX > width - GRID) return null;

  const straight = snap(between(GRID, room - rise));
  const turn = fromTop ? edge + straight : edge - straight;
  const land = fromTop ? turn + rise : turn - rise;

  return [
    [startX, edge],
    [startX, turn],
    [pin.x, land],
    [pin.x, gate],
    [pin.x, pin.y],
  ];
}

/** Накопленные длины звеньев: импульсу нужно знать, где он на дорожке. */
function withLengths(points) {
  const legs = [];
  let total = 0;

  for (let i = 1; i < points.length; i += 1) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (!length) continue;

    legs.push({ x1, y1, x2, y2, length, start: total });
    total += length;
  }

  return { points, legs, length: total };
}

export function buildBoard(width, height) {
  const chip = buildChip(width, height);
  const traces = [];

  for (const pin of chip.pins) {
    const horizontal = pin.side === 'left' || pin.side === 'right';
    const points = horizontal
      ? routeHorizontal(pin, width, height)
      : routeVertical(pin, width, height);
    if (!points) continue;

    const trace = withLengths(points);
    if (trace.length > 0) traces.push(trace);
  }

  return { chip, traces };
}

/** Точка на дорожке в заданной длине от её начала. */
export function pointAt(trace, distance) {
  for (const leg of trace.legs) {
    const local = distance - leg.start;
    if (local < 0 || local > leg.length) continue;

    const k = local / leg.length;
    return [leg.x1 + (leg.x2 - leg.x1) * k, leg.y1 + (leg.y2 - leg.y1) * k];
  }

  return null;
}

/**
 * Разводка целиком, белым по прозрачному. Цвет накладывает graph.js: слой
 * запекается один раз на размер окна, а перекрашивается композицией.
 */
export function paintTraces(ctx, traces) {
  const white = [255, 255, 255];

  ctx.lineWidth = TRACE_WIDTH;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(white, TRACE_ALPHA);

  for (const trace of traces) {
    ctx.beginPath();
    ctx.moveTo(trace.points[0][0], trace.points[0][1]);
    for (let i = 1; i < trace.points.length; i += 1) {
      ctx.lineTo(trace.points[i][0], trace.points[i][1]);
    }
    ctx.stroke();
  }

  ctx.fillStyle = rgba(white, VIA_ALPHA);
  for (const trace of traces) {
    for (let i = 1; i < trace.points.length - 1; i += 1) {
      if (rand() > VIA_CHANCE) continue;
      dot(ctx, trace.points[i][0], trace.points[i][1], VIA_RADIUS);
    }
  }
}

/**
 * Корпус процессора. Рисуется каждый кадр и своим цветом: он один на странице
 * и перебирает всю палитру, пока дорожки следуют за акцентом секции.
 */
export function paintChip(ctx, chip, color) {
  const { cx, cy, half, pins } = chip;
  const side = half * 2;
  const die = Math.round(half * DIE_SHARE);

  ctx.fillStyle = rgba(color, BODY_ALPHA);
  ctx.fillRect(cx - half, cy - half, side, side);

  ctx.lineWidth = 1.4;
  ctx.strokeStyle = rgba(color, EDGE_ALPHA);
  ctx.strokeRect(cx - half, cy - half, side, side);

  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(color, DIE_ALPHA);
  ctx.strokeRect(cx - die, cy - die, die * 2, die * 2);

  ctx.fillStyle = rgba(color, EDGE_ALPHA);
  for (const pin of pins) paintPin(ctx, pin);

  // Метка первого вывода: на корпусе она есть всегда, иначе он не читается.
  dot(ctx, cx - half + MARK_INSET, cy - half + MARK_INSET, MARK_RADIUS);
}

/** Вывод — короткий штырёк наружу от кромки корпуса. */
function paintPin(ctx, pin) {
  const horizontal = pin.side === 'left' || pin.side === 'right';
  const away = pin.side === 'left' || pin.side === 'top' ? -1 : 1;

  if (horizontal) {
    ctx.fillRect(
      away < 0 ? pin.x - PIN_LENGTH : pin.x,
      pin.y - PIN_WIDTH / 2,
      PIN_LENGTH,
      PIN_WIDTH,
    );
    return;
  }

  ctx.fillRect(pin.x - PIN_WIDTH / 2, away < 0 ? pin.y - PIN_LENGTH : pin.y, PIN_WIDTH, PIN_LENGTH);
}
