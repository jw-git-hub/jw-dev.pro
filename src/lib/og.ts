/**
 * Картинка шаринга — 1200×630 для превью в мессенджерах.
 *
 * Рисуется на сборке из данных самой страницы. Превью без картинки Telegram
 * показывает одной строкой, поэтому карточка собирается из того, что есть,
 * и обновляется сама, когда меняется текст.
 *
 * Раскладка одна на все типы страниц: шапка, заголовок с пилюлями, подвал.
 * Кейс, статья и главная различаются только тем, что кладут в эти три места
 * (`src/lib/og-cards.ts`) — второй вёрстки для второго типа страницы не нужно.
 *
 * Цвета берутся из общей палитры проекта (`lib/palette.ts`).
 */
import { readFile } from 'node:fs/promises';
import satori from 'satori';
import sharp from 'sharp';
import { loadPalette } from './palette';

const WIDTH = 1200;
const HEIGHT = 630;
const FONT_PATH = 'src/assets/fonts/Onest-SemiBold.ttf';

/** Что кладётся в три места раскладки. Пустое поле просто не рисуется. */
export interface CardSpec {
  /** Правый верхний угол: тип страницы — «Сайт», «Журнал», направление. */
  kicker: string;
  title: string;
  /** Пилюли под заголовком: метрики кейса, теги статьи, счётчики архива. */
  chips: string[];
  /** Подвал слева: стек кейса, факты о себе. */
  foot: string[];
  /** Подвал справа: адрес проекта или дата записи. */
  tail: string;
  /** Имя из палитры: им красятся пилюли и надзаголовок. */
  accent: string;
}

/** Читается один раз на сборку: карточек больше двадцати, файл один. */
let fontPromise: Promise<Buffer> | undefined;

function loadFont() {
  fontPromise ??= readFile(FONT_PATH);
  return fontPromise;
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

/**
 * Кегль заголовка по его длине.
 *
 * Satori не умеет ужимать текст под коробку: длинный заголовок статьи в 76px
 * уезжает за нижний край и обрезается вместе с пилюлями. Три ступени
 * подобраны замером на самом длинном заголовке журнала.
 */
function titleSize(title: string): number {
  if (title.length > 52) return 50;
  if (title.length > 34) return 62;
  return 76;
}

function card(spec: CardSpec, palette: Record<string, string>): Node {
  const accent = palette[spec.accent] ?? palette.cyan;

  // Пара «заливка / чернила» ровно как в accent.css: где пары нет, оба равны.
  const ink = palette[`${spec.accent}-ink`] ?? accent;

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
        box({ color: ink }, spec.kicker),
      ]),

      box({ flexDirection: 'column', gap: 26 }, [
        box({ fontSize: titleSize(spec.title), letterSpacing: '-0.02em' }, spec.title),
        box(
          { gap: 14, flexWrap: 'wrap' },
          spec.chips.map((text) => chip(text, accent, ink)),
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
            spec.foot.map((text) => box({}, text)),
          ),
          box({}, spec.tail),
        ],
      ),
    ],
  );
}

/**
 * Готовый PNG для эндпоинта `/og/<язык>/<путь>.png`.
 *
 * Возвращается `Uint8Array<ArrayBuffer>`, а не `Buffer`: тело `Response`
 * типизировано буфером с обычным `ArrayBuffer`, а `Buffer` и производный
 * от него вид приходят с `ArrayBufferLike` и в него не проходят —
 * хотя в рантайме это те же байты.
 */
export async function renderCard(spec: CardSpec): Promise<Uint8Array<ArrayBuffer>> {
  const [font, palette] = await Promise.all([loadFont(), loadPalette()]);

  const svg = await satori(card(spec, palette) as Parameters<typeof satori>[0], {
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

/**
 * Адрес картинки: `/og/<язык>/<путь>.png`.
 *
 * Язык в пути, а не в имени файла: у кейса переводятся и тип, и метрики,
 * у статьи — заголовок и дата. Путь повторяет раздел сайта (`work/<слаг>`,
 * `note/<слаг>`), поэтому слаг кейса и слаг статьи не могут столкнуться.
 */
export function ogPath(locale: string, path: string): string {
  return `/og/${locale}/${path}.png`;
}
