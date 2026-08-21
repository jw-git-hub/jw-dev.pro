/**
 * Палитра графа и примитивы канваса.
 *
 * Канвас не читает CSS-переменные, поэтому акценты снимаются с :root
 * один раз при загрузке и превращаются в тройки RGB. Шесть вызовов
 * getComputedStyle дороже шести литералов, зато палитра остаётся
 * в одном месте — tokens.css, где её и сторожит check-css.
 */

/** Цвета узлов: пять акцентов палитры. */
const NODE_TOKENS = ['cyan', 'violet', 'indigo', 'amber', 'rose'];

/** Плюс служебный mint: его может попросить якорь через data-nxc. */
const TINT_TOKENS = [...NODE_TOKENS, 'mint'];

const HEX = 16;
const BYTE = 255;
const RED_SHIFT = 16;
const GREEN_SHIFT = 8;
const TWO_PI = Math.PI * 2;

const styles = getComputedStyle(document.documentElement);

function readToken(name) {
  const value = Number.parseInt(styles.getPropertyValue(`--${name}`).trim().slice(1), HEX);
  return [(value >> RED_SHIFT) & BYTE, (value >> GREEN_SHIFT) & BYTE, value & BYTE];
}

/** Имя акцента → тройка RGB. Имена те же, что в data-acc и data-nxc. */
export const TINTS = Object.fromEntries(TINT_TOKENS.map((name) => [name, readToken(name)]));

export const NODE_COLORS = NODE_TOKENS.map((name) => TINTS[name]);

export const rgba = (color, alpha) => `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;

export function line(ctx, fromX, fromY, toX, toY) {
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
}

export function dot(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TWO_PI);
  ctx.fill();
}

export function ring(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TWO_PI);
  ctx.stroke();
}
