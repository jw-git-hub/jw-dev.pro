/**
 * Кольцо стека — DESIGN-GUIDE §12.
 *
 * Кольцо — надстройка над сгруппированной сеткой, а не её замена: класс `.on`
 * ставится только на широком экране и без просьбы «меньше движения».
 * Всё, что скрипт трогает покадрово, — `transform`, `opacity` и `z-index`
 * через CSSOM; оба первых свойства считает композитор.
 *
 * Цикл живёт, пока секция в кадре и вкладка видна. Кольцо, которое крутится
 * за экраном, — это кадры, отнятые у прокрутки.
 */
import { reducedMotion } from './lib/motion.js';

/** Три яруса §12. Средний шире крайних, иначе кольцо читается плоским овалом. */
const TIERS = [
  { count: 8, y: -86, radius: 300, phase: 0 },
  { count: 7, y: 0, radius: 352, phase: 16 },
  { count: 7, y: 86, radius: 300, phase: 32 },
];

/** Чипы сверх 22 раскладываются по средней линии. */
const EXTRA_RADIUS = 340;

const SPIN_PER_FRAME = 0.085;
const DRAG_FACTOR = 0.28;
const DRAG_THRESHOLD = 3;
const NEAR_FRONT = 0.78;
const HOVER_LIFT = 12;
const HOVER_GROW = 1.12;
const RESIZE_DELAY = 180;
const VIEWPORT_MARGIN = '140px';

const narrow = window.matchMedia('(max-width: 900px)');

const ring = document.querySelector('[data-ring]');
const ringIn = document.querySelector('[data-ring-in]');
const chips = ring ? [...ring.querySelectorAll('.chip3')] : [];
const legend = ring ? [...document.querySelectorAll('.leg')] : [];

let marks = [];
let rot = 0;
let frameId = 0;
let hovered = null;
let dragging = false;
let inView = false;
let pinnedGroup = null;

/** Раскладка чипов по ярусам: угол, высота и радиус на каждый чип. */
function layout() {
  const placed = [];
  let index = 0;

  for (const tier of TIERS) {
    for (let n = 0; n < tier.count && index < chips.length; n += 1, index += 1) {
      const base = tier.phase + (360 / tier.count) * n;
      placed.push({ el: chips[index], base, y: tier.y, radius: tier.radius });
    }
  }

  const rest = chips.length - index;
  for (let n = 0; n < rest; n += 1, index += 1) {
    placed.push({ el: chips[index], base: (360 / rest) * n, y: 0, radius: EXTRA_RADIUS });
  }

  return placed;
}

/** Кольцо ужимается на узких окнах, чтобы не выпирать за контейнер. */
function ringScale() {
  return Math.min(1, Math.max(0.62, window.innerWidth / 1280));
}

