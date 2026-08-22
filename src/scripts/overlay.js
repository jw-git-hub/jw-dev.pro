/**
 * Оверлей кейса на главной — DESIGN-GUIDE §8, фаза 6.
 *
 * Разметку оверлей не собирает, а забирает у страницы разбора: `fetch`
 * по её адресу и `[data-case-article]` из ответа. Поэтому словарь кейсов
 * не уезжает в браузер, а показанное в оверлее совпадает со страницей
 * по определению — расходиться нечему.
 *
 * Диалог модальный (`showModal`), значит ловушка фокуса, Esc и `inert`
 * для страницы под ним достаются от браузера.
 *
 * Адрес меняется через History API: клик — `pushState`, «назад» — `popstate`.
 * Прямая ссылка при этом по-прежнему открывает саму страницу, а не главную.
 */
const dialog = document.querySelector('[data-overlay]');
const content = dialog?.querySelector('[data-overlay-content]');
const grid = document.querySelector('[data-grid]');

/** Разобранные страницы: «предыдущий/следующий» ходят по кругу, второй раз качать незачем. */
const cache = new Map();

/** Кто открыл оверлей: туда возвращается фокус после закрытия. */
let opener = null;

async function fetchArticle(href) {
  if (cache.has(href)) return cache.get(href);

  const response = await fetch(href);
  if (!response.ok) throw new Error(`${response.status} ${href}`);

  const parsed = new DOMParser().parseFromString(await response.text(), 'text/html');
  const article = parsed.querySelector('[data-case-article]');
  if (!article) throw new Error(`разбор не найден в ${href}`);

  cache.set(href, article);
  return article;
}

/**
 * На странице заголовок разбора — `h1`. В оверлее он попадает на главную,
 * где `h1` уже есть, поэтому понижается до `h2`: двух первых заголовков
 * на странице не бывает (правило 7).
 */
function demoteTitle(article) {
  const title = article.querySelector('[data-case-title]');
  if (!title || title.tagName === 'H2') return title?.textContent ?? '';

  const heading = document.createElement('h2');
  heading.className = title.className;
  heading.dataset.caseTitle = '';
  heading.textContent = title.textContent;
  title.replaceWith(heading);
  return heading.textContent;
}

async function show(href) {
  const article = (await fetchArticle(href)).cloneNode(true);
  const title = demoteTitle(article);

  content.replaceChildren(article);
  dialog.setAttribute('aria-label', title);

  if (!dialog.open) {
    dialog.showModal();
    document.body.classList.add('menu-open');
  }
  dialog.querySelector('.ovl-p').scrollTop = 0;
}

/** Открыть кейс и записать его в историю: адрес обязан совпасть с тем, что видно. */
async function open(href, opened) {
  opener = opened;
  try {
    await show(href);
    if (history.state?.ovl !== href) history.pushState({ ovl: href }, '', href);
  } catch {
    // Сеть отказала или разметка не та — уходим на страницу обычным переходом.
    window.location.href = href;
  }
}

/**
 * Закрытие целиком своё, а не по событию `close` диалога.
 *
 * Причина замерена 22.08.2026: в Chrome событие `close` после `dialog.close()`
 * не приходит вовсе — ни сразу, ни спустя секунду. Уборка, повешенная на него,
 * молча не выполняется, и страница остаётся с заблокированной прокруткой.
 * Поэтому все пути закрытия сходятся здесь.
 *
 * `rewind` отматывает историю: кнопка, Esc и клик мимо обязаны вернуть адрес
 * на главную, а вот `popstate` пришёл уже с нужным адресом — ему отматывать
 * нечего, иначе посетителя выкинет со страницы.
 */
function closeOverlay({ rewind = true } = {}) {
  if (!dialog.open) return;

  dialog.close();
  document.body.classList.remove('menu-open');
  content.replaceChildren();
  opener?.focus();
  opener = null;

  if (rewind && history.state?.ovl) history.back();
}

function onGridClick(event) {
  const link = event.target.closest('.case-go');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;

  event.preventDefault();
  open(link.getAttribute('href'), link);
}

/** «Предыдущий» и «следующий» внутри оверлея остаются в оверлее. */
function onDialogClick(event) {
  // Клик мимо окна попадает в сам диалог: это его подложка.
  if (event.target === dialog) {
    closeOverlay();
    return;
  }

  const link = event.target.closest('.nvb');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey) return;

  event.preventDefault();
  open(link.getAttribute('href'), opener);
}

function setup() {
  grid.addEventListener('click', onGridClick);
  dialog.addEventListener('click', onDialogClick);

  dialog.querySelector('[data-overlay-close]').addEventListener('click', () => closeOverlay());

  // Esc перехватываем сами: иначе браузер закроет диалог мимо уборки и истории.
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeOverlay();
  });

  // Запрос на закрытие помимо клавиатуры — жест «назад» на Android, например.
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeOverlay();
  });

  window.addEventListener('popstate', () => {
    const href = history.state?.ovl;
    if (href) show(href).catch(() => closeOverlay({ rewind: false }));
    else closeOverlay({ rewind: false });
  });
}

if (dialog && content && grid) setup();
