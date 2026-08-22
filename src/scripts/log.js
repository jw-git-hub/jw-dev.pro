/**
 * Табы архива журнала — DESIGN-GUIDE §15.
 *
 * Счётчики у кнопок посчитаны на сборке и не меняются: они показывают, сколько
 * записей каждого типа есть вообще, а не сколько видно сейчас. Меняется только
 * состояние «под этим фильтром пусто» — оно и есть ответ на нажатие.
 */
import { wireFilter, ALL } from './lib/filter.js';

const group = document.querySelector('[data-log-tabs]');
const feed = document.querySelector('[data-log-feed]');
const empty = document.querySelector('[data-log-empty]');

function setup() {
  const rows = [...feed.querySelectorAll('.jrow')];

  wireFilter(
    group,
    rows,
    (row, filter) => filter === ALL || row.dataset.jk === filter,
    (shown) => {
      if (empty) empty.hidden = shown > 0;
    },
  );
}

if (group && feed) setup();
