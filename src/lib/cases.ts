/**
 * Сборка кейса для страницы: русский источник плюс перевод поверх него.
 *
 * Языконезависимые поля живут только в русском документе, английский несёт
 * один текст (`src/content.config.ts`). Значит, слияние — единственное место,
 * где эти две половины встречаются, и больше нигде о делении знать не нужно.
 */
import { getCollection } from 'astro:content';
import type { Locale } from '../i18n';
import { homePath } from '../i18n';
import { ACCENTS, type Accent } from '../data/accent';

/** Кейс, готовый к отрисовке: язык уже выбран, половин больше нет. */
export interface CaseView {
  slug: string;
  order: number;
  title: string;
  kind: string;
  category: string[];
  summary: string;
  metrics: string[];
  tech: string[];
  link: string | null;
  linkNote?: string;
  repo?: string;
  accent: string;
  shotKind: 'browser' | 'telegram' | 'closed';
  featured?: 'live';
  date: Date;
  logLine: string;
  body: { task: string; did: string; result: string };
  screenshots: { role: string; src: ImageMetadata; alt: string }[];
  /** Адрес страницы разбора на этом языке. */
  href: string;
}

/** Адрес витрины: `/work/` и `/ru/work/`. Пара к `logPath` у журнала. */
export function workPath(locale: Locale): string {
  return `${homePath(locale)}work/`;
}

/** Адрес страницы кейса: `/work/<slug>/` и `/ru/work/<slug>/`. */
export function casePath(locale: Locale, slug: string): string {
  return `${workPath(locale)}${slug}/`;
}

/**
 * Все кейсы языка, по возрастанию `order`.
 *
 * Порядок задан полем, а не датой: сетка на главной — это витрина, и её
 * очерёдность решает владелец. Хронология живёт в журнале, там сортирует дата.
 */
export async function getCases(locale: Locale): Promise<CaseView[]> {
  const source = await getCollection('cases');
  const translations = new Map(
    (await getCollection('casesEn')).map((entry) => [entry.id, entry.data]),
  );

  return source
    .map((entry) =>
      build(entry.id, entry.data, locale === 'en' ? translations.get(entry.id) : undefined, locale),
    )
    .sort((a, b) => a.order - b.order);
}

/** Один кейс по слагу — для страницы разбора. */
export async function getCase(locale: Locale, slug: string): Promise<CaseView | undefined> {
  return (await getCases(locale)).find((item) => item.slug === slug);
}

type Source = Awaited<ReturnType<typeof getCollection<'cases'>>>[number]['data'];
type Translation = Awaited<ReturnType<typeof getCollection<'casesEn'>>>[number]['data'];

function build(
  slug: string,
  source: Source,
  translation: Translation | undefined,
  locale: Locale,
): CaseView {
  const text = translation ?? source;
  return {
    ...source,
    slug,
    href: casePath(locale, slug),
    title: text.title,
    kind: text.kind,
    summary: text.summary,
    metrics: text.metrics,
    logLine: text.logLine,
    body: text.body,
    linkNote: text.linkNote ?? source.linkNote,
    screenshots: mergeAlt(source.screenshots, translation?.screenshots),
  };
}

/**
 * Файл снимка знает только русский документ, `alt` — оба. Сшиваем по роли:
 * роль в кейсе уникальна, а порядок в списке может разойтись при правке руками.
 */
function mergeAlt(source: Source['screenshots'], translation?: Translation['screenshots']) {
  if (!translation) return source;
  const alt = new Map(translation.map((shot) => [shot.role, shot.alt]));
  return source.map((shot) => ({ ...shot, alt: alt.get(shot.role) ?? shot.alt }));
}

/**
 * Акцент страницы кейса для фона.
 *
 * У карточки цветов шесть, у фона — пять: серого `slate` в акцентах нет
 * и быть не должно, аврора им не красится. Закрытый кейс берёт индиго —
 * приглушённость несёт сама карточка, а не подложка страницы.
 */
export function pageAccent(item: CaseView): Accent {
  return (ACCENTS as readonly string[]).includes(item.accent) ? (item.accent as Accent) : 'indigo';
}
