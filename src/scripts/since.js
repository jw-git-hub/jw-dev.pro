/**
 * «Последняя запись — три дня назад».
 *
 * В разметке стоит абсолютная дата: она остаётся верной сколько угодно долго
 * после сборки, а относительную можно посчитать только в момент чтения.
 * Поэтому считаем в браузере и подменяем текст; без JS остаётся дата — тот же
 * факт другими словами, а не поломка.
 *
 * Склонения отдаём `Intl`: «3 дня назад», «21 день назад» и «вчера» — это
 * три разных правила русского языка, и своего словаря для них заводить не надо.
 */
const MS_IN_DAY = 86_400_000;

const node = document.querySelector('[data-since]');

/** Целых суток между датой записи и сегодняшним днём читателя. */
function daysSince(iso) {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;

  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today - then) / MS_IN_DAY));
}

function show() {
  const days = daysSince(node.dateTime);
  if (days === null) return;

  const format = new Intl.RelativeTimeFormat(document.documentElement.lang, { numeric: 'auto' });
  node.textContent = format.format(-days, 'day');
}

if (node) show();
