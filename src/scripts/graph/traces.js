/**
 * Дорожки платы — DESIGN-GUIDE §9.
 *
 * Геометрия та же, что у настоящей разводки: длинные прямые участки,
 * повороты только под 45°, площадки на концах. Всё лежит на сетке в 26px,
 * иначе картинка читается как небрежные линии, а не как плата.
 *
 * Дорожки приглушённые и одного цвета на всю страницу — акцент секции
 * несут импульсы (pulses.js), а не сама разводка. Так и на референсах
 * владельца, и это же делает слой статичным: пока не меняется размер окна,
 * перерисовывать его незачем.
 */
import { rgba, dot, ring } from './paint.js';

/** Шаг сетки. Все повороты кратны ему, поэтому диагонали выходят ровно 45°. */
const GRID = 26;

/** Прямой участок между поворотами, в клетках сетки. */
const RUN_MIN = 2;
const RUN_SPAN = 6;

/** Подъём диагонали, в клетках. Больше трёх читается как излом, а не поворот. */
const RISE_MIN = 1;
const RISE_SPAN = 3;

const TURN_CHANCE = 0.62;

/** Предохранитель обхода: дорожка не может состоять из сотен звеньев. */
const MAX_STEPS = 40;

/** Плотность: «немного» из брифа владельца — примерно дорожка на 90px высоты. */
const ROWS_DIVISOR = 90;
const ROWS_MAX = 13;
const ROWS_NARROW = 6;
const NARROW_WIDTH = 760;

/** Цвет разводки — служебный слейт, вне палитры акцентов. */
const TRACE = [148, 163, 184];
const TRACE_ALPHA = 0.3;
const TRACE_WIDTH = 1;

/** Площадка на конце дорожки и переходное отверстие на изломе. */
const PAD_RADIUS = 4.5;
const PAD_ALPHA = 0.34;
const VIA_RADIUS = 1.6;
const VIA_ALPHA = 0.4;
const VIA_CHANCE = 0.34;

const rand = () => Math.random();
const cells = (min, span) => (min + Math.floor(rand() * span)) * GRID;

/**
 * Одна дорожка: идёт слева направо, чередуя прямой участок и поворот под 45°.
 * Возвращает точки излома — по ним же потом бегут импульсы.
 */
function walk(startY, width, height) {
  const points = [[-GRID, startY]];
  let x = -GRID;
  let y = startY;

  for (let step = 0; step < MAX_STEPS && x < width + GRID; step += 1) {
    x += cells(RUN_MIN, RUN_SPAN);
    points.push([x, y]);

    if (rand() > TURN_CHANCE) continue;

    // Диагональ ровно 45°: горизонтальный сдвиг равен вертикальному.
    const rise = cells(RISE_MIN, RISE_SPAN);
    const next = y + (rand() < 0.5 ? -rise : rise);
    if (next < GRID || next > height - GRID) continue;

    x += rise;
    y = next;
    points.push([x, y]);
  }

  return points;
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

/** Сколько дорожек помещается: считаем от высоты, на узком экране — меньше. */
function traceCount(width, height) {
  if (width < NARROW_WIDTH) return ROWS_NARROW;
  return Math.min(ROWS_MAX, Math.round(height / ROWS_DIVISOR));
}

export function buildTraces(width, height) {
  const count = traceCount(width, height);
  const band = height / count;
  const traces = [];

  for (let i = 0; i < count; i += 1) {
    // Ряд на дорожку, старт внутри ряда: без этого разводка ложится полосами.
    const startY = Math.round((band * (i + rand())) / GRID) * GRID;
    const trace = withLengths(walk(startY, width, height));
    if (trace.length > 0) traces.push(trace);
  }

  return traces;
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
 * Статичный слой целиком. Рисуется в закадровый холст один раз на размер окна,
 * дальше каждый кадр только копируется одним drawImage — это и есть вся
 * экономия по сравнению с прежней сетью, которая пересобиралась покадрово.
 */
export function paintTraces(ctx, traces) {
  ctx.lineWidth = TRACE_WIDTH;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(TRACE, TRACE_ALPHA);

  for (const trace of traces) {
    ctx.beginPath();
    ctx.moveTo(trace.points[0][0], trace.points[0][1]);
    for (let i = 1; i < trace.points.length; i += 1) {
      ctx.lineTo(trace.points[i][0], trace.points[i][1]);
    }
    ctx.stroke();
  }

  paintPads(ctx, traces);
}

/** Площадки на концах и редкие переходные отверстия на изломах. */
function paintPads(ctx, traces) {
  ctx.fillStyle = rgba(TRACE, VIA_ALPHA);
  ctx.strokeStyle = rgba(TRACE, PAD_ALPHA);

  for (const trace of traces) {
    const last = trace.points[trace.points.length - 1];
    ring(ctx, last[0], last[1], PAD_RADIUS);

    for (let i = 1; i < trace.points.length - 1; i += 1) {
      if (rand() > VIA_CHANCE) continue;
      dot(ctx, trace.points[i][0], trace.points[i][1], VIA_RADIUS);
    }
  }
}
