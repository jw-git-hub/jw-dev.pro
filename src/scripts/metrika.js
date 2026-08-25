/**
 * Яндекс.Метрика — отложенно, без вебвизора и только когда счётчик задан.
 *
 * Счётчик приходит из переменной сборки `PUBLIC_METRIKA_ID`. Пока её нет,
 * этот файл не делает ничего и ни одного запроса наружу не уходит — это
 * рабочее состояние, а не поломка: номер счётчика заводит владелец.
 *
 * Тег грузится после первого действия человека или, если действий нет,
 * в простое. Сразу — значит отдать чужому скрипту ту же полосу и то же
 * процессорное время, за которые борется первый экран.
 *
 * Вебвизор выключен намеренно: он записывает движение мыши и содержимое
 * полей, а это уже не статистика посещений. По той же причине в CSP нет
 * `frame-src` — без вебвизора кадр Метрике не нужен.
 */
const COUNTER = Number(import.meta.env.PUBLIC_METRIKA_ID ?? '');

const TAG_URL = 'https://mc.yandex.ru/metrika/tag.js';

/** Первое действие человека — им же меряется «страница кому-то нужна». */
const WAKE_EVENTS = ['pointerdown', 'keydown', 'scroll'];

/** Сколько ждать, если человек ничего не делает. Столько же ждёт и он сам. */
const IDLE_DELAY = 4000;

let started = false;

/**
 * Очередь вызовов до загрузки тега — как в штатном сниппете Метрики.
 *
 * `arguments`, а не остаточные параметры: тег разбирает очередь тем же
 * способом, что и у себя, и подменять форму записи здесь незачем.
 */
function queue() {
  window.ym =
    window.ym ||
    function () {
      (window.ym.a = window.ym.a || []).push(arguments);
    };
  window.ym.l = Date.now();
}

function start() {
  if (started) return;
  started = true;

  queue();

  const tag = document.createElement('script');
  tag.src = TAG_URL;
  tag.async = true;
  document.head.append(tag);

  window.ym(COUNTER, 'init', {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
  });
}

/*
 * Просьбу «не отслеживать» уважаем сами: Метрика её не читает. Настройка
 * стоит у человека в браузере, и обходить её счётчиком статистики — ровно
 * то, о чём его просили не делать.
 */
if (COUNTER && navigator.doNotTrack !== '1') {
  for (const event of WAKE_EVENTS) {
    addEventListener(event, start, { once: true, passive: true });
  }
  setTimeout(start, IDLE_DELAY);
}
