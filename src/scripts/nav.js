/**
 * Мобильная шторка разделов.
 *
 * Само меню работает без скрипта: это <details>, его открывает и закрывает
 * браузер. Здесь добавляется то, чего у <details> нет и что обязано быть
 * у полноэкранной шторки: Esc, блокировка прокрутки страницы, inert для
 * содержимого под шторкой и закрытие при возврате на десктопную ширину.
 */
const NARROW = '(max-width: 1020px)';

const holder = document.getElementById('menu');
const drawer = document.getElementById('mnav');

/** Всё, что шторка перекрывает: пока она открыта, клавиатуре там делать нечего. */
const covered = () => document.querySelectorAll('main, footer, .dock');

function setOpen(open) {
  document.body.classList.toggle('menu-open', open);
  for (const element of covered()) element.inert = open;
}

function close() {
  if (holder.open) holder.open = false;
}

if (holder && drawer) {
  holder.addEventListener('toggle', () => setOpen(holder.open));

  // Клик по пункту уводит на секцию — шторка обязана уйти сама.
  drawer.addEventListener('click', (event) => {
    if (event.target.closest('a')) close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !holder.open) return;
    close();
    holder.querySelector('summary').focus();
  });

  const narrow = window.matchMedia(NARROW);
  narrow.addEventListener('change', () => {
    if (!narrow.matches) close();
  });
}
