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
import { percentile, problemsOf } from './check-runtime.mjs';

const LIMITS = { frameMedian: 20, frameP95: 60, reads: 320 };

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
  const measured = { frameMedian: 20, frameP95: 60, reads: 320 };
  assert.deepEqual(problemsOf(measured, LIMITS, '/ru/'), []);
});

test('каждый нарушенный порог называется своей строкой', () => {
  const measured = { frameMedian: 31, frameP95: 90, reads: 12000 };
  const problems = problemsOf(measured, LIMITS, '/ru/');
  assert.equal(problems.length, 3);
  assert.match(problems[0], /медиана кадра 31мс, порог 20мс/);
  assert.match(problems[2], /обращений к геометрии за прокрутку 12000, порог 320/);
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
