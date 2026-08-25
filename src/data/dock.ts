/**
 * Контекстное действие нижнего дока — DESIGN-GUIDE §14.
 *
 * Док не дублирует шапку: шапка — это переходы по разделам, док — действия.
 * Действие ровно одно и меняется вместе с секцией. Какое именно — секция
 * объявляет сама атрибутом `data-dock`, ровно как объявляет свой акцент:
 * иначе список секций пришлось бы держать в двух местах и сверять руками.
 *
 * Действия «скопировать почту» из таблицы §14 здесь нет: почты
 * `info@jw-dev.pro` пока не существует, а кнопка, копирующая выдуманный
 * адрес, хуже её отсутствия. Вернётся вместе с почтой в Ф12.
 */
import type { Locale } from '../i18n';
import { sectionPath } from '../i18n';
import { logPath } from '../lib/journal';
import { casePath } from '../lib/cases';

/** Вид действия. Совпадает со значением `data-dock` у секции. */
export type DockCtx = 'work' | 'case' | 'how' | 'log';

/**
 * Действие, пока секция не назвала своё: до первой прокрутки и на внутренних
 * страницах, где секций с акцентом нет вовсе.
 */
export const DEFAULT_CTX: DockCtx = 'work';

export interface DockAction {
  kind: DockCtx;
  /** Ключ перевода. Он же доступное имя: на узком экране подпись скрыта. */
  key: string;
  icon: 'arr' | 'doc' | 'bolt';
  href: string;
}

/**
 * Все четыре действия сразу: они уезжают в разметку готовыми, а скрипт
 * только переключает, какое показано. Так переведённые подписи остаются
 * на сборке и словарь не уезжает в браузер.
 */
export function dockActions(locale: Locale, caseSlug: string): DockAction[] {
  return [
    { kind: 'work', key: 'dock.ctx.work', icon: 'arr', href: sectionPath(locale, 'work') },
    { kind: 'case', key: 'dock.ctx.case', icon: 'doc', href: casePath(locale, caseSlug) },
    { kind: 'how', key: 'dock.ctx.how', icon: 'bolt', href: sectionPath(locale, 'process') },
    { kind: 'log', key: 'dock.ctx.log', icon: 'doc', href: logPath(locale) },
  ];
}
