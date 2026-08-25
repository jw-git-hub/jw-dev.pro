/**
 * Поле узлов — DESIGN-GUIDE §9. Точки медленно дрейфуют по экрану
 * и соединяются, когда оказываются ближе порога.
 *
 * Потолок — 88 узлов на десктопе и 38 на узком экране. Число проверяемых
 * пар растёт как квадрат числа точек: сотня узлов это пять тысяч расчётов
 * на кадр, и слабая машина перестаёт держать 60 fps.
 */
import { NODE_COLORS, rgba, line, dot } from './paint.js';

const NARROW = 760;
const NARROW_NODES = 38;
const MAX_NODES = 88;
const PX_PER_NODE = 21000;
const NARROW_LIMIT = 128;
const WIDE_LIMIT = 150;

const DRIFT = 0.13; // px за кадр
const WRAP = 40; // на сколько узел заходит за край, прежде чем вынырнуть с другого
const MIN_RADIUS = 1.05;
const RADIUS_SPREAD = 1.35;
const TWO_PI = Math.PI * 2;

const EDGE_ALPHA = 0.28;

/**
 * Ступеней прозрачности у рёбер. Восемь на диапазон 0,28 дают шаг 0,035,
 * а холст лежит под непрозрачностью .66 (backdrop.css) — на тёмном фоне
 * это 0,023 между соседними ступенями, то есть за порогом различимости.
 */
const EDGE_LEVELS = 8;

/* Курсор поднимает всё, что рядом: рёбра ярче и толще, узлы крупнее. */
const CURSOR_RADIUS = 180;
const CURSOR_ALPHA = 0.38;
const CURSOR_WIDTH = 1.3;
const CURSOR_GROWTH = 1.9;
const CURSOR_GAIN = 0.6;

const HALO_FROM = 0.25;
const HALO_RADIUS = 9;
const HALO_GROWTH = 13;
const HALO_ALPHA = 0.12;

/* Дыхание: яркость узла гуляет по синусу от его собственной фазы. */
const BREATH_BASE = 0.55;
const BREATH_SPREAD = 0.2;
const BREATH_SPEED = 0.0011;
const BREATH_GAIN = 1.05;
const MAX_ALPHA = 0.98;

const squaredTo = (node, x, y) => (node.x - x) ** 2 + (node.y - y) ** 2;

export const edgeLimit = (width) => (width < NARROW ? NARROW_LIMIT : WIDE_LIMIT);

function nodeCount(width, height) {
  if (width < NARROW) return NARROW_NODES;
  return Math.min(MAX_NODES, Math.round((width * height) / PX_PER_NODE));
}

export function buildNodes(width, height) {
  return Array.from({ length: nodeCount(width, height) }, (_, index) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * DRIFT,
    vy: (Math.random() - 0.5) * DRIFT,
    radius: MIN_RADIUS + Math.random() * RADIUS_SPREAD,
    color: NODE_COLORS[index % NODE_COLORS.length],
    phase: Math.random() * TWO_PI,
  }));
}

/** Ушедший за край узел выныривает с противоположного: поле бесконечно. */
function wrap(value, size) {
  if (value < -WRAP) return size + WRAP;
  if (value > size + WRAP) return -WRAP;
  return value;
}

export function stepNodes(nodes, width, height) {
  for (const node of nodes) {
    node.x = wrap(node.x + node.vx, width);
    node.y = wrap(node.y + node.vy, height);
  }
}

/** Индексы узлов, до которых от данного дотягивается ребро. */
export function neighbours(nodes, index, limit) {
  const from = nodes[index];
  const found = [];
  for (let i = 0; i < nodes.length; i++) {
    if (i !== index && squaredTo(nodes[i], from.x, from.y) < limit * limit) found.push(i);
  }
  return found;
}

/** Близость точки к курсору: 1 — прямо под ним, 0 — вне радиуса подсветки. */
function cursorLift(pointer, x, y) {
  if (!pointer.on) return 0;
  const distance = Math.sqrt((x - pointer.x) ** 2 + (y - pointer.y) ** 2);
  return distance < CURSOR_RADIUS ? 1 - distance / CURSOR_RADIUS : 0;
}

/**
 * Ребро либо ложится в дорожку своей прозрачности, либо, если его поднял
 * курсор, рисуется сразу: у поднятого своя толщина, и в общую обводку
 * он не встаёт.
 */
function addEdge(ctx, a, b, { limit, tint, pointer }, lanes) {
  const squared = squaredTo(b, a.x, a.y);
  if (squared > limit * limit) return;

  const near = 1 - Math.sqrt(squared) / limit;
  const lift = cursorLift(pointer, (a.x + b.x) / 2, (a.y + b.y) / 2);

  if (lift > 0) {
    ctx.lineWidth = 1 + lift * CURSOR_WIDTH;
    ctx.strokeStyle = rgba(tint, (near * EDGE_ALPHA + lift * CURSOR_ALPHA).toFixed(3));
    line(ctx, a.x, a.y, b.x, b.y);
    return;
  }

  const level = Math.min(EDGE_LEVELS - 1, Math.round(near * (EDGE_LEVELS - 1)));
  const lane = lanes[level] ?? (lanes[level] = new Path2D());
  lane.moveTo(a.x, a.y);
  lane.lineTo(b.x, b.y);
}

/** Одна обводка на ступень прозрачности вместо одной на ребро. */
function strokeLanes(ctx, lanes, tint) {
  ctx.lineWidth = 1;

  for (let level = 0; level < lanes.length; level++) {
    if (!lanes[level]) continue;
    const alpha = ((level / (EDGE_LEVELS - 1)) * EDGE_ALPHA).toFixed(3);
    ctx.strokeStyle = rgba(tint, alpha);
    ctx.stroke(lanes[level]);
  }
}

/**
 * Пары, а не каждый с каждым дважды: связь симметрична.
 *
 * Рёбра копятся по ступеням прозрачности и уходят на холст восемью
 * обводками вместо семисот. Отдельный stroke на ребро — это своя строка
 * цвета, свой её разбор браузером и свой проход растеризатора, а число
 * пар растёт квадратом числа узлов.
 */
export function drawEdges(ctx, nodes, options) {
  const lanes = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) addEdge(ctx, nodes[i], nodes[j], options, lanes);
  }

  strokeLanes(ctx, lanes, options.tint);
}

function nodeAlpha(node, time, lift) {
  const breath = BREATH_BASE + Math.sin(time * BREATH_SPEED + node.phase) * BREATH_SPREAD;
  return Math.min(MAX_ALPHA, breath * BREATH_GAIN + lift * CURSOR_GAIN);
}

function drawHalo(ctx, node, lift) {
  ctx.fillStyle = rgba(node.color, (lift * HALO_ALPHA).toFixed(3));
  dot(ctx, node.x, node.y, HALO_RADIUS + lift * HALO_GROWTH);
}

export function drawNodes(ctx, nodes, { time, pointer }) {
  for (const node of nodes) {
    const lift = cursorLift(pointer, node.x, node.y);
    ctx.fillStyle = rgba(node.color, nodeAlpha(node, time, lift).toFixed(3));
    dot(ctx, node.x, node.y, node.radius + lift * CURSOR_GROWTH);
    if (lift > HALO_FROM) drawHalo(ctx, node, lift);
  }
}
