/**
 * Картинка шаринга кейса — 1200×630 для превью в мессенджерах.
 *
 * Рисуется на сборке из данных самого кейса: домен, тип, три метрики и стек.
 * Скриншотов у проекта пока нет вовсе, а превью без картинки Telegram
 * показывает одной строкой — поэтому карточка собирается из того, что есть,
 * и обновится сама, когда поменяется текст кейса.
 *
 * Палитра читается из `tokens.css`, а не переписывается сюда: цвет в двух
 * местах — это цвет, который однажды разъедется. Растеризатор CSS-переменных
 * не понимает, поэтому значения достаются регуляркой на сборке.
 */
import { readFile } from 'node:fs/promises';
import satori from 'satori';
import sharp from 'sharp';
import type { CaseView } from './cases';

const WIDTH = 1200;
const HEIGHT = 630;
const FONT_PATH = 'src/assets/fonts/Onest-SemiBold.ttf';
const TOKENS_PATH = 'src/styles/tokens.css';

/** Читается один раз на сборку: страниц кейсов четырнадцать, файл один. */
let fontPromise: Promise<Buffer> | undefined;
let palettePromise: Promise<Record<string, string>> | undefined;

function loadFont() {
  fontPromise ??= readFile(FONT_PATH);
  return fontPromise;
}

/** Все `--имя: #hex` из токенов: `{ cyan: '#22d3ee', ink: '#f0f4fa', … }`. */
async function loadPalette() {
  palettePromise ??= readFile(TOKENS_PATH, 'utf8').then((css) => {
    const palette: Record<string, string> = {};
    for (const [, name, value] of css.matchAll(/--([\w-]+):\s*(#[0-9a-f]{3,8})\s*;/gi)) {
      palette[name] = value;
    }
    return palette;
  });
  return palettePromise;
}

/** Узел satori. Своего JSX в проекте нет, поэтому дерево описывается объектами. */
type Node = { type: string; props: { style?: Record<string, unknown>; children?: unknown } };

const box = (style: Record<string, unknown>, children?: unknown): Node => ({
  type: 'div',
  props: { style: { display: 'flex', ...style }, children },
});

/**
 * Чип метрики: та же форма, что и на карточке кейса.
 *
 * Заливка берёт сам акцент, а текст и обводка — его чернильную пару: чистый
 * индиго на тёмном даёт 3,16:1 и не проходит AA (ревизия 22.08.2026, §2 гайда).
 */
const chip = (text: string, fill: string, ink: string): Node =>
  box(
    {
      alignItems: 'center',
      padding: '10px 22px',
      borderRadius: 999,
      border: `1px solid ${ink}59`,
      background: `${fill}1f`,
      color: ink,
      fontSize: 26,
    },
    text,
  );

/** Адрес без схемы: у ботов один домен `t.me` не говорит ничего, нужен и путь. */
function shortLink(link: string | null): string {
  if (!link) return '';
  const url = new URL(link);
  return `${url.host.replace(/^www\./, '')}${url.pathname.replace(/\/$/, '')}`;
}

function card(item: CaseView, palette: Record<string, string>): Node {
  const accent = palette[item.accent] ?? palette.cyan;

  // Пара «заливка / чернила» ровно как в accent.css: где пары нет, оба равны.
  const ink = palette[`${item.accent}-ink`] ?? accent;

  return box(
    {
      flexDirection: 'column',
      justifyContent: 'space-between',
      width: '100%',
      height: '100%',
      padding: 72,
      background: palette.bg ?? '#070912',
      color: palette.ink ?? '#f0f4fa',
      fontFamily: 'Onest',
    },
    [
      box({ justifyContent: 'space-between', alignItems: 'center', fontSize: 28 }, [
        box({ color: palette.ink3 }, 'jw-dev.pro'),
        box({ color: ink }, item.kind),
      ]),

      box({ flexDirection: 'column', gap: 26 }, [
        box({ fontSize: 76, letterSpacing: '-0.02em' }, item.title),
        box(
          { gap: 14, flexWrap: 'wrap' },
          item.metrics.map((metric) => chip(metric, accent, ink)),
        ),
      ]),

      box(
        {
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 24,
          color: palette.ink3,
        },
        [
          box(
            { gap: 20 },
            item.tech.map((tech) => box({}, tech)),
          ),
          box({}, shortLink(item.link)),
        ],
      ),
    ],
  );
}

/**
 * Готовый PNG для эндпоинта `/og/<язык>/<слаг>.png`.
 *
 * Возвращается `Uint8Array<ArrayBuffer>`, а не `Buffer`: тело `Response`
 * типизировано буфером с обычным `ArrayBuffer`, а `Buffer` и производный
 * от него вид приходят с `ArrayBufferLike` и в него не проходят —
 * хотя в рантайме это те же байты.
 */
export async function renderCaseImage(item: CaseView): Promise<Uint8Array<ArrayBuffer>> {
  const [font, palette] = await Promise.all([loadFont(), loadPalette()]);

  const svg = await satori(card(item, palette) as Parameters<typeof satori>[0], {
    width: WIDTH,
    height: HEIGHT,
    fonts: [{ name: 'Onest', data: font, weight: 600, style: 'normal' }],
  });

  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const bytes = new Uint8Array(png.byteLength);
  bytes.set(png);
  return bytes;
}

export const OG_SIZE = { width: WIDTH, height: HEIGHT };

/** Адрес картинки кейса. Язык в пути: метрики и тип у кейса переводятся. */
export function ogPath(locale: string, slug: string): string {
  return `/og/${locale}/${slug}.png`;
}
