/**
 * Процесс: путь с бегущим импульсом — DESIGN-GUIDE §11.
 *
 * Один цикл — ровно 12 000 мс на весь путь. Импульс открывает градиентную
 * линию и по дороге зажигает шаги; клик по шагу или узлу фиксирует его
 * и останавливает цикл, кнопка автопрогона делает то же самое явно.
 *
 * Узлы раскладывает браузер: доли длины кривой в разметке не выразить,
 * поэтому `getPointAtLength` — единственный источник их координат.
 * До этого момента узлы спрятаны, класс `.ready` их показывает.
 *
 * При просьбе «меньше движения» цикла нет: горит первый шаг, линия
 * открыта целиком. Секция остаётся понятной, движения в ней не остаётся.
 */
import { reducedMotion } from './lib/motion.js';

const CYCLE_MS = 12000;
/** Шаг зажигается чуть раньше своей отметки, иначе подсветка отстаёт от глаза. */
const LEAD = 0.02;
const VIEWPORT_MARGIN = '140px';
const RESIZE_DELAY = 180;

const proc = document.querySelector('[data-proc]');
const line = proc?.querySelector('[data-pr-line]');
const nodes = proc ? [...proc.querySelectorAll('[data-pr-node]')] : [];
const steps = proc ? [...proc.querySelectorAll('[data-pr-step]')] : [];
const railDot = proc?.querySelector('[data-pr-dot]');
const toggle = document.querySelector('[data-pr-toggle]');
const state = document.querySelector('[data-pr-state]');

const marks = nodes.map((node) => Number(node.dataset.prNode));

let pathLength = 0;
let railHeight = 0;
let startedAt = 0;
let frameId = 0;
let active = -1;
let pinned = -1;
let auto = true;
let inView = false;

/**
 * Живая дорожка ровно одна: на широком экране импульс открывает кривую,
 * на узком SVG скрыт целиком и остаётся вертикальная рельса (process.css).
 * Нулевая высота у скрытой рельсы — она же и признак, какой сейчас режим:
 * писать в обе значило бы каждый кадр трогать то, чего нет на экране.
 */
function measureRail() {
  railHeight = railDot?.parentElement?.clientHeight ?? 0;
}

/** Раскладывает узлы по кривой. Без длины пути координат не существует. */
function placeNodes() {
  measureRail();
  pathLength = line.getTotalLength();
  nodes.forEach((node, index) => {
    const point = line.getPointAtLength(pathLength * marks[index]);
    node.setAttribute('transform', `translate(${point.x}, ${point.y})`);
  });
  line.style.setProperty('stroke-dasharray', `${pathLength} ${pathLength}`);
  proc.classList.add('ready');
}

function drawTo(progress) {
  if (railHeight) {
    // transform, а не top: положение точки ведёт кадр анимации, и layout-свойству
    // тут делать нечего — его пересчитывают шестьдесят раз в секунду впустую.
    railDot.style.setProperty('transform', `translateY(${(progress * railHeight).toFixed(1)}px)`);
    return;
  }

  line.style.setProperty('stroke-dashoffset', String(pathLength * (1 - progress)));
}

function setActive(index) {
  if (index === active) return;
  active = index;
  nodes.forEach((node, i) => node.classList.toggle('on', i === index));
  steps.forEach((step, i) => step.classList.toggle('on', i === index));
}

/** Индекс шага, до которого добрался импульс. */
function stepAt(progress) {
  let index = 0;
  for (let i = 0; i < marks.length; i += 1) {
    if (progress >= marks[i] - LEAD) index = i;
  }
  return index;
}

function frame(now) {
  if (!startedAt) startedAt = now;
  const progress = ((now - startedAt) % CYCLE_MS) / CYCLE_MS;
  drawTo(progress);
  setActive(stepAt(progress));
  frameId = requestAnimationFrame(frame);
}

function startCycle() {
  if (frameId || !auto || pinned >= 0 || reducedMotion.matches) return;
  frameId = requestAnimationFrame(frame);
}

function stopCycle() {
  cancelAnimationFrame(frameId);
  frameId = 0;
  // Отсчёт начнётся заново: без сброса цикл прыгает вперёд на время паузы.
  startedAt = 0;
}

/** Останавливает движение и показывает выбранный шаг открытым до его отметки. */
function showStep(index) {
  stopCycle();
  drawTo(marks[index]);
  setActive(index);
}

function pinStep(index) {
  pinned = pinned === index ? -1 : index;
  if (pinned >= 0) showStep(pinned);
  else if (inView) startCycle();
  steps.forEach((step, i) => step.setAttribute('aria-pressed', String(i === pinned)));
}

function setAuto(next) {
  auto = next;
  toggle.setAttribute('aria-pressed', String(auto));
  state.textContent = toggle.dataset[auto ? 'on' : 'off'] ?? state.textContent;
  if (auto && inView) startCycle();
  else stopCycle();
}

function bindControls() {
  steps.forEach((step, index) => step.addEventListener('click', () => pinStep(index)));
  nodes.forEach((node, index) => node.addEventListener('click', () => pinStep(index)));
  toggle.addEventListener('click', () => setAuto(!auto));
}

function watchViewport() {
  const watcher = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      if (inView && !document.hidden) startCycle();
      else stopCycle();
    },
    { rootMargin: VIEWPORT_MARGIN },
  );
  watcher.observe(proc);
}

function calm() {
  showStep(0);
  drawTo(1);
}

if (proc && line && railDot && toggle && state && nodes.length) {
  placeNodes();
  bindControls();
  /* Состояние покоя до первого кадра: линия в начале, горит первый шаг.
     Без этого секция за экраном показывает кривую без единого зажжённого шага. */
  drawTo(0);
  setActive(0);

  watchViewport();
  if (reducedMotion.matches) calm();

  reducedMotion.addEventListener('change', () => (reducedMotion.matches ? calm() : startCycle()));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopCycle();
    else if (inView) startCycle();
  });

  // Пересчёт координат по кривой — чтение layout'а, на каждый пиксель его не делают.
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(placeNodes, RESIZE_DELAY);
  });
}
