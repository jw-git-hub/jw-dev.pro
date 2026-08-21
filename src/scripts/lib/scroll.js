/**
 * Подписка на прокрутку не чаще кадра.
 *
 * Событие scroll приходит десятками между отрисовками, а всё, что от него
 * зависит, — геометрия. Без гейта обработчик считает одно и то же по три
 * раза на кадр, и каждый чтением layout'а тормозит браузер.
 *
 * Обработчик вызывается сразу при подписке: страница может открыться
 * не с нуля — по якорю или восстановленной позицией.
 */
export function onScroll(handler) {
  let queued = false;

  const run = () => {
    queued = false;
    handler(window.scrollY);
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(run);
  };

  handler(window.scrollY);
  window.addEventListener('scroll', schedule, { passive: true });
}
