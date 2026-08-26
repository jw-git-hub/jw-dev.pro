/**
 * Проверки самих ворот `check-frames`. Разбор регулярками ошибается молча:
 * пропущенный случай выглядит как зелёные ворота, а не как поломка.
 *
 * Случаи взяты из ревизии 26.08.2026 — три конфликта, которые нашлись руками,
 * и один соседний селектор, на котором ошибётся наивная реализация.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { transitionDecls, varConsumers, inScope } from './lib/css.mjs';
import { frameProps, conflicts } from './check-frames.mjs';

test('transition без имени свойства помечен как «список не задан»', () => {
  const decls = transitionDecls('.hdr { transition: 0.5s var(--e); }');
  assert.deepEqual(
    decls.map((d) => d.prop),
    [null],
  );
});

test('transition-property: all помечен так же', () => {
  const decls = transitionDecls('.a { transition-property: all; }');
  assert.equal(decls[0].prop, 'all');
});

test('явный список свойств разбирается по одному на свойство', () => {
  const decls = transitionDecls(`.a {
    transition:
      opacity 0.35s var(--e),
      transform 0.35s var(--e);
  }`);
  assert.deepEqual(
    decls.map((d) => d.prop),
    ['opacity', 'transform'],
  );
});

test('transition: none нарушением не считается', () => {
  const decls = transitionDecls('.a { transition: none !important; }');
  assert.deepEqual(decls, []);
});

test('transition-duration за transition не принимается', () => {
  assert.deepEqual(transitionDecls('* { transition-duration: 0.01ms; }'), []);
});

test('селектор внутри @media доезжает до правила', () => {
  const decls = transitionDecls('@media (max-width: 900px) { .prail i { transition: top 0.9s; } }');
  assert.equal(decls[0].selector, '.prail i');
});

test('покадровые свойства собираются из обеих форм записи', () => {
  const js = `
    arc.style.strokeDashoffset = String(88);
    mark.el.style.setProperty('transform', shift);
    chip.style.removeProperty('opacity');
  `;
  assert.deepEqual([...frameProps(js)].sort(), ['stroke-dashoffset', 'transform']);
});

test('косвенность через var() разворачивается в свойство-потребитель', () => {
  const consumers = varConsumers('.win { transform: translate3d(var(--dx, 0), var(--dy, 0), 0); }');
  assert.deepEqual([...consumers.get('--dx')], ['transform']);
});

test('переход по свойству, которое скрипт пишет каждый кадр, — нарушение', () => {
  const found = conflicts({
    targets: ['.dock-p .fg'],
    props: new Set(['stroke-dashoffset']),
    decls: transitionDecls('.dock-p .fg { transition: stroke-dashoffset 0.25s linear; }'),
  });
  assert.equal(found.length, 1);
  assert.equal(found[0].prop, 'stroke-dashoffset');
});

test('переход на соседнем селекторе того же файла не трогается', () => {
  const found = conflicts({
    targets: ['.prail i'],
    props: new Set(['transform']),
    decls: transitionDecls('.pstep { transition: transform 0.6s var(--e); }'),
  });
  assert.deepEqual(found, []);
});

test('цель узнаётся под уточнением и под предком', () => {
  assert.ok(inScope('.prail i.on', '.prail i'));
  assert.ok(inScope('.proc .prail i', '.prail i'));
  assert.ok(inScope('.a, .prail i', '.prail i'));
});

test('похожее имя класса за цель не принимается', () => {
  assert.equal(inScope('.pstep-i', '.prail i'), false);
  assert.equal(inScope('.prail', '.prail i'), false);
});
