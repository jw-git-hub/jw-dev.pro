/**
 * Цвета проекта для того, что рисуется на сборке, а не в браузере.
 *
 * Палитра читается из `tokens.css`, а не переписывается в код: цвет в двух
 * местах — это цвет, который однажды разъедется. Ни satori, ни sharp
 * CSS-переменных не понимают, поэтому значения достаются регуляркой.
 */
import { readFile } from 'node:fs/promises';

const TOKENS_PATH = 'src/styles/tokens.css';

/** Читается один раз на сборку: картинок больше двадцати, файл один. */
let palettePromise: Promise<Record<string, string>> | undefined;

/** Все `--имя: #hex` из токенов: `{ cyan: '#22d3ee', ink: '#f0f4fa', … }`. */
export async function loadPalette(): Promise<Record<string, string>> {
  palettePromise ??= readFile(TOKENS_PATH, 'utf8').then((css) => {
    const palette: Record<string, string> = {};
    for (const [, name, value] of css.matchAll(/--([\w-]+):\s*(#[0-9a-f]{3,8})\s*;/gi)) {
      palette[name] = value;
    }
    return palette;
  });
  return palettePromise;
}

/** Фон страницы. Им заливают прозрачные углы иконок и подложку карточек. */
export async function backgroundColor(): Promise<string> {
  return (await loadPalette()).bg ?? '#070912';
}
