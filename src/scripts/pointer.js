/**
 * Свет за курсором и параллакс ауроры — DESIGN-GUIDE §1.
 *
 * Оба слоя догоняют курсор с запаздыванием: мгновенное следование читается
 * как приклеенный к мыши блик, а не как источник света в глубине сцены.
 * Аврора отстаёт сильнее и сдвигается против курсора — так у фона
 * появляется глубина.
 *
 * Только для настоящего курсора: на тач-экране pointermove приходит во время
 * прокрутки пальцем, и свет вспыхивал бы от каждого касания.
 *
 * Цикл засыпает, когда слои догнали цель, и просыпается на движении:
 * держать requestAnimationFrame ради неподвижной картинки — плата ни за что.
 */
import { reducedMotion } from './lib/motion.js';

const FINE_POINTER = '(hover: hover) and (pointer: fine)';

const LIGHT_EASE = 0.11; // доля пути к курсору за кадр
const PLANE_EASE = 0.075;

/** Сдвиг ауроры у самого края экрана. Знак минус — против курсора. */
const AURORA_X = -16;
const AURORA_Y = -12;

const STILL_PLANE = 0.0015; // в долях полуэкрана
const STILL_LIGHT = 0.6; // px

const light = document.getElementById('light');
const aurora = document.getElementById('aurora');
const finePointer = window.matchMedia(FINE_POINTER);

/** Цель плоскости в долях от центра экрана: -1 у левого края, 1 у правого. */
const aim = { x: 0, y: 0 };
const plane = { x: 0, y: 0 };
const cursor = { x: 0, y: 0 };
const glow = { x: 0, y: 0 };

let running = false;
let placed = false;

const active = () => finePointer.matches && !reducedMotion.matches;

const approach = (from, to, ease) => from + (to - from) * ease;

function aimAt(event) {
  cursor.x = event.clientX;
  cursor.y = event.clientY;
  aim.x = (cursor.x / window.innerWidth) * 2 - 1;
  aim.y = (cursor.y / window.innerHeight) * 2 - 1;

  // Первый раз свет ставится сразу: иначе он прилетает из левого верхнего угла.
  if (placed) return;
  placed = true;
  glow.x = cursor.x;
  glow.y = cursor.y;
}

function paint() {
  light.style.transform = `translate3d(${glow.x.toFixed(1)}px, ${glow.y.toFixed(1)}px, 0)`;
  aurora.style.transform = `translate3d(${(plane.x * AURORA_X).toFixed(2)}px, ${(plane.y * AURORA_Y).toFixed(2)}px, 0)`;
}

const settled = () =>
  Math.abs(aim.x - plane.x) < STILL_PLANE &&
  Math.abs(aim.y - plane.y) < STILL_PLANE &&
  Math.hypot(cursor.x - glow.x, cursor.y - glow.y) < STILL_LIGHT;

function frame() {
  plane.x = approach(plane.x, aim.x, PLANE_EASE);
  plane.y = approach(plane.y, aim.y, PLANE_EASE);
  glow.x = approach(glow.x, cursor.x, LIGHT_EASE);
  glow.y = approach(glow.y, cursor.y, LIGHT_EASE);

  paint();

  running = !settled();
  if (running) requestAnimationFrame(frame);
}

function wake() {
  if (running) return;
  running = true;
  requestAnimationFrame(frame);
}

function onMove(event) {
  if (!active()) return;
  aimAt(event);
  document.body.classList.add('pt');
  wake();
}

/** Курсор ушёл из окна: плоскость возвращается в покой, свет гаснет. */
function onLeave() {
  aim.x = 0;
  aim.y = 0;
  document.body.classList.remove('pt');
  wake();
}

if (light && aurora) {
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerleave', onLeave, { passive: true });
}
