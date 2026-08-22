/**
 * Три направления — план Ф7, DESIGN-GUIDE §8.
 *
 * Цен здесь нет и не будет до Ф12: типовых расценок ещё не существует,
 * а придуманная цена отсекает нормальные заказы и приводит те,
 * от которых придётся отказываться.
 *
 * Карточка отвечает на два вопроса подряд — «что входит» и «что на выходе».
 * Второй важнее: посетитель покупает результат, а не список работ.
 *
 * Ключи строк перечислены поимённо, а не собираются из номера. Собранный
 * ключ не находится поиском по репозиторию, и пропажа перевода всплывает
 * уже на странице.
 */
import type { Accent } from './accent';

export interface Service {
  /** Общий ключ карточки: `<key>.t` — заголовок, `<key>.d` — описание. */
  key: string;
  /** Имя из закрытого набора Icon.astro. */
  icon: 'tg' | 'site' | 'bolt';
  accent: Accent;
  /** Строки «что входит». */
  points: string[];
  /** Строка «что на выходе» — одна, иначе перестаёт быть выводом. */
  out: string;
}

export const SERVICES: Service[] = [
  /*
   * Четыре бота в репозиториях: jw_social_Downloader, neva-beauty-bot,
   * jw-danang-group-bot, psy-aleksander-tg-auto-posts-bot.
   */
  {
    key: 'svc.bots',
    icon: 'tg',
    accent: 'cyan',
    points: ['svc.bots.p1', 'svc.bots.p2', 'svc.bots.p3'],
    out: 'svc.bots.out',
  },

  // Три сайта: th.neva.beauty, vn.neva.beauty, psy-krasnogor.pro.
  {
    key: 'svc.sites',
    icon: 'site',
    accent: 'indigo',
    points: ['svc.sites.p1', 'svc.sites.p2', 'svc.sites.p3'],
    out: 'svc.sites.out',
  },

  /*
   * Автопостер психолога и пайплайн цен салона: то и другое — работа,
   * которую до этого делали руками каждый день.
   */
  {
    key: 'svc.auto',
    icon: 'bolt',
    accent: 'amber',
    points: ['svc.auto.p1', 'svc.auto.p2', 'svc.auto.p3'],
    out: 'svc.auto.out',
  },
];
