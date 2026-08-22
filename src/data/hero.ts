/**
 * Данные сцены героя — DESIGN-GUIDE §10.
 *
 * Здесь то же правило, что и у чисел статистики: только подтверждённое.
 * Пилюли висят в воздухе вокруг окон и читаются раньше подписей, поэтому
 * источник каждой цифры указан рядом.
 *
 * `place` — класс позиции в `hero.css`: он задаёт угол сцены и глубину `--tz`.
 * Позиция лежит рядом с самой пилюлей, а не выводится из порядка списка:
 * пятая пилюля в таком списке молча осталась бы без позиционного класса.
 *
 * `amp` — размах параллакса (§10), его читает `parallax.js`.
 */
import type { Accent } from './accent';

export interface HudPill {
  /** Общий ключ пары: `<key>.k` — подпись, `<key>.v` — значение. */
  key: string;
  place: 'hudA' | 'hudB' | 'hudC' | 'hudD';
  /** Цвет нити, которой пилюля привязана к фоновой сети. */
  accent: Accent;
  amp: number;
}

export const HUD_PILLS: HudPill[] = [
  // Бот отвечает прямо сейчас: t.me/jw_social_Downloader_bot, проверено вручную.
  { key: 'hud.status', place: 'hudA', accent: 'cyan', amp: 12 },

  // Стек ботов по их README: Python, aiogram 3, Docker.
  { key: 'hud.stack', place: 'hudB', accent: 'indigo', amp: 11 },

  // github.com/jw-git-hub: восемь репозиториев открыты.
  { key: 'hud.code', place: 'hudC', accent: 'amber', amp: 10 },

  // th.neva.beauty: 204 цены сведены в один источник правды.
  { key: 'hud.prices', place: 'hudD', accent: 'rose', amp: 12 },
];

/** Lighthouse psy-krasnogor.pro на мобильных — CONTENT-CASES §5.3. */
export const PANEL_SCORE = '96';
