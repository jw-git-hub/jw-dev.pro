/**
 * Проверки самих ворот `check-layers`. Разбор регулярками ошибается молча:
 * пропущенный случай выглядит как зелёные ворота, а не как поломка.
 *
 * Часть случаев написана прямо на промахи наивной реализации: закомментированный
 * режим смешивания, сброс `will-change: auto`, служебное свойство внутри кадра
 * и причина, которая пережила код, который описывала.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { propDecls, keyframeBlocks, stripComments } from './lib/css.mjs';
import {
  declsOf,
  blocksOf,
  BLEND_PROPS,
  nonSeparable,
  overCeiling,
  unjustified,
  costlyKeyframes,
} from './check-layers.mjs';

const source = (css) => [{ css, where: 't.css' }];
const blend = (css) => declsOf(source(css), BLEND_PROPS);
const willChange = (css) => declsOf(source(css), ['will-change']);

test('объявление находится вместе с селектором и строкой', () => {
  const decls = propDecls('.a {\n  color: red;\n  mix-blend-mode: overlay;\n}', 'mix-blend-mode');
  assert.equal(decls.length, 1);
  assert.equal(decls[0].selector, '.a');
  assert.equal(decls[0].value, 'overlay');
  assert.equal(decls[0].line, 3);
});

test('комментарий уносит себя, но не свои переводы строк', () => {
  assert.deepEqual(
    propDecls('/* два\nряда */\n.a { will-change: transform; }', 'will-change')[0].line,
    3,
  );
});

test('закомментированное объявление за объявление не принимается', () => {
  assert.deepEqual(propDecls('.a { /* mix-blend-mode: color; */ }', 'mix-blend-mode'), []);
  assert.equal(stripComments('/* mix-blend-mode: color; */').trim(), '');
});

test('несепарабельные режимы — нарушение', () => {
  const css = `
    .a { mix-blend-mode: color; }
    .b { mix-blend-mode: luminosity; }
    .c { background-blend-mode: hue; }
  `;
  assert.equal(nonSeparable(blend(css), {}).length, 3);
});

test('сепарабельные режимы проходят', () => {
  const css = '.a { mix-blend-mode: overlay; } .b { mix-blend-mode: screen; }';
  assert.deepEqual(nonSeparable(blend(css), {}), []);
});

test('несепарабельный режим с записанной причиной проходит', () => {
  const decls = blend('.shot-tint { mix-blend-mode: color; }');
  assert.deepEqual(nonSeparable(decls, { '.shot-tint': 'причина' }), []);
});

test('причина без объявления — устаревшая запись', () => {
  const problems = nonSeparable(blend('.a { mix-blend-mode: overlay; }'), { '.нет': 'причина' });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /снять запись/);
});

test('потолок считает объявления обоих свойств', () => {
  const decls = blend('.a { mix-blend-mode: screen; } .b { background-blend-mode: multiply; }');
  assert.deepEqual(overCeiling(decls, 2), []);
  assert.equal(overCeiling(decls, 1).length, 1);
});

test('кадры разбираются со своими свойствами', () => {
  const blocks = keyframeBlocks(`@keyframes drift {
    from { transform: translate3d(0, 0, 0); --step: 1; }
    to { transform: translate3d(10px, 0, 0); opacity: 0.5; }
  }`);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].name, 'drift');
  assert.deepEqual([...blocks[0].props].sort(), ['opacity', 'transform']);
});

test('дорогое свойство внутри кадра — нарушение', () => {
  const blocks = blocksOf(source('@keyframes glow { to { box-shadow: 0 0 4px red; } }'));
  const problems = costlyKeyframes(blocks, {});
  assert.equal(problems.length, 1);
  assert.match(problems[0], /box-shadow/);
});

test('дешёвые свойства внутри кадра проходят', () => {
  const css = `@keyframes ok {
    to { transform: scale(1.1); opacity: 1; filter: blur(2px); background-position: 100% 0; }
  }`;
  assert.deepEqual(costlyKeyframes(blocksOf(source(css)), {}), []);
});

test('дорогое свойство с записанной причиной проходит', () => {
  const blocks = blocksOf(source('@keyframes glow { to { box-shadow: 0 0 4px red; } }'));
  assert.deepEqual(costlyKeyframes(blocks, { glow: 'причина' }), []);
});

test('will-change оправдан, если скрипт пишет этот элемент каждый кадр', () => {
  const decls = willChange('.ring.on .chip3 { will-change: transform, opacity; }');
  assert.deepEqual(unjustified(decls, { 'ring.js': ['.chip3'] }, {}), []);
});

test('will-change без причины — нарушение', () => {
  const problems = unjustified(willChange('.ring-in { will-change: transform; }'), {}, {});
  assert.equal(problems.length, 1);
  assert.match(problems[0], /\.ring-in/);
});

test('will-change с записанной причиной проходит', () => {
  const decls = willChange('.blob { will-change: transform; }');
  assert.deepEqual(unjustified(decls, {}, { '.blob': 'бесконечный дрейф' }), []);
});

test('сброс will-change: auto объяснять не нужно', () => {
  const decls = willChange('.stage-in .win { will-change: auto; }');
  assert.deepEqual(unjustified(decls, {}, {}), []);
});

test('причина для элемента, который и так под скриптом, — лишняя запись', () => {
  const decls = willChange('.chip3 { will-change: transform; }');
  const problems = unjustified(decls, { 'ring.js': ['.chip3'] }, { '.chip3': 'причина' });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /лишн/);
});

test('причина без объявления — устаревшая запись и здесь', () => {
  const decls = willChange('.a { will-change: transform; }');
  const problems = unjustified(decls, {}, { '.a': 'причина', '.нет': 'причина' });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /снять запись/);
});
