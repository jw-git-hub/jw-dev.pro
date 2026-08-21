/**
 * Состояние шапки при прокрутке (DESIGN-GUIDE §13): после 18px она ужимается
 * до 60px и стекло становится плотнее. Без этого шапка над контентом
 * читается как часть страницы, а не как её рамка.
 */
const STUCK_AT = 18;

const header = document.getElementById('hdr');

if (header) {
  const sync = () => header.classList.toggle('stuck', window.scrollY > STUCK_AT);

  sync();
  window.addEventListener('scroll', sync, { passive: true });
}
