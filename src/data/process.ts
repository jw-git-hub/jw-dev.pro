/**
 * Пять шагов процесса — план Ф7, DESIGN-GUIDE §11.
 *
 * Шаги описывают то, как устроены сами репозитории, а не идеальный
 * методологический цикл: разбор до оценки, модель данных до вёрстки,
 * проверки в CI, репозиторий клиенту на выходе.
 *
 * `at` — доля длины SVG-пути, на которой стоит узел. Значения из §11
 * и подобраны под конкретную кривую: узлы должны попадать на её пологие
 * участки, иначе номер съезжает с линии.
 */
import type { Accent } from './accent';

export interface Step {
  /** Общий ключ: `<key>.t` — заголовок, `<key>.d` — описание. */
  key: string;
  icon: 'search' | 'layers' | 'code' | 'check' | 'box';
  accent: Accent;
  at: number;
}

export const STEPS: Step[] = [
  { key: 'step.audit', icon: 'search', accent: 'cyan', at: 0.055 },
  { key: 'step.arch', icon: 'layers', accent: 'indigo', at: 0.29 },
  { key: 'step.build', icon: 'code', accent: 'violet', at: 0.51 },
  { key: 'step.ship', icon: 'check', accent: 'rose', at: 0.735 },
  { key: 'step.hand', icon: 'box', accent: 'amber', at: 0.955 },
];

/** Номер шага в разметке: «01», а не «1» — моно-подпись фиксированной ширины. */
export function stepNumber(index: number): string {
  return String(index + 1).padStart(2, '0');
}
