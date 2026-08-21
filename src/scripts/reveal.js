/**
 * Появление блоков при прокрутке — DESIGN-GUIDE §16.
 *
 * Здесь только факт «блок вошёл в кадр»: ступенька задержки живёт в CSS,
 * там же и весь переход. Наблюдатель отпускает элемент сразу после
 * появления — блок показывается один раз, а не мигает на каждом проходе.
 *
 * Предохранитель: если за 1200 мс наблюдатель не подал ни одного признака
 * жизни, страница показывается целиком. Первый же его вызов предохранитель
 * снимает — иначе он погасил бы анимацию на всей остальной странице
 * через секунду после загрузки.
 *
 * Отсчёт идёт только по видимому времени. Страницу часто открывают в фоновой
 * вкладке, а там браузер не рисует кадры и наблюдатель законно молчит:
 * предохранитель, заведённый сразу, сработал бы до того, как её увидели.
 *
 * Случай «JS выключен» закрыт в CSS: @media (scripting: none) в motion.css.
 */
import { reducedMotion } from './lib/motion.js';

const FUSE_MS = 1200;
const ROOT_MARGIN = '0px 0px -8% 0px';
const THRESHOLD = 0.06;

const items = document.querySelectorAll('.rv');

const revealAll = () => document.documentElement.classList.add('rvall');

let fuse = 0;

const armFuse = () => {
  fuse = setTimeout(revealAll, FUSE_MS);
};

function observe() {
  const watcher = new IntersectionObserver(
    (entries) => {
      clearTimeout(fuse);
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('in');
        watcher.unobserve(entry.target);
      }
    },
    { rootMargin: ROOT_MARGIN, threshold: THRESHOLD },
  );

  for (const item of items) watcher.observe(item);

  if (document.hidden) document.addEventListener('visibilitychange', armFuse, { once: true });
  else armFuse();
}

if (items.length) {
  const canWatch = 'IntersectionObserver' in window && !reducedMotion.matches;
  if (canWatch) observe();
  else revealAll();
}
