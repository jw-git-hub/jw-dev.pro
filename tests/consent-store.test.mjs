/**
 * Хранилище согласия на аналитику.
 *
 * Единственное место в проекте, где решается «следить за человеком или нет»,
 * поэтому оно проверяется тестом, а не глазами. Ошибка здесь не падает
 * и не рисуется — она молча включает счётчик тому, кто отказался.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readChoice,
  writeChoice,
  refusesTracking,
  ALLOW,
  DENY,
} from '../src/scripts/lib/consent-store.js';

/** Хранилище браузера в объёме, который нужен модулю. */
function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
  };
}

/** Приватный режим Safari: хранилище есть, но любое обращение бросает. */
function lockedStorage() {
  return {
    getItem() {
      throw new DOMException('denied');
    },
    setItem() {
      throw new DOMException('denied');
    },
  };
}

test('без записи ответа нет', () => {
  assert.equal(readChoice(fakeStorage()), null);
});

test('чужое значение по тому же ключу ответом не считается', () => {
  assert.equal(readChoice(fakeStorage({ 'analytics-consent': 'true' })), null);
});

test('оба ответа читаются', () => {
  assert.equal(readChoice(fakeStorage({ 'analytics-consent': ALLOW })), ALLOW);
  assert.equal(readChoice(fakeStorage({ 'analytics-consent': DENY })), DENY);
});

test('ответ сохраняется и читается обратно', () => {
  const storage = fakeStorage();
  writeChoice(storage, DENY);
  assert.equal(readChoice(storage), DENY);
});

test('запертое хранилище не роняет страницу и ответом не притворяется', () => {
  const storage = lockedStorage();
  assert.equal(readChoice(storage), null);
  assert.doesNotThrow(() => writeChoice(storage, ALLOW));
});

test('«не отслеживать» — это уже ответ', () => {
  assert.equal(refusesTracking({ doNotTrack: '1' }), true);
  assert.equal(refusesTracking({ doNotTrack: '0' }), false);
  assert.equal(refusesTracking({}), false);
});
