/**
 * Манифест сайта: имя, цвета и иконки для ярлыка на домашнем экране.
 *
 * Файл один на оба языка по сборке, но адресов у него два — `/site.webmanifest`
 * и `/ru/site.webmanifest`: имя и описание переводятся, а `<link rel="manifest">`
 * у страницы может быть только один.
 *
 * `display: browser` — намеренно. Сайт не приложение: service worker'а нет,
 * офлайна нет, и открывать его отдельным окном без адресной строки значило бы
 * обещать приложение там, где его нет.
 */
import { iconPath } from './icons';
import { backgroundColor } from './palette';
import { SITE } from '../data/site';
import { homePath, useTranslations, type Locale } from '../i18n';

/** Иконки для домашнего экрана: обычная и та, что переживёт обрезку под маску. */
const MANIFEST_ICONS = [
  { name: 'icon-192', sizes: '192x192', purpose: 'any' },
  { name: 'icon-512', sizes: '512x512', purpose: 'any' },
  { name: 'maskable-512', sizes: '512x512', purpose: 'maskable' },
];

export async function webmanifest(locale: Locale): Promise<Response> {
  const t = useTranslations(locale);
  const background = await backgroundColor();

  const manifest = {
    name: t('site.title'),
    short_name: SITE.name,
    description: t('site.description'),
    lang: locale,
    start_url: homePath(locale),
    scope: '/',
    display: 'browser',
    background_color: background,
    theme_color: background,
    icons: MANIFEST_ICONS.map((icon) => ({
      src: iconPath(icon.name),
      sizes: icon.sizes,
      type: 'image/png',
      purpose: icon.purpose,
    })),
  };

  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json' },
  });
}

/** Адрес манифеста для `<link rel="manifest">`. */
export function manifestPath(locale: Locale): string {
  return locale === 'ru' ? '/ru/site.webmanifest' : '/site.webmanifest';
}
