import ru from './ru.json';
import en from './en.json';

export const LOCALES = ['en', 'ru'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/**
 * Русский — источник истины, английский переводится с него.
 * Поэтому ключ, которого нет в EN, отдаёт русский текст, а не имя ключа:
 * лучше показать непереведённую строку, чем «stub.title».
 */
const DICT: Record<Locale, Record<string, string>> = { ru, en };

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Определяет язык по адресу страницы: «/ru/...» — русский, всё остальное — английский. */
export function localeFromUrl(url: URL): Locale {
  const first = url.pathname.split('/').filter(Boolean)[0];
  return first && isLocale(first) ? first : DEFAULT_LOCALE;
}

/** Возвращает строку интерфейса. Подставляется на сборке, в браузер словарь не уезжает. */
export function useTranslations(locale: Locale) {
  return function t(key: string): string {
    return DICT[locale][key] ?? DICT.ru[key] ?? key;
  };
}

/** Тот же путь на другом языке. Нужен переключателю языка и тегам hreflang. */
export function localizePath(pathname: string, target: Locale): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] && isLocale(segments[0])) segments.shift();
  const rest = segments.join('/');
  const prefix = target === DEFAULT_LOCALE ? '' : `/${target}`;
  return `${prefix}/${rest}${rest ? '/' : ''}`;
}

/** Адрес главной для языка: «/» — английский, «/ru/» — русский. */
export function homePath(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '/' : `/${locale}/`;
}

/**
 * Ссылка на секцию главной. Сайт многостраничный, поэтому «#work» в шапке
 * внутренней страницы никуда не ведёт: нужен полный путь до главной.
 */
export function sectionPath(locale: Locale, id: string): string {
  return `${homePath(locale)}#${id}`;
}
