/**
 * Пункты навигации. Один список на шапку и мобильное меню: разъехавшиеся
 * копии — классический способ показать посетителю разные сайты на разных
 * ширинах экрана.
 *
 * Пункт знает свой адрес сам, а не отдаёт якорь наружу. Раньше это был только
 * якорь главной, теперь два пункта — «Работы» и «Журнал» — ведут на свои
 * страницы: с внутренней страницы якорь `#work` не ведёт никуда, а витрина
 * и архив там нужны не меньше, чем с главной.
 *
 * Порядок повторяет порядок секций главной, включая «Журнал» на своём месте
 * между «Обо мне» и «Контактами»: меню не должно спорить со страницей.
 */
import type { Locale } from '../i18n';
import { sectionPath } from '../i18n';
import { workPath } from '../lib/cases';
import { logPath } from '../lib/journal';

export interface NavItem {
  /** Ключ перевода подписи. */
  key: string;
  /** Куда ведёт пункт на этом языке. */
  href: (locale: Locale) => string;
}

/** Якорь секции главной: с внутренней страницы это переход на главную и вниз. */
const section = (id: string) => (locale: Locale) => sectionPath(locale, id);

export const NAV_ITEMS: NavItem[] = [
  { key: 'nav.work', href: workPath },
  { key: 'nav.services', href: section('services') },
  { key: 'nav.stack', href: section('stack') },
  { key: 'nav.process', href: section('process') },
  { key: 'nav.about', href: section('about') },
  { key: 'nav.log', href: logPath },
  { key: 'nav.contact', href: section('contact') },
];
