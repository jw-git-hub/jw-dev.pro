/**
 * Постоянные сайта. Здесь только то, что подтверждено: репозитории открыты,
 * бот отвечает. Почты `info@jw-dev.pro` и Telegram-хендла пока не существует —
 * выдуманный контакт хуже отсутствующего, поэтому их здесь нет до фазы 12.
 */
export const SITE = {
  name: 'jw-dev.pro',
  github: 'https://github.com/jw-git-hub',
  bot: 'https://t.me/jw_social_Downloader_bot',
} as const;

/** Год для строки копирайта берётся на сборке, а не пишется руками. */
export const BUILD_YEAR = new Date().getFullYear();
