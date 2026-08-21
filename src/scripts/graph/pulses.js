/**
 * Импульсы — DESIGN-GUIDE §9. По рёбрам бегут искры: сеть должна выглядеть
 * работающей, а не нарисованной.
 *
 * Порог рождения и потолок числа обязательны. Без них искры плодятся каждый
 * кадр и спокойный фон превращается в мигающую гирлянду.
 */
import { neighbours } from './field.js';
import { NODE_COLORS, rgba, line, dot } from './paint.js';

/** Не чаще одной искры в 820 мс (§16). */
export const SPAWN_EVERY = 820;

const MAX_ALIVE = 10;
const MIN_SPEED = 0.006; // доля ребра за кадр
const SPEED_SPREAD = 0.006;
const MAX_HOPS = 5; // после пяти переходов искра гаснет

const CORE_RADIUS = 2.2;
const CORE_ALPHA = 0.95;
const HALO_RADIUS = 7.5;
const HALO_ALPHA = 0.18;
const TAIL_ALPHA = 0.36;
const TAIL_WIDTH = 1.35;

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export function spawn(pulses, nodes, limit) {
  if (!nodes.length || pulses.length >= MAX_ALIVE) return;

  const from = Math.floor(Math.random() * nodes.length);
  const reachable = neighbours(nodes, from, limit);
  if (!reachable.length) return;

  pulses.push({
    from,
    to: pick(reachable),
    progress: 0,
    speed: MIN_SPEED + Math.random() * SPEED_SPREAD,
    color: pick(NODE_COLORS),
    hops: 0,
  });
}

/** Дошла до узла — уходит на соседнее ребро. Некуда или нечем — гаснет. */
function hop(pulse, nodes, limit) {
  pulse.hops += 1;
  if (pulse.hops > MAX_HOPS) return false;

  const reachable = neighbours(nodes, pulse.to, limit);
  if (!reachable.length) return false;

  pulse.from = pulse.to;
  pulse.to = pick(reachable);
  pulse.progress = 0;
  return true;
}

/** Идём с конца: удаление по индексу не сдвигает ещё не просмотренные искры. */
export function step(pulses, nodes, limit) {
  for (let i = pulses.length - 1; i >= 0; i--) {
    const pulse = pulses[i];
    pulse.progress += pulse.speed;
    if (pulse.progress >= 1 && !hop(pulse, nodes, limit)) pulses.splice(i, 1);
  }
}

function drawSpark(ctx, pulse, from, x, y) {
  ctx.fillStyle = rgba(pulse.color, HALO_ALPHA);
  dot(ctx, x, y, HALO_RADIUS);
  ctx.fillStyle = rgba(pulse.color, CORE_ALPHA);
  dot(ctx, x, y, CORE_RADIUS);
  ctx.strokeStyle = rgba(pulse.color, TAIL_ALPHA);
  ctx.lineWidth = TAIL_WIDTH;
  line(ctx, from.x, from.y, x, y);
}

export function draw(ctx, pulses, nodes) {
  for (const pulse of pulses) {
    const from = nodes[pulse.from];
    const to = nodes[pulse.to];
    drawSpark(
      ctx,
      pulse,
      from,
      from.x + (to.x - from.x) * pulse.progress,
      from.y + (to.y - from.y) * pulse.progress,
    );
  }
}
