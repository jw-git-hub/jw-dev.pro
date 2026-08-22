/**
 * Лента подписки на журнал.
 *
 * В RSS уезжает только то, у чего есть своя страница: кейсы и статьи. Апдейт —
 * одна строка без адреса, и запись без ссылки в читалке выглядит поломанной.
 * Он остаётся в ленте на сайте, где ему и место.
 *
 * Файл один на оба языка: у RU и EN свои адреса `/rss.xml` и `/ru/rss.xml`,
 * но собираются они одинаково, и второй копии этой сборки быть не должно.
 */
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getJournal } from './journal';
import { useTranslations, type Locale } from '../i18n';

export async function journalFeed(locale: Locale, context: APIContext) {
  const t = useTranslations(locale);
  const entries = (await getJournal(locale)).filter((entry) => entry.href);
  const self = new URL(feedPath(locale), context.site).href;

  return rss({
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    title: t('rss.title'),
    description: t('rss.desc'),
    site: context.site!,
    trailingSlash: true,
    items: entries.map((entry) => ({
      title: entry.title,
      description: entry.line ?? entry.title,
      pubDate: entry.date,
      link: entry.href!,
    })),
    /* Ссылка на саму ленту: без неё валидатор W3C ругается на отсутствие self-reference. */
    customData:
      `<language>${locale === 'ru' ? 'ru-RU' : 'en-GB'}</language>` +
      `<atom:link href="${self}" rel="self" type="application/rss+xml"/>`,
  });
}

/** Адрес ленты для `<link rel="alternate">` и ссылки в архиве. */
export function feedPath(locale: Locale): string {
  return locale === 'ru' ? '/ru/rss.xml' : '/rss.xml';
}
