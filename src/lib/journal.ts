/**
 * Лента журнала: кейсы, заметки и апдейты одним списком по датам.
 *
 * Три коллекции с разными схемами сводятся здесь к одной строке ленты, и это
 * единственное место, где о трёх источниках нужно знать. Дальше — и на главной,
 * и в архиве, и в RSS — есть только `JournalEntry` с датой и типом.
 *
 * Хронология тут по дате, в отличие от сетки кейсов: витрину сортирует `order`
 * владельца, а журнал отвечает на вопрос «сайт ещё живой», и на него отвечает
 * только дата.
 */
import { getCollection, getEntry, render } from 'astro:content';
import type { Locale } from '../i18n';
import { homePath } from '../i18n';
import { getCases, type CaseView } from './cases';

/** Три типа записи: у каждого свой бейдж, свой значок и свой таб в архиве. */
export const ENTRY_KINDS = ['case', 'note', 'update'] as const;

export type EntryKind = (typeof ENTRY_KINDS)[number];

/** Строка ленты. Всё, что нужно `JournalRow`, и ничего сверх того. */
export interface JournalEntry {
  kind: EntryKind;
  slug: string;
  date: Date;
  title: string;
  /** Одна строка под заголовком. У апдейта её нет: он сам и есть одна строка. */
  line?: string;
  /** Своя страница. У апдейта её нет — он живёт только в ленте. */
  href?: string;
  /** Класс `.tone-*`: цвет значка и бейджа строки. */
  tone: string;
  /** Силуэт сайта или переписки в миниатюре — только у кейса. */
  shotKind?: CaseView['shotKind'];
}

/** Статья журнала, собранная из русского источника и английского перевода. */
export interface NoteView {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  date: Date;
  href: string;
}

/** Адрес архива: `/log/` и `/ru/log/`. */
export function logPath(locale: Locale): string {
  return `${homePath(locale)}log/`;
}

/** Адрес статьи: `/log/<slug>/`. Слаг — имя файла, как и у кейса. */
export function notePath(locale: Locale, slug: string): string {
  return `${logPath(locale)}${slug}/`;
}

const byNewest = (a: { date: Date }, b: { date: Date }) => b.date.getTime() - a.date.getTime();

/** Статьи журнала, новые сверху. */
export async function getNotes(locale: Locale): Promise<NoteView[]> {
  const source = await getCollection('notes');
  const translations = new Map(
    (await getCollection('notesEn')).map((entry) => [entry.id, entry.data]),
  );

  return source
    .map((entry) => {
      const text = (locale === 'en' ? translations.get(entry.id) : undefined) ?? entry.data;
      return {
        slug: entry.id,
        date: entry.data.date,
        tags: entry.data.tags,
        title: text.title,
        summary: text.summary,
        href: notePath(locale, entry.id),
      };
    })
    .sort(byNewest);
}

/**
 * Тело статьи из markdown. Собирается здесь, рисуется страницей.
 *
 * Ветка на язык развёрнута полностью, а не сведена к одному `render(entry)`
 * над объединённым типом: у двух коллекций разные схемы, и объединение
 * `astro check` не пропускает.
 */
export async function getNoteBody(locale: Locale, slug: string) {
  if (locale === 'en') {
    const entry = await getEntry('notesEn', slug);
    return entry && render(entry);
  }
  const entry = await getEntry('notes', slug);
  return entry && render(entry);
}

/** Вся лента: кейсы, статьи и апдейты вперемешку, новые сверху. */
export async function getJournal(locale: Locale): Promise<JournalEntry[]> {
  const entries = [
    ...(await getCases(locale)).map(fromCase),
    ...(await getNotes(locale)).map(fromNote),
    ...(await getUpdates(locale)),
  ];
  return entries.sort(byNewest);
}

/** Сколько записей каждого типа — счётчики табов архива. */
export function countByKind(entries: JournalEntry[]): Record<EntryKind, number> {
  const counts = { case: 0, note: 0, update: 0 };
  for (const entry of entries) counts[entry.kind] += 1;
  return counts;
}

function fromCase(item: CaseView): JournalEntry {
  return {
    kind: 'case',
    slug: item.slug,
    date: item.date,
    title: item.title,
    line: item.logLine,
    href: item.href,
    tone: item.accent,
    shotKind: item.shotKind,
  };
}

/** Тон статьи — фиолетовый: это цвет всей секции журнала (§2 гайда). */
function fromNote(note: NoteView): JournalEntry {
  return {
    kind: 'note',
    slug: note.slug,
    date: note.date,
    title: note.title,
    line: note.summary,
    href: note.href,
    tone: 'violet',
  };
}

async function getUpdates(locale: Locale): Promise<JournalEntry[]> {
  const source = await getCollection('updates');
  const translations = new Map(
    (await getCollection('updatesEn')).map((entry) => [entry.id, entry.data]),
  );

  return source.map((entry) => ({
    kind: 'update' as const,
    slug: entry.id,
    date: entry.data.date,
    title: (locale === 'en' ? translations.get(entry.id)?.text : undefined) ?? entry.data.text,
    tone: 'cyan',
  }));
}
