/**
 * Нижний док: кольцо прогресса, подпись раздела и контекстное действие
 * (DESIGN-GUIDE §14).
 *
 * Док появляется, когда прокручено больше половины экрана, прячется при
 * движении вниз и возвращается при движении вверх. Гистерезис обязателен:
 * без накопителя док дёргался бы на каждом микродвижении колеса.
 *
 * В конце страницы он показан всегда — там находятся контакты, и прятать
 * кнопку «написать» ровно в этот момент бессмысленно.
 *
 * Действие ровно одно на секцию. Все четыре пришли из разметки с переведёнными
 * подписями, здесь только переключается видимое: подставлять текст значило бы
 * увезти в браузер словарь.
 */
import { onScroll } from './lib/scroll.js';
import { onSection } from './lib/section.js';

const SHOW_FROM = 0.55; // доля высоты экрана, после которой док появляется
const HIDE_ACC = 110; // накоплено вниз — прячем
const SHOW_ACC = -60; // накоплено вверх — показываем
const RING = 88; // длина окружности кольца, r = 14
const AT_END = 0.985;
const DEFAULT_CTX = 'work';

const dock = document.getElementById('dock');
const arc = document.getElementById('dock-arc');
const percent = document.getElementById('dock-pct');
const label = document.getElementById('dock-sec');
const actions = [...document.querySelectorAll('.dock-ctx')];

let lastY = window.scrollY;
let acc = 0;
let scrollMax = 0;
let shownPercent = -1;

/**
 * Высота документа меряется по событию, а не в кадре прокрутки.
 * scrollHeight заставляет браузер разложить страницу целиком, и в кадре он
 * читается уже после того, как шапка и акцент секции записали свои классы, —
 * то есть каждый кадр прокрутки оплачивает полный проход стилей и раскладки
 * ради числа, которое за визит меняется несколько раз.
 *
 * Наблюдатель на body ловит и появление блоков при прокрутке, и фильтрацию
 * кейсов; window.resize — смену высоты самого экрана.
 */
function measureScroll() {
  scrollMax = document.documentElement.scrollHeight - window.innerHeight;
}

/** Доля прочитанного: 0 — верх страницы, 1 — конец. */
function readProgress(scrollY) {
  return scrollMax > 0 ? Math.min(scrollY / scrollMax, 1) : 0;
}

function paintRing(progress) {
  arc.style.strokeDashoffset = String(RING * (1 - progress));

  // Подпись меняется сто раз на всю страницу, а не шестьдесят раз в секунду:
  // запись в текстовый узел — это перерисовка, даже когда текст тот же.
  const nowPercent = Math.round(progress * 100);
  if (nowPercent === shownPercent) return;

  shownPercent = nowPercent;
  percent.textContent = `${nowPercent}%`;
}

/** Накопитель сбрасывается при смене направления — иначе док залипает. */
function accumulate(delta) {
  acc = Math.sign(delta) === Math.sign(acc) ? acc + delta : delta;
  return acc;
}

function syncVisibility(scrollY, progress) {
  dock.classList.toggle('on', scrollY > window.innerHeight * SHOW_FROM);

  const moved = accumulate(scrollY - lastY);
  lastY = scrollY;

  if (progress > AT_END || moved < SHOW_ACC) dock.classList.remove('hid');
  else if (moved > HIDE_ACC) dock.classList.add('hid');
}

/** Секция может попросить действие, которого в разметке нет, — тогда действует общее. */
function showAction(kind) {
  const known = actions.some((action) => action.dataset.ctx === kind);
  const shown = known ? kind : DEFAULT_CTX;
  for (const action of actions) action.hidden = action.dataset.ctx !== shown;
}

if (dock && arc && percent) {
  measureScroll();
  new ResizeObserver(measureScroll).observe(document.body);
  window.addEventListener('resize', measureScroll, { passive: true });

  onScroll((scrollY) => {
    const progress = readProgress(scrollY);
    paintRing(progress);
    syncVisibility(scrollY, progress);
  });
}

if (label && actions.length) {
  onSection((section) => {
    if (section.dataset.name) label.textContent = section.dataset.name;
    showAction(section.dataset.dock ?? DEFAULT_CTX);
  });
}
