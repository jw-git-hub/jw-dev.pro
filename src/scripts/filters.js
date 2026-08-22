/**
 * Фильтр сетки кейсов и живой счётчик — DESIGN-GUIDE §8.
 *
 * Группа приезжает с атрибутом `hidden` и показывается только после того,
 * как отработал скрипт: фильтровать без него нечем, а кнопки, которые ничего
 * не делают, хуже их отсутствия. Без JS посетитель видит все кейсы разом.
 */
import { wireFilter, ALL } from './lib/filter.js';

const group = document.querySelector('[data-filters]');
const grid = document.querySelector('[data-grid]');

function setup() {
  const cards = [...grid.querySelectorAll('.case')];
  const counter = group.querySelector('[data-fcount]');

  wireFilter(
    group,
    cards,
    (card, filter) => filter === ALL || card.dataset.cat.split(' ').includes(filter),
    (shown) => {
      counter.textContent = `${shown} / ${cards.length}`;
    },
  );
}

if (group && grid) setup();