function place(mark, scale) {
  const angle = ((mark.base + rot) * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // front: 0 — дальняя точка кольца, 1 — ближняя к зрителю.
  const front = (cos + 1) / 2;
  const lift = mark.el === hovered ? HOVER_LIFT : 0;
  const grow = mark.el === hovered ? HOVER_GROW : 1;
  const size = (0.7 + 0.3 * front) * grow;

  const shift = `translate3d(${sin * mark.radius * scale}px, ${mark.y * scale - lift}px, ${cos * mark.radius * scale}px)`;
  mark.el.style.setProperty('transform', `translate(-50%, -50%) ${shift} scale(${size})`);
  mark.el.style.setProperty('opacity', String(0.3 + 0.7 * front));
  // z-index пересчитывается каждый кадр, иначе ближние чипы уезжают под дальние.
  mark.el.style.setProperty('z-index', String(Math.round(cos * 100) + 120));
  mark.el.classList.toggle('near', front > NEAR_FRONT);
}

/** Одна раскладка по текущему углу — и в кадре анимации, и вне его. */
function paint() {
  const scale = ringScale();
  for (const mark of marks) place(mark, scale);
}

function frame() {
  if (!hovered && !dragging) rot += SPIN_PER_FRAME;
  paint();
  frameId = requestAnimationFrame(frame);
}

function startFrames() {
  if (frameId || !ring.classList.contains('on')) return;
  frameId = requestAnimationFrame(frame);
}

function stopFrames() {
  cancelAnimationFrame(frameId);
  frameId = 0;
}

/** Кольцо выключается начисто: инлайновых стилей от него остаться не должно. */
function clearChips() {
  for (const chip of chips) {
    chip.style.removeProperty('transform');
    chip.style.removeProperty('opacity');
    chip.style.removeProperty('z-index');
    chip.classList.remove('near');
  }
}

function enable() {
  if (ring.classList.contains('on')) return;
  marks = layout();
  ring.classList.add('on');
  /* Раскладываем сразу, не дожидаясь первого кадра: пока секция за экраном
     или вкладка в фоне, кадров нет вовсе — и чипы лежали бы стопкой
     в центре кольца. Это же кадр, который увидят при печати страницы. */
  paint();
  if (inView) startFrames();
}

function disable() {
  if (!ring.classList.contains('on')) return;
  stopFrames();
  ring.classList.remove('on');
  clearChips();
}

function sync() {
  if (narrow.matches || reducedMotion.matches) disable();
  else enable();
}

/* ── Легенда: гашение чужих групп ──────────────────────────────────── */

function dimOthers(group) {
  for (const chip of chips)
    chip.classList.toggle('dim', Boolean(group) && chip.dataset.g !== group);
}

function pin(button) {
  const group = button.dataset.g;
  pinnedGroup = pinnedGroup === group ? null : group;
  for (const item of legend) {
    item.setAttribute('aria-pressed', String(item.dataset.g === pinnedGroup));
  }
  dimOthers(pinnedGroup);
}

function bindLegend() {
  for (const button of legend) {
    // focus/blur обязательны наравне с указателем: с клавиатуры наведения нет.
    button.addEventListener('pointerenter', () => dimOthers(pinnedGroup ?? button.dataset.g));
    button.addEventListener('focus', () => dimOthers(pinnedGroup ?? button.dataset.g));
    button.addEventListener('pointerleave', () => dimOthers(pinnedGroup));
    button.addEventListener('blur', () => dimOthers(pinnedGroup));
    button.addEventListener('click', () => pin(button));
  }
}

/* ── Наведение на чип и перетаскивание кольца ──────────────────────── */

function bindChips() {
  for (const chip of chips) {
    chip.addEventListener('pointerenter', () => {
      if (ring.classList.contains('on')) hovered = chip;
    });
    chip.addEventListener('pointerleave', () => {
      if (hovered === chip) hovered = null;
    });
  }
}

function bindDrag() {
  let startX = 0;
  let startRot = 0;
  let moved = 0;

  ring.addEventListener('pointerdown', (event) => {
    if (!ring.classList.contains('on')) return;
    dragging = true;
    moved = 0;
    startX = event.clientX;
    startRot = rot;
    ring.setPointerCapture(event.pointerId);
  });

  ring.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    // Порог отделяет перетаскивание от клика: без него любой клик дёргает кольцо.
    if (moved > DRAG_THRESHOLD) rot = startRot + dx * DRAG_FACTOR;
  });

  const release = (event) => {
    if (!dragging) return;
    dragging = false;
    if (ring.hasPointerCapture(event.pointerId)) ring.releasePointerCapture(event.pointerId);
  };

  ring.addEventListener('pointerup', release);
  ring.addEventListener('pointercancel', release);
}

/* ── Жизненный цикл ────────────────────────────────────────────────── */

function watchViewport() {
  const watcher = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      if (inView && !document.hidden) startFrames();
      else stopFrames();
    },
    { rootMargin: VIEWPORT_MARGIN },
  );
  watcher.observe(ring);
}

function watchResize() {
  let timer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(sync, RESIZE_DELAY);
  });
}

if (ring && ringIn && chips.length) {
  bindLegend();
  bindChips();
  bindDrag();
  watchViewport();
  watchResize();

  narrow.addEventListener('change', sync);
  reducedMotion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopFrames();
    else if (inView) startFrames();
  });

  sync();
}
