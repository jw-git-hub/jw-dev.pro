/**
 * Проверки самих ворот `check-runtime`.
 *
 * Ворота, которые меряют браузер, ошибаются тише всех остальных: пустой список
 * кадров даёт нулевую медиану, а нулевая медиана проходит любой порог. Зелёные
 * ворота выглядят одинаково и когда всё хорошо, и когда зонд не доехал
 * до страницы, — поэтому и медиана, и счётчик, и способ доставки зонда
 * проверяются по отдельности.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { installProbe, ownerOf } from './lib/probe.mjs';
import { longFrameShare, percentile, problemsOf, styleElementsOf } from './check-runtime.mjs';

const LIMITS = { stylePerFrame: 150, reads: 320 };

/** Подставной браузер: два прототипа с геометрией, как Element и HTMLElement. */
function fakeScope() {
  class Element {
    getBoundingClientRect() {
      return { top: 1 };
    }
    getClientRects() {
      return [];
    }
  }
  class HTMLElement extends Element {}
  Object.defineProperty(Element.prototype, 'scrollHeight', { configurable: true, get: () => 100 });
  Object.defineProperty(HTMLElement.prototype, 'offsetTop', { configurable: true, get: () => 7 });

  return { Element, HTMLElement, getComputedStyle: () => ({}) };
}

test('перцентиль берёт значение из ряда, а не среднее соседей', () => {
  const numbers = [16, 17, 16, 50, 17];
  assert.equal(percentile(numbers, 50), 17);
  assert.equal(percentile(numbers, 95), 50);
});

test('пустой ряд кадров даёт ноль, а не NaN', () => {
  assert.equal(percentile([], 50), 0);
});

test('порог нарушен строгим превышением, равенство проходит', () => {
  const measured = { stylePerFrame: 150, reads: 320 };
  assert.deepEqual(problemsOf(measured, LIMITS, '/ru/'), []);
});

test('каждый нарушенный порог называется своей строкой', () => {
  const measured = { stylePerFrame: 279, reads: 12000 };
  const problems = problemsOf(measured, LIMITS, '/ru/');
  assert.equal(problems.length, 2);
  assert.match(problems[0], /пересчитано элементов на кадр 279, порог 150/);
  assert.match(problems[1], /обращений к геометрии за прокрутку 12000, порог 320/);
});

/**
 * Считаются элементы, а не события. Разница не теоретическая: у дерева `9b2b0f9^`
 * событий пересчёта на кадр даже меньше, чем у здорового, — 1,43 против 1,55, —
 * просто каждое из них перебирает всю страницу вместо десятка узлов.
 */
test('пересчёт всей страницы дороже частого пересчёта мелочи', () => {
  const healthy = Array.from({ length: 10 }, () => ({
    name: 'UpdateLayoutTree',
    args: { elementCount: 6 },
  }));
  const sick = [{ name: 'UpdateLayoutTree', args: { elementCount: 1420 } }];

  assert.ok(sick.length < healthy.length, 'у больного событий меньше');
  assert.equal(styleElementsOf(healthy), 60);
  assert.equal(styleElementsOf(sick), 1420);
});

test('чужие события трассировки в счёт не идут', () => {
  const events = [
    { name: 'UpdateLayoutTree', args: { elementCount: 7 } },
    { name: 'Layout', args: { beginData: { dirtyObjects: 900 } } },
    { name: 'Paint', args: {} },
  ];
  assert.equal(styleElementsOf(events), 7);
});

test('событие без счётчика элементов не роняет подсчёт', () => {
  assert.equal(styleElementsOf([{ name: 'UpdateLayoutTree' }]), 0);
  assert.equal(styleElementsOf([]), 0);
});

/**
 * Почему в воротах нет ни одного порога на время. Длительность кадра квантована
 * развёрткой: p95 умеет только перепрыгнуть с 16,7 на 33,3 целиком. Два по сути
 * одинаковых замера, 4% и 8% пропущенных кадров, дают его по разные стороны
 * любого порога между ними — отсюда и красное на чистом дереве.
 */
test('перцентиль кадра прыгает через порог там, где доля растёт плавно', () => {
  const healthy = [...Array(96).fill(16.7), ...Array(4).fill(33.3)];
  const worse = [...Array(92).fill(16.7), ...Array(8).fill(33.3)];

  assert.equal(percentile(healthy, 95), 16.7);
  assert.equal(percentile(worse, 95), 33.3, 'перцентиль отвечает скачком, а не ростом');

  assert.equal(longFrameShare(healthy, 25), 4);
  assert.equal(longFrameShare(worse, 25), 8);
});

test('пустой ряд кадров даёт долю ноль, а не NaN', () => {
  assert.equal(longFrameShare([], 25), 0);
});

test('геометрию ищем там, где она объявлена: offsetTop не у Element', () => {
  const { Element, HTMLElement } = fakeScope();
  const protos = [Element.prototype, HTMLElement.prototype];
  assert.equal(ownerOf(protos, 'offsetTop'), HTMLElement.prototype);
  assert.equal(ownerOf(protos, 'scrollHeight'), Element.prototype);
  assert.equal(ownerOf(protos, 'нетТакогоСвойства'), undefined);
});

test('счётчик молчит до старта записи и считает после', () => {
  const scope = fakeScope();
  const probe = installProbe(scope);
  const node = new scope.HTMLElement();

  const touchEverything = () => {
    void node.scrollHeight;
    void node.offsetTop;
    node.getBoundingClientRect();
    scope.getComputedStyle(node);
  };

  touchEverything();
  assert.equal(probe.result().reads, 0, 'до старта обращения не считаются');

  probe.start();
  touchEverything();
  probe.stop();
  assert.equal(probe.result().reads, 4);

  touchEverything();
  assert.equal(probe.result().reads, 4, 'после остановки счёт не растёт');
});

test('обёртка не меняет ни значения геттера, ни результата метода', () => {
  const scope = fakeScope();
  installProbe(scope);
  const node = new scope.HTMLElement();

  assert.equal(node.scrollHeight, 100);
  assert.equal(node.offsetTop, 7);
  assert.deepEqual(node.getBoundingClientRect(), { top: 1 });
});

test('повторный старт обнуляет прошлый замер', () => {
  const scope = fakeScope();
  const probe = installProbe(scope);
  const node = new scope.Element();

  probe.start();
  node.getBoundingClientRect();
  probe.start();
  probe.stop();
  assert.equal(probe.result().reads, 0);
});

/**
 * Зонд уезжает в браузер как классический скрипт. `import` там не работает,
 * а падает он в консоли страницы, куда ворота не смотрят: результатом стал бы
 * пустой замер и зелёные ворота.
 */
test('в зонде нет ни одного import, иначе в браузере он не запустится', async () => {
  const source = await readFile(new URL('./lib/probe.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /^\s*import\s/m);
  // Именно начало строки: слово `export` законно живёт в комментарии зонда.
  assert.doesNotMatch(source.replace(/^export /gm, ''), /^export\b/m);
});
