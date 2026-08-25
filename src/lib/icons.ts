/**
 * Иконки сайта в PNG — из того же `favicon.svg`, что показывает браузер.
 *
 * Второго рисунка знака в репозитории нет и быть не должно: правка контура
 * в одном файле обязана доехать до всех размеров сразу. Растеризует sharp
 * на сборке, файлы отдаются с хешируемыми заголовками как обычная статика.
 *
 * SVG хватило бы всем современным браузерам, но не всем потребителям:
 * iOS берёт только PNG (`apple-touch-icon`), Android — только PNG из манифеста.
 */
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { backgroundColor } from './palette';

const SOURCE_PATH = 'public/favicon.svg';

/** Сторона квадрата в `viewBox` исходника: от неё считается плотность растра. */
const SOURCE_SIDE = 64;
const BASE_DENSITY = 72;

/**
 * Доля стороны, которую занимает знак на маскируемой иконке.
 *
 * Android обрезает иконку под форму системы — круг, каплю, скруглённый квадрат.
 * Всё, что вне центральных 80%, обрезается, поэтому у маскируемой версии знак
 * ужимается, а поля дорисовываются фоном.
 */
const MASKABLE_SAFE = 0.8;

/** Имя файла → сторона в пикселях и нужно ли поле под маску. */
export const ICONS: Record<string, { side: number; maskable?: true }> = {
  'favicon-32': { side: 32 },
  'apple-touch': { side: 180 },
  'icon-192': { side: 192 },
  'icon-512': { side: 512 },
  'maskable-512': { side: 512, maskable: true },
};

/**
 * Растр знака заданной стороны.
 *
 * `density` считается от стороны: sharp рисует SVG в его собственном размере
 * и только потом масштабирует, поэтому без пересчёта иконка 512 получилась бы
 * растянутым квадратиком 64×64.
 *
 * `flatten` заливает прозрачные углы фоном страницы. У знака скруглённая
 * подложка, а iOS и Android подставляют под прозрачность свой цвет — чаще
 * белый, и вокруг тёмного знака появлялась бы светлая рамка.
 */
export async function renderIcon(name: string): Promise<Uint8Array<ArrayBuffer>> {
  const icon = ICONS[name];
  const background = await backgroundColor();
  const svg = await readFile(SOURCE_PATH);

  const glyph = icon.maskable ? Math.round(icon.side * MASKABLE_SAFE) : icon.side;
  const density = Math.round((BASE_DENSITY * glyph) / SOURCE_SIDE);
  const margin = Math.round((icon.side - glyph) / 2);

  const png = await sharp(svg, { density })
    .resize(glyph, glyph)
    .extend({ top: margin, bottom: margin, left: margin, right: margin, background })
    .flatten({ background })
    .png()
    .toBuffer();

  const bytes = new Uint8Array(png.byteLength);
  bytes.set(png);
  return bytes;
}

/** Адрес иконки. Путь один на всех потребителей: разметку, манифест и проверки. */
export function iconPath(name: string): string {
  return `/icons/${name}.png`;
}
