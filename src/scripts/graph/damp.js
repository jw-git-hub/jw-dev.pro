/**
 * Демпфирование — DESIGN-GUIDE §9. Граф не спорит с текстом: под каждым
 * объявленным блоком в канвасе прожигается мягкая дыра режимом
 * destination-out. В пустых зонах сеть остаётся на полной яркости,
 * а читать сквозь неё не приходится нигде.
 *
 * Блок объявляет себя атрибутом `data-damp`, значение — сила от 0 до 1;
 * пустой атрибут означает силу по умолчанию. Списка селекторов не ведём:
 * компонент, которому сеть мешает, говорит об этом у себя, а не строчкой
 * в чужом файле, про которую забудут при следующем переименовании.
 */
import { dot } from './paint.js';

const DAMPED = '[data-damp]';
const DEFAULT_STRENGTH = 0.74;

/** Запас вокруг блока: дыра обязана начинаться до первой буквы. */
const PAD_X = 30;
const PAD_Y = 26;

const MID_STOP = 0.62;
const MID_FACTOR = 0.66;

export const collect = () => [...document.querySelectorAll(DAMPED)];

function strengthOf(element) {
  const value = Number.parseFloat(element.dataset.damp);
  return value > 0 ? value : DEFAULT_STRENGTH;
}

export function measure(elements, scrollY) {
  const holes = [];
  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;
    holes.push({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2 + scrollY,
      rx: rect.width / 2 + PAD_X,
      ry: rect.height / 2 + PAD_Y,
      strength: strengthOf(element),
    });
  }
  return holes;
}

function fade(ctx, strength) {
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  gradient.addColorStop(0, `rgba(0,0,0,${strength})`);
  gradient.addColorStop(MID_STOP, `rgba(0,0,0,${(strength * MID_FACTOR).toFixed(3)})`);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  return gradient;
}

/** Градиент круглый: в эллипс по габаритам блока его растягивает масштаб. */
function punch(ctx, hole, y) {
  ctx.save();
  ctx.translate(hole.x, y);
  ctx.scale(hole.rx, hole.ry);
  ctx.fillStyle = fade(ctx, hole.strength);
  dot(ctx, 0, 0, 1);
  ctx.restore();
}

export function draw(ctx, holes, { scrollY, height }) {
  if (!holes.length) return;

  ctx.globalCompositeOperation = 'destination-out';
  for (const hole of holes) {
    const y = hole.y - scrollY;
    if (y + hole.ry < 0 || y - hole.ry > height) continue;
    punch(ctx, hole, y);
  }
  ctx.globalCompositeOperation = 'source-over';
}
