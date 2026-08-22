/**
 * Четыре числа главной — DESIGN-GUIDE §8, план Ф4.
 *
 * Железное правило проекта: цифра либо измерена, либо её нет. Источник
 * каждой указан рядом; выдуманного процента здесь не появится никогда,
 * даже если блок будет выглядеть пустее.
 *
 * `from` — значение, с которого начинает счётчик. У диапазона это его
 * нижняя граница: считать «94–98» от нуля значит показать посетителю
 * несуществующие «94–37».
 */
import type { Accent } from './accent';

export interface Stat {
  /** Ключ подписи в src/i18n. */
  key: string;
  /** Конечное значение счётчика. */
  value: number;
  /** Начало отсчёта; по умолчанию ноль. */
  from?: number;
  /** Неизменяемая часть перед числом и после него. */
  prefix?: string;
  suffix?: string;
  /** Цвет пятна в углу карточки. */
  accent: Accent;
}

export const STATS: Stat[] = [
  // Репозитории jw-git-hub: семь проектов, восьмой репозиторий — этот сайт.
  { key: 'stat.projects', value: 7, accent: 'cyan' },

  // README vn.neva.beauty: Performance 94–98 на мобильных; psy-krasnogor.pro — 96.
  { key: 'stat.lighthouse', value: 98, from: 94, prefix: '94–', accent: 'violet' },

  // th.neva.beauty: 25 страниц после ухода с Tilda стали легче на 51–60%.
  { key: 'stat.weight', value: 60, from: 51, prefix: '−51…−', suffix: '%', accent: 'rose' },

  // th.neva.beauty: 85 pytest-тестов читают источник цен и проверяют отрисованное.
  { key: 'stat.tests', value: 85, accent: 'amber' },
];
