/**
 * Акцент секции — DESIGN-GUIDE §2.
 *
 * Каждая секция объявляет свой цвет атрибутом `data-acc`. Здесь определяется,
 * какая секция сейчас читается, и её имя переносится на <html>: пары цветов
 * лежат в accent.css, поэтому в скрипте нет ни одного значения цвета.
 * Плавность перехода даёт CSS — токены зарегистрированы через @property.
 *
 * Зонд — на 34% высоты экрана. По центру акцент опаздывает на треть секции,
 * по верхней кромке меняется до того, как секцию начали читать.
 */
import { onScroll } from './lib/scroll.js';
import { setTint } from './graph.js';

const PROBE = 0.34;
const RESIZE_DELAY = 160;

const sections = [...document.querySelectorAll('section[data-acc]')];
const navLinks = [...document.querySelectorAll('.nav a')];

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

function markNav(id) {
  for (const link of navLinks) link.classList.toggle('cur', Boolean(id) && link.hash === `#${id}`);
}

function apply(section) {
  if (section === current) return;
  current = section;

  document.documentElement.dataset.acc = section.dataset.acc;
  setTint(section.dataset.acc);
  markNav(section.id);
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
