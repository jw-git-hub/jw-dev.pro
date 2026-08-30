/**
 * Согласие на аналитику: баннер и право счётчиков загрузиться.
 *
 * Здесь и только здесь решается, следить за посетителем или нет. Сами счётчики
 * о баннере не знают: они подписываются функцией `onAllow` и ждут. Второй
 * счётчик подключается так же и в этом файле не меняет ни строки.
 *
 * До ответа не грузится ничего — ни тега, ни пикселя, ни одного запроса
 * наружу. Отказ действует навсегда: баннер уходит и сам не возвращается,
 * вернуть его можно ссылкой «Куки» в подвале.
 *
 * Без JS баннера нет — и это не недоделка: без JS на сайте нет и счётчиков,
 * а вопрос, на который нечему ответить, — просто полоса поперёк экрана.
 */
import { readChoice, writeChoice, refusesTracking, ALLOW, DENY } from './lib/consent-store.js';

/**
 * Класс на `<html>`: вопрос на экране. Им же придерживается док — оба живут
 * внизу и налезли бы друг на друга (dock.css).
 */
const ASKING = 'asking';

const banner = document.getElementById('consent');
const accept = document.getElementById('consent-yes');
const decline = document.getElementById('consent-no');

/** Счётчики, ждущие разрешения. */
const waiting = [];

let choice = refusesTracking(navigator) ? DENY : readChoice(localStorage);

/**
 * Подписка счётчика. Вызовется, когда аналитика разрешена: сразу, если
 * разрешение уже дано в прошлый визит, или после нажатия «Принять».
 */
export function onAllow(start) {
  if (choice === ALLOW) start();
  else waiting.push(start);
}

function releaseCounters() {
  while (waiting.length) waiting.shift()();
}

/** Показывает вопрос. Фокус переносится только тогда, когда его сюда позвали. */
function show({ takeFocus } = {}) {
  banner.hidden = false;

  /* Класс — следующим кадром: у элемента, показанного в этом же кадре,
     переход не стартует, и баннер появился бы рывком на месте.
     Фокус — там же: до снятия visibility кнопка его не примет. */
  requestAnimationFrame(() => {
    document.documentElement.classList.add(ASKING);
    if (takeFocus) accept.focus();
  });
}

function hide() {
  document.documentElement.classList.remove(ASKING);
}

function answer(value) {
  const wasAllowed = choice === ALLOW;

  choice = value;
  writeChoice(localStorage, value);
  hide();

  if (value === ALLOW) {
    releaseCounters();
    return;
  }

  /* Отзыв согласия. Счётчик уже на странице, и снять его можно только
     перезагрузкой: загруженный тег живёт до конца жизни страницы и сам
     следит за кликами и переходами. «Отклонить», после которого слежка
     доработает до следующей ссылки, — это не отказ. */
  if (wasAllowed) location.reload();
}

/** Ссылка «Куки» в подвале — единственный способ передумать. */
function reopen(event) {
  event.preventDefault();
  show({ takeFocus: true });
}

if (banner) {
  accept.addEventListener('click', () => answer(ALLOW));
  decline.addEventListener('click', () => answer(DENY));

  for (const link of document.querySelectorAll('[data-consent]')) {
    link.addEventListener('click', reopen);
  }

  if (!choice) show();
}
