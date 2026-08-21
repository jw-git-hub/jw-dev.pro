/**
 * Привязка интерфейса к сети — DESIGN-GUIDE §9.
 *
 * Элемент с атрибутом `data-nx` становится якорем: от него тянутся нити
 * к трём ближайшим узлам, а якоря одной группы соединяются пунктиром.
 * Это то, что в брифе названо «связью элементов интерфейса»: граф
 * не декорация за текстом, он держит блоки.
 *
 *   data-nxc  имя цвета из палитры; по умолчанию первый акцент
 *   data-nxg  группа: якоря одной группы связаны пунктиром
 *   data-nxp  left|right — вынести точку привязки за кромку элемента,
 *             чтобы нить выходила из края, а не из середины
 */
import { NODE_COLORS, TINTS, rgba, line, dot, ring } from './paint.js';

const NEAREST = 3;
const MAX_LENGTH = 340; // дальше нить перестаёт читаться как связь
const FIRST_ALPHA = 0.52;
const REST_ALPHA = 0.28;
const FIRST_WIDTH = 1.25;
const REST_WIDTH = 0.9;
const SIDE_SHIFT = 13;

const DOT_RADIUS = 2.1;
const DOT_ALPHA = 0.5;
const RING_RADIUS = 6.5;
const RING_ALPHA = 0.22;

const GROUP_ALPHA = 0.38;
const GROUP_WIDTH = 1.2;
const GROUP_DASH = [5, 6];

/** Запас за кромкой экрана: без него нити обрываются прямо на границе. */
const MARGIN = 90;

export const collect = () => [...document.querySelectorAll('[data-nx]')];

function pointX(rect, side) {
  if (side === 'left') return rect.left - SIDE_SHIFT;
  if (side === 'right') return rect.right + SIDE_SHIFT;
  return rect.left + rect.width / 2;
}

/** Координата y — от начала документа: якорь стоит на месте, экран едет. */
export function measure(elements, scrollY) {
  const anchors = [];
  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;
    anchors.push({
      x: pointX(rect, element.dataset.nxp),
      y: rect.top + rect.height / 2 + scrollY,
      color: TINTS[element.dataset.nxc] ?? NODE_COLORS[0],
      group: element.dataset.nxg ?? '',
    });
  }
  return anchors;
}

/** Держит короткий список ближайших: сортировать восемьдесят узлов ради трёх незачем. */
function keepNearest(best, candidate) {
  const at = best.findIndex((item) => candidate.squared < item.squared);
  if (at < 0) {
    if (best.length < NEAREST) best.push(candidate);
    return;
  }
  best.splice(at, 0, candidate);
  if (best.length > NEAREST) best.pop();
}

function nearest(nodes, x, y) {
  const best = [];
  for (const node of nodes) {
    keepNearest(best, { node, squared: (node.x - x) ** 2 + (node.y - y) ** 2 });
  }
  return best;
}

function drawThreads(ctx, anchor, y, nodes) {
  nearest(nodes, anchor.x, y).forEach(({ node, squared }, index) => {
    const distance = Math.sqrt(squared);
    if (distance > MAX_LENGTH) return;
    const reach = 1 - distance / MAX_LENGTH;
    ctx.strokeStyle = rgba(anchor.color, (reach * (index ? REST_ALPHA : FIRST_ALPHA)).toFixed(3));
    ctx.lineWidth = index ? REST_WIDTH : FIRST_WIDTH;
    line(ctx, node.x, node.y, anchor.x, y);
  });
}

/** Сам якорь: точка и кольцо вокруг — узел сети, а не конец линии. */
function drawKnot(ctx, anchor, y) {
  ctx.fillStyle = rgba(anchor.color, DOT_ALPHA);
  dot(ctx, anchor.x, y, DOT_RADIUS);
  ctx.strokeStyle = rgba(anchor.color, RING_ALPHA);
  ctx.lineWidth = 1;
  ring(ctx, anchor.x, y, RING_RADIUS);
}

function drawGroup(ctx, points) {
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      ctx.strokeStyle = rgba(points[i].color, GROUP_ALPHA);
      line(ctx, points[i].x, points[i].y, points[j].x, points[j].y);
    }
  }
}

function drawGroups(ctx, groups) {
  ctx.setLineDash(GROUP_DASH);
  ctx.lineWidth = GROUP_WIDTH;
  for (const points of Object.values(groups)) drawGroup(ctx, points);
  ctx.setLineDash([]);
}

export function draw(ctx, anchors, { nodes, scrollY, height }) {
  const groups = {};

  for (const anchor of anchors) {
    const y = anchor.y - scrollY;
    if (y < -MARGIN || y > height + MARGIN) continue;
    if (anchor.group) (groups[anchor.group] ??= []).push({ x: anchor.x, y, color: anchor.color });
    drawThreads(ctx, anchor, y, nodes);
    drawKnot(ctx, anchor, y);
  }

  drawGroups(ctx, groups);
}
