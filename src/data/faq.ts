/**
 * Вопросы и ответы — план Ф9, DESIGN-GUIDE §16 (аккордеон).
 *
 * Содержание — ответы владельца от 25.08.2026 на семь вопросов об условиях,
 * а не пересказ макета: в `13-final.html` в этом блоке стоит демонстрационный
 * текст. Цифры в ответах — его расценки, не мои оценки.
 *
 * Ключи перечислены поимённо, как в `services.ts`: собранный из номера ключ
 * не находится поиском по репозиторию, и пропажа перевода всплывает
 * уже на странице.
 */
export interface FaqItem {
  /** Ключ вопроса — он же строка в `<summary>`. */
  q: string;
  /** Ключи абзацев ответа по порядку. Абзац — единица правки, а не строка. */
  a: string[];
}

export const FAQ: FaqItem[] = [
  { q: 'faq.time.q', a: ['faq.time.a1', 'faq.time.a2'] },
  { q: 'faq.scope.q', a: ['faq.scope.a1', 'faq.scope.a2'] },
  { q: 'faq.pay.q', a: ['faq.pay.a1', 'faq.pay.a2'] },
  { q: 'faq.code.q', a: ['faq.code.a1', 'faq.code.a2'] },
  { q: 'faq.monthly.q', a: ['faq.monthly.a1', 'faq.monthly.a2'] },
  { q: 'faq.legacy.q', a: ['faq.legacy.a1', 'faq.legacy.a2', 'faq.legacy.a3'] },
  { q: 'faq.start.q', a: ['faq.start.a1', 'faq.start.a2', 'faq.start.a3', 'faq.start.a4'] },
];
