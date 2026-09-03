/**
 * Что попадает на картинку шаринга каждой страницы.
 *
 * Раскладку рисует `og.ts`, а этот файл отвечает на другой вопрос — какие
 * слова на карточке стоят. Здесь и только здесь живёт знание о том, что
 * у кейса на пилюлях метрики, у статьи — теги, а у журнала — счётчики.
 *
 * Список целей один на весь сайт: эндпоинт `/og/[locale]/[...path].png`
 * просто разворачивает его в файлы. Появился новый тип страницы — цель
 * добавляется сюда, и картинка собирается сама.
 */
import { getCases, workPath } from './cases';
import { getNotes, getJournal, countByKind, logPath, type NoteView } from './journal';
import type { CaseView } from './cases';
import type { CardSpec } from './og';
import { LOCALES, useTranslations, type Locale } from '../i18n';
import { SERVICES } from '../data/services';

/** Цель — это будущий файл: язык, путь без расширения и что на нём написано. */
export interface OgTarget {
  locale: Locale;
  path: string;
  spec: CardSpec;
}

type Translate = ReturnType<typeof useTranslations>;

/** Адрес без схемы: у ботов один домен `t.me` не говорит ничего, нужен и путь. */
function shortLink(link: string | null): string {
  if (!link) return '';
  const url = new URL(link);
  return `${url.host.replace(/^www\./, '')}${url.pathname.replace(/\/$/, '')}`;
}

/** Дата записи — тем же форматом, что и на самой странице статьи. */
function formatDate(date: Date, locale: Locale): string {
  return date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-GB');
}

/**
 * Главная. Заголовок — первая строка героя, пилюли — три направления:
 * человек видит в превью то же, что увидит на первом экране.
 */
function homeCard(t: Translate): CardSpec {
  return {
    kicker: t('hero.eyebrow'),
    title: t('hero.h1a'),
    chips: SERVICES.map((service) => t(`${service.key}.t`)),
    foot: [t('about.f1'), t('about.f2'), t('about.f3')],
    tail: 'github.com/jw-git-hub',
    accent: 'cyan',
  };
}

/** Архив журнала. Пилюли — счётчики табов: сколько чего в ленте на самом деле. */
function logCard(t: Translate, counts: Record<string, number>, locale: Locale): CardSpec {
  return {
    kicker: t('kick.journal'),
    title: t('sec.journal.t'),
    chips: [
      `${t('log.tab.case')} · ${counts.case}`,
      `${t('log.tab.note')} · ${counts.note}`,
      `${t('log.tab.update')} · ${counts.update}`,
    ],
    foot: [],
    tail: logPath(locale),
    accent: 'violet',
  };
}

/** Статья журнала. Фиолетовый — цвет всей секции журнала (§2 гайда). */
function noteCard(note: NoteView, t: Translate, locale: Locale): CardSpec {
  return {
    kicker: t('kick.journal'),
    title: note.title,
    chips: note.tags.map((tag) => t(`tag.${tag}`)),
    foot: [note.href],
    tail: formatDate(note.date, locale),
    accent: 'violet',
  };
}

/**
 * Витрина работ. Пилюли — типы проектов из фильтра: превью обещает ровно то,
 * по чему на странице можно отфильтровать.
 */
function workCard(t: Translate, locale: Locale): CardSpec {
  return {
    kicker: t('kick.workAll'),
    title: t('work.title'),
    chips: [t('f.sites'), t('f.bots'), t('f.ai')],
    foot: [],
    tail: workPath(locale),
    accent: 'rose',
  };
}

/** Разбор кейса: тип проекта, три метрики, стек и адрес — как на карточке. */
function caseCard(item: CaseView): CardSpec {
  return {
    kicker: item.kind,
    title: item.title,
    chips: item.metrics,
    foot: item.tech,
    tail: shortLink(item.link),
    accent: item.accent,
  };
}

/** Все картинки сайта на обоих языках. */
export async function ogTargets(): Promise<OgTarget[]> {
  const targets: OgTarget[] = [];

  for (const locale of LOCALES) {
    const t = useTranslations(locale);

    targets.push({ locale, path: 'home', spec: homeCard(t) });
    targets.push({ locale, path: 'work', spec: workCard(t, locale) });
    targets.push({
      locale,
      path: 'log',
      spec: logCard(t, countByKind(await getJournal(locale)), locale),
    });

    for (const item of await getCases(locale)) {
      targets.push({ locale, path: `work/${item.slug}`, spec: caseCard(item) });
    }

    for (const note of await getNotes(locale)) {
      targets.push({ locale, path: `note/${note.slug}`, spec: noteCard(note, t, locale) });
    }
  }

  return targets;
}
