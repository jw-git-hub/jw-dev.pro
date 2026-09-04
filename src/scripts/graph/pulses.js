/**
 * Импульсы по дорожкам — DESIGN-GUIDE §9.
 *
 * Единственное, что на фоне движется, и единственное, что носит цвет:
 * разводка серая и статичная, акцент секции живёт здесь. Импульс — короткий
 * светящийся отрезок, идущий вдоль дорожки от начала к концу; дойдя до
 * площадки, он гаснет и рождается заново на другой дорожке.
 *
 * Хвост рисуется несколькими звеньями с растущей прозрачностью, а не
 * градиентом вдоль пути: градиент на канвасе строится в экранных координатах
 * и его пришлось бы пересоздавать каждый кадр для каждого импульса.
 */
import { rgba, dot } from './paint.js';
import { pointAt } from './traces.js';

/** Не чаще одного рождения в этот срок и не больше ЖИВЫХ штук одновременно. */
export const SPAWN_EVERY = 900; // мс
const ALIVE_MAX = 5;

/** Скорость в пикселях за кадр. Медленнее — фон засыпает, быстрее — мельтешит. */
const SPEED_MIN = 1.5;
const SPEED_SPAN = 1.3;

/** Длина хвоста и на сколько звеньев он разбит. */
const TAIL = 54;
const TAIL_STEPS = 6;
const TAIL_ALPHA = 0.5;

const HEAD_RADIUS = 1.9;
const HEAD_ALPHA = 0.95;
const GLOW_RADIUS = 5;
const GLOW_ALPHA = 0.16;

const LINE_WIDTH = 1.6;

export function spawn(sparks, traces) {
  if (sparks.length >= ALIVE_MAX || !traces.length) return;

  const trace = traces[Math.floor(Math.random() * traces.length)];
  if (trace.length <= TAIL) return;

  sparks.push({
    trace,
    at: 0,
    speed: SPEED_MIN + Math.random() * SPEED_SPAN,
  });
}

export function step(sparks) {
  for (let i = sparks.length - 1; i >= 0; i -= 1) {
    const spark = sparks[i];
    spark.at += spark.speed;
    if (spark.at > spark.trace.length) sparks.splice(i, 1);
  }
}

/**
 * Хвост звеньями: каждое следующее ближе к голове и ярче. Ломаная повторяет
 * дорожку сама собой — точки берутся с неё же, а не по прямой между концами.
 */
function tail(ctx, spark, color) {
  const stepLength = TAIL / TAIL_STEPS;

  for (let i = 0; i < TAIL_STEPS; i += 1) {
    const from = pointAt(spark.trace, spark.at - stepLength * (i + 1));
    const to = pointAt(spark.trace, spark.at - stepLength * i);
    if (!from || !to) continue;

    ctx.strokeStyle = rgba(color, TAIL_ALPHA * (1 - i / TAIL_STEPS));
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.stroke();
  }
}

export function draw(ctx, sparks, color) {
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineCap = 'round';

  for (const spark of sparks) {
    const head = pointAt(spark.trace, spark.at);
    if (!head) continue;

    tail(ctx, spark, color);

    ctx.fillStyle = rgba(color, GLOW_ALPHA);
    dot(ctx, head[0], head[1], GLOW_RADIUS);
    ctx.fillStyle = rgba(color, HEAD_ALPHA);
    dot(ctx, head[0], head[1], HEAD_RADIUS);
  }
}
