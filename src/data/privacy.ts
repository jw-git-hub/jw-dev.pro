/**
 * Политика конфиденциальности — план Ф10.
 *
 * Текст описывает ровно то, что делает код: поля формы из `ContactForm.astro`,
 * доставку и лимит из `server/contact-api/`, счётчик из `scripts/metrika.js`.
 * Сверять политику с реализацией нужно при каждой правке любого из них —
 * политика, которая расходится с кодом, хуже её отсутствия.
 *
 * Ключи перечислены поимённо, как в `faq.ts` и `services.ts`: собранный
 * из номера ключ не находится поиском по репозиторию.
 */
export interface LegalSection {
  /** Ключ заголовка раздела. */
  t: string;
  /** Ключи абзацев по порядку. Абзац — единица правки, а не строка. */
  p: string[];
}

export const PRIVACY: LegalSection[] = [
  { t: 'privacy.form.t', p: ['privacy.form.p1', 'privacy.form.p2'] },
  { t: 'privacy.where.t', p: ['privacy.where.p1', 'privacy.where.p2'] },
  { t: 'privacy.server.t', p: ['privacy.server.p1', 'privacy.server.p2'] },
];

/**
 * Раздел про счётчик показывается, только когда счётчик задан переменной
 * сборки. Описывать аналитику, которой на сайте нет, — это то же враньё,
 * что и умолчать о той, которая есть.
 */
export const PRIVACY_ANALYTICS: LegalSection = {
  t: 'privacy.metrika.t',
  p: ['privacy.metrika.p1', 'privacy.metrika.p2'],
};

export const PRIVACY_TAIL: LegalSection[] = [
  { t: 'privacy.cookies.t', p: ['privacy.cookies.p1'] },
  { t: 'privacy.rights.t', p: ['privacy.rights.p1'] },
];
