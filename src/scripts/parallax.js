/**
 * Параллакс сцены героя — DESIGN-GUIDE §10.
 *
 * Три плана уходят на разную глубину, поэтому и смещаются на разное
 * расстояние: сцена целиком слабее всех, окна — по своей амплитуде
 * `data-amp`, HUD-пилюли сильнее окон, каустики — по своему множителю.
 * Прокрутка добавляет к этому подъём: сцена уезжает вверх чуть быстрее
 * страницы, и первый экран получает глубину без единого лишнего пикселя.
 *
 * Покадрово пишутся только `--dx/--dy/--rx/--ry`; сами transform собраны
 * в hero.css. Своего цикла здесь нет — положение курсора приходит уже
 * сглаженным из pointer.js, иначе два одинаковых сглаживания разъезжаются.
 *
 * Ниже 901px параллакса не бывает: там сцена схлопнута в колонку и
 * `transform: none` (hero.css) — двигать нечего.
 */
import { onPlane } from './pointer.js';
import { onScroll } from './lib/scroll.js';
import { reducedMotion } from './lib/motion.js';

/** Пара к `max-width: 900px` в hero.css. */
const WIDE = '(min-width: 901px)';

/* Множители §10. Все — доли от полуэкрана: plane.x = 1 у правого края. */
const STAGE_SHIFT_X = 10;
const STAGE_SHIFT_Y = 6;
const STAGE_LIFT = 0.055; // сколько сцена набирает на пиксель прокрутки
const STAGE_TILT_X = -2.2;
const STAGE_TILT_Y = 2.6;

const WINDOW_SHIFT_X = 1.7; // к амплитуде окна
const WINDOW_SHIFT_Y = 1.3;
const WINDOW_TILT = 7;

const HUD_SHIFT_X = 2.1;
const HUD_SHIFT_Y = 1.5;
const HUD_LIFT = 0.02;

const CAUSTIC_SHIFT_X = 14;
const CAUSTIC_SHIFT_Y = 9;

/** Всё, что двигается покадрово: пригодится, когда движение придётся снять. */
const MOVING = '.stage-in, .win, .hud, .caustic';
const FRAME_PROPS = ['--dx', '--dy', '--rx', '--ry'];

/** Запасные значения на случай, если атрибут потеряется: NaN в CSS убивает весь transform. */
const DEFAULT_AMP = 8;
const DEFAULT_FACTOR = 1;

const stage = document.querySelector('.stage');
const layer = document.querySelector('.stage-in');

/** Размах — свойство элемента, а не кадра: читаем один раз при загрузке. */
const withAmp = (selector, attribute, fallback) =>
  [...document.querySelectorAll(selector)].map((element) => ({
    element,
    amp: Number(element.dataset[attribute]) || fallback,
  }));

const panes = withAmp('.win', 'amp', DEFAULT_AMP);
const pills = withAmp('.hud', 'amp', DEFAULT_AMP);
const caustics = withAmp('.caustic', 'par', DEFAULT_FACTOR);

const wide = window.matchMedia(WIDE);

const plane = { x: 0, y: 0 };
let scrolled = 0;
let onScreen = true;
let moved = false;

const active = () => wide.matches && !reducedMotion.matches;

function shift(element, x, y) {
  element.style.setProperty('--dx', `${x.toFixed(1)}px`);
  element.style.setProperty('--dy', `${y.toFixed(1)}px`);
}

function turn(element, x, y) {
  element.style.setProperty('--rx', `${x.toFixed(2)}deg`);
  element.style.setProperty('--ry', `${y.toFixed(2)}deg`);
}

function paintLayer() {
  shift(layer, plane.x * STAGE_SHIFT_X, plane.y * STAGE_SHIFT_Y - scrolled * STAGE_LIFT);
  turn(layer, plane.y * STAGE_TILT_X, plane.x * STAGE_TILT_Y);
}

/** Окна поворачиваются все одинаково, а разъезжаются каждое по своей амплитуде. */
function paintPanes() {
  for (const { element, amp } of panes) {
    shift(element, plane.x * amp * WINDOW_SHIFT_X, plane.y * amp * WINDOW_SHIFT_Y);
    turn(element, plane.y * -WINDOW_TILT, plane.x * WINDOW_TILT);
  }
}

function paintPills() {
  for (const { element, amp } of pills) {
    shift(element, plane.x * amp * HUD_SHIFT_X, plane.y * amp * HUD_SHIFT_Y - scrolled * HUD_LIFT);
  }
}

function paintCaustics() {
  for (const { element, amp } of caustics) {
    shift(element, plane.x * amp * CAUSTIC_SHIFT_X, plane.y * amp * CAUSTIC_SHIFT_Y);
  }
}

/**
 * Снять покадровые свойства. Обязательно: движение выключают на ходу —
 * сменой ширины окна или системной настройкой, — и без этого слои
 * замирают в последнем положении курсора вместо покоя.
 */
function reset() {
  for (const element of document.querySelectorAll(MOVING)) {
    for (const property of FRAME_PROPS) element.style.removeProperty(property);
  }
}

function paint() {
  if (!active()) {
    if (moved) reset();
    moved = false;
    return;
  }
  if (!onScreen) return;

  paintLayer();
  paintPanes();
  paintPills();
  paintCaustics();
  moved = true;
}

/**
 * Сцена ушла с экрана — считать нечего. Прокрутка идёт по всей странице,
 * а сцена живёт только в первом экране.
 */
function watch() {
  if (!('IntersectionObserver' in window)) return;

  const watcher = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    paint();
  });
  watcher.observe(stage);
}

if (stage && layer) {
  watch();
  onScroll((y) => {
    scrolled = y;
    paint();
  });
  onPlane((x, y) => {
    plane.x = x;
    plane.y = y;
    paint();
  });

  // Ширину окна и настройку движения меняют, не перезагружая страницу.
  wide.addEventListener('change', paint);
  reducedMotion.addEventListener('change', paint);
}
