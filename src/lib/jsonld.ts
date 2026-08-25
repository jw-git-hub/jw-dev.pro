/**
 * Граф schema.org — машиночитаемая версия того же, что написано на странице.
 *
 * Правило проекта «цифры только измеренные» действует и здесь, поэтому в графе
 * нет ни `aggregateRating`, ни `review`, ни `priceRange`: отзывов в письменном
 * виде нет, а стоимость называется после разбора задачи.
 *
 * Отступление от плана: услуги описаны типом `Service`, а не
 * `ProfessionalService`. Последний — подтип `LocalBusiness`, то есть заявка
 * на заведение с адресом, а владелец решил 25.08.2026, что города на сайте
 * нет нигде. Объявлять место, которого не показываем, — это ровно тот случай,
 * когда разметка расходится со страницей.
 */
import type { CaseView } from './cases';
import type { NoteView } from './journal';
import { SITE } from '../data/site';
import { SERVICES } from '../data/services';
import { ogPath } from './og';
import { homePath, sectionPath, useTranslations, type Locale } from '../i18n';

/** Узел графа. Схема — это данные, а не типы проекта: описывать её интерфейсами нечего. */
type Node = Record<string, unknown>;

/**
 * Адрес сайта из конфига. `undefined` в типе — потому что `Astro.site`
 * в Astro необязателен; в этом проекте он задан, и подставлять запасной
 * домен здесь значило бы держать его во втором месте после `astro.config.mjs`.
 */
type Site = URL | undefined;

const PERSON = '#person';
const WEBSITE = '#website';

/** Абсолютный адрес: относительные ссылки в графе поисковик разворачивать не обязан. */
const absolute = (path: string, site: Site) => new URL(path, site).href;

/** Ссылка на узел, который уже описан в этом же графе. */
const ref = (id: string) => ({ '@id': id });

/**
 * Человек — главный узел графа: сайт-визитка описывает исполнителя,
 * а не организацию. `@id` без пути общий для всех страниц: это один человек,
 * в каком бы разделе он ни упоминался.
 */
function personNode(locale: Locale, site: Site): Node {
  const t = useTranslations(locale);
  return {
    '@type': 'Person',
    '@id': absolute(PERSON, site),
    name: 'jw',
    jobTitle: t('schema.job'),
    description: t('about.p'),
    url: absolute(homePath(locale), site),
    knowsLanguage: ['ru', 'en'],
    sameAs: [SITE.github, SITE.telegram],
  };
}

function websiteNode(locale: Locale, site: Site): Node {
  const t = useTranslations(locale);
  return {
    '@type': 'WebSite',
    '@id': absolute(WEBSITE, site),
    name: SITE.name,
    description: t('site.description'),
    url: absolute(homePath(locale), site),
    inLanguage: locale,
    publisher: ref(absolute(PERSON, site)),
  };
}

/**
 * Три направления с главной. Цены нет намеренно — её называют после разбора.
 *
 * Языка у узла тоже нет: `inLanguage` и `availableLanguage` в словаре `Service`
 * не значатся (сверено со schema.org/Service 25.08.2026), а свойство не из типа
 * валидатор отметит замечанием. Язык страницы сообщает узел `WebSite`.
 */
function serviceNodes(locale: Locale, site: Site): Node[] {
  const t = useTranslations(locale);
  return SERVICES.map((service) => ({
    '@type': 'Service',
    name: t(`${service.key}.t`),
    description: t(`${service.key}.d`),
    provider: ref(absolute(PERSON, site)),
  }));
}

/** Хлебные крошки: те же переходы, что и ссылка «назад» на самой странице. */
function breadcrumbNode(trail: { name: string; path: string }[], site: Site): Node {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: step.name,
      item: absolute(step.path, site),
    })),
  };
}

/** Разбор кейса и статья журнала — одна и та же статья с разными полями. */
function articleNode(
  article: { url: string; title: string; summary: string; date: Date; keywords: string[] },
  image: string,
  locale: Locale,
  site: Site,
): Node {
  return {
    '@type': 'Article',
    headline: article.title,
    description: article.summary,
    datePublished: article.date.toISOString().slice(0, 10),
    inLanguage: locale,
    keywords: article.keywords.join(', '),
    image: absolute(image, site),
    author: ref(absolute(PERSON, site)),
    publisher: ref(absolute(PERSON, site)),
    mainEntityOfPage: { '@type': 'WebPage', '@id': absolute(article.url, site) },
  };
}

/**
 * Главная: сайт, человек и три направления.
 *
 * Человек повторяется на каждой странице с графом, а не стоит только здесь:
 * поисковик сшивает узлы по `@id` в пределах одной страницы, и голая ссылка
 * на человека без его описания не сообщила бы о нём ничего.
 */
export function homeGraph(locale: Locale, site: Site): Node[] {
  return [websiteNode(locale, site), personNode(locale, site), ...serviceNodes(locale, site)];
}

export function caseGraph(item: CaseView, locale: Locale, site: Site): Node[] {
  const t = useTranslations(locale);
  return [
    personNode(locale, site),
    articleNode(
      {
        url: item.href,
        title: item.title,
        summary: item.summary,
        date: item.date,
        keywords: item.tech,
      },
      ogPath(locale, `work/${item.slug}`),
      locale,
      site,
    ),
    breadcrumbNode(
      [
        { name: SITE.name, path: homePath(locale) },
        { name: t('nav.work'), path: sectionPath(locale, 'work') },
        { name: item.title, path: item.href },
      ],
      site,
    ),
  ];
}

export function noteGraph(note: NoteView, locale: Locale, site: Site): Node[] {
  const t = useTranslations(locale);
  return [
    personNode(locale, site),
    articleNode(
      {
        url: note.href,
        title: note.title,
        summary: note.summary,
        date: note.date,
        keywords: note.tags.map((tag) => t(`tag.${tag}`)),
      },
      ogPath(locale, `note/${note.slug}`),
      locale,
      site,
    ),
    breadcrumbNode(
      [
        { name: SITE.name, path: homePath(locale) },
        { name: t('log.title'), path: `${homePath(locale)}log/` },
        { name: note.title, path: note.href },
      ],
      site,
    ),
  ];
}

/** Внутренняя страница без своей сущности: архив, политика. Только крошки. */
export function pageGraph(title: string, path: string, locale: Locale, site: Site): Node[] {
  return [
    breadcrumbNode(
      [
        { name: SITE.name, path: homePath(locale) },
        { name: title, path },
      ],
      site,
    ),
  ];
}
