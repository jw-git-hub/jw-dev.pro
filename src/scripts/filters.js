/**
 * Фильтр сетки кейсов и живой счётчик — DESIGN-GUIDE §8.
 *
 * Группа приезжает с атрибутом `hidden` и показывается только здесь:
 * фильтровать без скрипта нечем, а кнопки, которые ничего не делают,
 * хуже их отсутствия. Без JS посетитель видит все кейсы разом.
 */
const group = document.querySelector('[data-filters]');
const grid = document.querySelector('[data-grid]');

/** Снятый фильтр: показываем всё. */
const ALL = 'all';

function setup() {
  const cards = [...grid.querySelectorAll('.case')];
  const counter = group.querySelector('[data-fcount]');
  const buttons = [...group.querySelectorAll('.fbtn')];

  const apply = (filter) => {
    let shown = 0;
    for (const card of cards) {
      const match = filter === ALL || card.dataset.cat.split(' ').includes(filter);

      // `hidden`, а не `display:none` классом: карточка уходит и из потока, и из фокуса.
      card.hidden = !match;
      if (match) shown += 1;
    }
    counter.textContent = `${shown} / ${cards.length}`;
  };

  group.addEventListener('click', (event) => {
    const button = event.target.closest('.fbtn');
    if (!button) return;

    for (const item of buttons) item.setAttribute('aria-pressed', String(item === button));
    apply(button.dataset.f);
  });

  group.hidden = false;
}

if (group && grid) setup();
