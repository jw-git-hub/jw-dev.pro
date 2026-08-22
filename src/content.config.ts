/**
 * Схемы коллекций — CONTENT-CASES.md §1.
 *
 * Русский документ — источник истины: он несёт и языконезависимые поля
 * (порядок, стек, ссылка, дата, акцент), и русский текст. Английский файл
 * переводит только текст. Второй копии `link` или `date` не существует,
 * поэтому им негде разъехаться; пару RU↔EN стережёт `tests/check-content.mjs`.
 *
 * Имя файла — это `slug`: адрес кейса `/work/<slug>/`. Отдельного поля нет
 * намеренно, иначе адрес и имя файла однажды разойдутся.
 */
import { defineCollection, type SchemaContext } from 'astro:content';
// zod импортируется напрямую: реэкспорт `z` из `astro:content` в Astro 7 объявлен устаревшим.
import { z } from 'zod';
import { glob } from 'astro/loaders';
import { ACCENTS } from './data/accent';

/** Шесть классов `.tone-*` из `src/styles/tone.css`: пять акцентов плюс серый. */
const TONES = [...ACCENTS, 'slate'] as const;

/** Ограничения из CONTENT-CASES §1: длиннее — ломает карточку. */
const LIMITS = {
  title: 32,
  metric: 18,
  logLine: 90,
  /**
   * Заголовок статьи. Потолок не косметический: `<title>` собирается как
   * «заголовок — jw-dev.pro», а html-validate валит тег длиннее 70 знаков.
   * 70 минус 13 знаков суффикса — вот эти 57.
   */
  noteTitle: 57,
  /** Апдейт — одна строка в ленте: длиннее он превращается в заметку без страницы. */
  updateText: 140,
  summaryMin: 150,
  summaryMax: 210,
} as const;

/** Роли снимков из CONTENT-CASES §3. `card` и `cover` обязательны, когда снимки есть. */
const SHOT_ROLES = ['card', 'cover', 'feature', 'proof', 'before', 'og'] as const;

/**
 * Снимок кейса. Мастер-файл лежит рядом с кейсом и обрабатывается сборкой,
 * поэтому это `image()`, а не строка: Astro проверит, что файл существует,
 * и отдаст размеры — без них проседает Lighthouse (CONTENT-CASES §3).
 */
const shot = ({ image }: SchemaContext) =>
  z.object({
    role: z.enum(SHOT_ROLES),
    src: image(),
    alt: z.string().min(1),
  });

/** Тот же снимок со стороны перевода: файл уже назван в русском документе. */
const shotTranslation = z.object({
  role: z.enum(SHOT_ROLES),
  alt: z.string().min(1),
});

/** Три блока разбора. Каждый — один абзац; длину проверяет check-content. */
const caseBody = z.object({
  task: z.string().min(1),
  did: z.string().min(1),
  result: z.string().min(1),
});

const cases = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/cases/ru' }),
  schema: (context) =>
    z
      .object({
        order: z.number().int().positive(),
        title: z.string().max(LIMITS.title),
        kind: z.string().min(1),
        category: z.array(z.enum(['site', 'bot', 'ai'])).min(1),
        summary: z.string().min(LIMITS.summaryMin).max(LIMITS.summaryMax),
        metrics: z.array(z.string().max(LIMITS.metric)).length(3),
        tech: z.array(z.string().min(1)).min(1).max(4),
        link: z.url().nullable(),
        linkNote: z.string().optional(),
        repo: z.url().optional(),
        accent: z.enum(TONES),
        shotKind: z.enum(['browser', 'telegram', 'closed']),
        featured: z.literal('live').optional(),
        date: z.coerce.date(),
        logLine: z.string().max(LIMITS.logLine),
        body: caseBody,
        screenshots: z.array(shot(context)).default([]),
      })
      // `link: null` без объяснения выглядит как битая вёрстка, а не как решение.
      .refine((c) => c.link !== null || Boolean(c.linkNote), {
        message: 'при link: null обязателен linkNote — почему демо недоступно',
        path: ['linkNote'],
      }),
});

const casesEn = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/cases/en' }),
  schema: z.object({
    title: z.string().max(LIMITS.title),
    kind: z.string().min(1),
    summary: z.string().min(LIMITS.summaryMin).max(LIMITS.summaryMax),
    metrics: z.array(z.string().max(LIMITS.metric)).length(3),
    linkNote: z.string().optional(),
    logLine: z.string().max(LIMITS.logLine),
    body: caseBody,
    screenshots: z.array(shotTranslation).default([]),
  }),
});

/** Заметки журнала — фаза 8. Схема стоит заранее, чтобы первая же статья легла в готовое. */
const noteShape = {
  title: z.string().min(1).max(LIMITS.noteTitle),
  date: z.coerce.date(),
  summary: z.string().min(1),
  tags: z.array(z.string().min(1)).default([]),
};

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes/ru' }),
  schema: z.object(noteShape),
});

const notesEn = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes/en' }),
  schema: z.object({ title: noteShape.title, summary: noteShape.summary }),
});

/** Апдейт — одна строка в ленте: у него нет тела, только дата и текст. */
const updates = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/updates/ru' }),
  schema: z.object({ date: z.coerce.date(), text: z.string().min(1).max(LIMITS.updateText) }),
});

const updatesEn = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/updates/en' }),
  schema: z.object({ text: z.string().min(1).max(LIMITS.updateText) }),
});

export const collections = { cases, casesEn, notes, notesEn, updates, updatesEn };
