/**
 * Секция, которую сейчас читают.
 *
 * Зонд один на всю страницу. Акцент фона и подпись «сейчас читаете» обязаны
 * говорить об одной и той же секции, а два независимых замера рано или поздно
 * разъезжаются: достаточно чуть разного порога, и подпись уже про соседа.
 *
 * Зонд — на 34% высоты экрана (DESIGN-GUIDE §2). По центру акцент опаздывает
 * на треть секции, по верхней кромке меняется до того, как секцию начали читать.
 */
import { onScroll } from './scroll.js';

const PROBE = 0.34;
const RESIZE_DELAY = 160;

const sections = [...document.querySelectorAll('section[data-acc]')];
const handlers = [];

let tops = [];
let current = null;
let resizeTimer = 0;

const measure = () => {
  tops = sections.map((section) => section.getBoundingClientRect().top + window.scrollY);
};

/** Текущая — последняя секция, чей верх уже прошёл зонд. */
function currentIndex(scrollY) {
  const probe = scrollY + window.innerHeight * PROBE;
  let index = 0;
  for (let i = 0; i < tops.length; i++) {
    if (tops[i] <= probe) index = i;
  }
  return index;
}

function apply(section) {
  if (section === current) return;
  current = section;
  for (const handler of handlers) handler(section);
}

/**
 * Подписка на смену секции. Обработчик вызывается сразу, если секция уже
 * определена: модуль стартует раньше подписчиков, и без этого первый
 * из них узнал бы о текущей секции только со следующей прокруткой.
 */
export function onSection(handler) {
  handlers.push(handler);
  if (current) handler(current);
}

if (sections.length) {
  measure();
  onScroll((scrollY) => apply(sections[currentIndex(scrollY)]));

  window.addEventListener(
    'resize',
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measure, RESIZE_DELAY);
    },
    { passive: true },
  );
}
