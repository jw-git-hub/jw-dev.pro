/**
 * Акцент секции — DESIGN-GUIDE §2.
 *
 * Каждая секция объявляет свой цвет атрибутом `data-acc`. Здесь имя цвета
 * переносится на <html>: пары значений лежат в accent.css, поэтому в скрипте
 * нет ни одного цвета. Плавность перехода даёт CSS — токены зарегистрированы
 * через @property.
 *
 * Какая секция сейчас читается, решает общий зонд из lib/section.js: тот же
 * ответ нужен подписи в доке, и двух замеров у одного вопроса быть не должно.
 */
import { onSection } from './lib/section.js';
import { setTint } from './graph.js';

const navLinks = [...document.querySelectorAll('.nav a')];

function markNav(id) {
  for (const link of navLinks) link.classList.toggle('cur', Boolean(id) && link.hash === `#${id}`);
}

onSection((section) => {
  document.documentElement.dataset.acc = section.dataset.acc;
  setTint(section.dataset.acc);
  markNav(section.id);
});
