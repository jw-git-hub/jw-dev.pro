/**
 * Группа фильтров: одно нажатое состояние и скрытие того, что не подошло.
 *
 * Одна и та же механика у сетки кейсов и у табов архива — отличаются только
 * признак совпадения и то, что показывать после. Разъехаться этим двум
 * поведениям нельзя: фильтр, который в одном разделе прячет через `hidden`,
 * а в другом — классом, однажды перестанет убирать элемент из фокуса.
 */

/** Снятый фильтр: показываем всё. */
export const ALL = 'all';

/**
 * @param {HTMLElement} group  контейнер кнопок `.fbtn`, приезжает с `hidden`
 * @param {HTMLElement[]} items  что фильтруем
 * @param {(item: HTMLElement, filter: string) => boolean} match
 * @param {(shown: number) => void} onApply  что делать со счётчиком или пустотой
 */
export function wireFilter(group, items, match, onApply) {
  const buttons = [...group.querySelectorAll('.fbtn')];

  const apply = (filter) => {
    let shown = 0;
    for (const item of items) {
      const ok = match(item, filter);

      // `hidden`, а не `display:none` классом: элемент уходит и из потока, и из фокуса.
      item.hidden = !ok;
      if (ok) shown += 1;
    }
    onApply(shown);
  };

  group.addEventListener('click', (event) => {
    const button = event.target.closest('.fbtn');
    if (!button) return;

    for (const item of buttons) item.setAttribute('aria-pressed', String(item === button));
    apply(button.dataset.f);
  });

  // Кнопки показываются только здесь: без скрипта фильтровать нечем.
  group.hidden = false;
}
