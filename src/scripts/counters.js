/**
 * Счётчики чисел статистики — DESIGN-GUIDE §8, тайминги §16.
 *
 * Финальное значение стоит в разметке: без JS число обязано быть верным.
 * Скрипт отматывает его назад и досчитывает, когда карточка входит в кадр.
 *
 * Отматывается только то, чего сейчас не видно. Карточка появляется раньше,
 * чем стартует счёт (`reveal.js` ловит её на 6% видимости, счётчик — на 40%),
 * и без этого правила посетитель успевает прочитать «7», а потом видит,
 * как оно прыгает в ноль и считается заново.
 *
 * Диапазон считается от своей нижней границы (`data-from`), а не от нуля:
 * «94–98», отсчитанное с нуля, показывает несуществующие «94–37».
 *
 * Страховка обязательна. В фоновой вкладке кадры не приходят, и счёт,
 * начатый перед переключением, замер бы на середине — таймер ставит
 * финальное значение независимо от кадров.
 */
import { reducedMotion } from './lib/motion.js';

const DURATION = 1100;
const SAFETY = 1400;
const THRESHOLD = 0.4;
const EASE_POWER = 3;

const counters = [...document.querySelectorAll('.stat .v')];

/** Меняется только само число: приставка и знак процента остаются на месте. */
function textOf(counter, value) {
  const { pre = '', suf = '' } = counter.dataset;
  return `${pre}${value}${suf}`;
}

const finish = (counter) => {
  counter.textContent = textOf(counter, counter.dataset.num);
};

const rewind = (counter) => {
  counter.textContent = textOf(counter, counter.dataset.from ?? 0);
};

const unseen = (counter) => counter.getBoundingClientRect().top > window.innerHeight;

/** easeOutCubic: разгон сразу, мягкая остановка — число не доползает. */
const ease = (progress) => 1 - (1 - progress) ** EASE_POWER;

function run(counter) {
  const from = Number(counter.dataset.from ?? 0);
  const to = Number(counter.dataset.num);
  const safety = setTimeout(() => finish(counter), SAFETY);
  let started = 0;

  function step(time) {
    started ||= time;
    const progress = Math.min(1, (time - started) / DURATION);
    counter.textContent = textOf(counter, Math.round(from + (to - from) * ease(progress)));

    if (progress < 1) requestAnimationFrame(step);
    else clearTimeout(safety);
  }

  requestAnimationFrame(step);
}

function watch() {
  const watcher = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        run(entry.target);
        watcher.unobserve(entry.target);
      }
    },
    { threshold: THRESHOLD },
  );

  for (const counter of counters) {
    if (!unseen(counter)) continue;
    rewind(counter);
    watcher.observe(counter);
  }
}

/**
 * Ничего не делаем ни при reduced-motion, ни без наблюдателя: верное число
 * уже в разметке, а анимация — украшение, ради которого нельзя рисковать
 * цифрой. По той же причине здесь нет второй страховки из §8: глобальный
 * таймер макета проставлял финал и тем, кого ещё не видели, — а это ровно
 * тот прыжок назад, от которого избавляет отмотка по видимости.
 */
if (counters.length && !reducedMotion.matches && 'IntersectionObserver' in window) watch();
