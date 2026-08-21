/**
 * Пункты навигации. Один список на шапку и мобильное меню: разъехавшиеся
 * копии — классический способ показать посетителю разные сайты на разных
 * ширинах экрана.
 *
 * `id` — якорь секции на главной, `key` — ключ перевода.
 */
export interface NavItem {
  key: string;
  id: string;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'nav.work', id: 'work' },
  { key: 'nav.services', id: 'services' },
  { key: 'nav.stack', id: 'stack' },
  { key: 'nav.process', id: 'process' },
  { key: 'nav.about', id: 'about' },
  { key: 'nav.contact', id: 'contact' },
];
