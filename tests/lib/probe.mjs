/**
 * Зонд, который уезжает в страницу: считает обращения к геометрии и меряет кадры.
 *
 * Файл подставляется в страницу целиком — `check-runtime.mjs` читает его исходник,
 * снимает слово `export` и отдаёт как обычный скрипт до загрузки страницы. Отсюда
 * два ограничения: **ни одного `import`** и ни одной ссылки наружу, иначе в браузере
 * скрипт упадёт. Взамен зонд остаётся обычным модулем: его читают линтеры и вызывают
 * тесты, а не строка в кавычках, где опечатку видно только по пустому результату.
 *
 * Счётчик считает обращения, а не сами перекомпоновки: браузер раскладывает страницу
 * заново, только если DOM с прошлого раза испачкан. Но обращение — то, чем управляет
 * автор кода, и в кадре прокрутки его быть не должно вовсе: геометрию меряют один раз
 * на `resize`, а не шестьдесят раз в секунду.
 */

/** Свойства, за чтение которых браузер обязан разложить страницу заново. */
const GEOMETRY = [
  'scrollHeight',
  'scrollWidth',
  'clientHeight',
  'clientWidth',
  'offsetHeight',
  'offsetWidth',
  'offsetTop',
  'offsetLeft',
];

/** Прототип, которому свойство принадлежит: `scrollHeight` у Element, `offsetTop` у HTMLElement. */
export function ownerOf(protos, name) {
  return protos.find((proto) => proto && Object.getOwnPropertyDescriptor(proto, name));
}

/** Оборачивает метод счётчиком, не меняя ни аргументов, ни результата. */
function countMethod(host, name, count) {
  if (!host || typeof host[name] !== 'function') return;
  const original = host[name];
  host[name] = function counted(...args) {
    count();
    return original.apply(this, args);
  };
}

/** Оборачивает геттер счётчиком там, где он объявлен. */
function countGetter(protos, name, count) {
  const host = ownerOf(protos, name);
  const descriptor = host && Object.getOwnPropertyDescriptor(host, name);
  if (!descriptor?.get) return;

  const original = descriptor.get;
  Object.defineProperty(host, name, {
    configurable: true,
    enumerable: descriptor.enumerable,
    set: descriptor.set,
    get() {
      count();
      return original.call(this);
    },
  });
}

/**
 * Цепочка `requestAnimationFrame`: длительность кадра — промежуток между вызовами.
 *
 * Меряем именно промежуток, а не работу внутри кадра: посетитель чувствует рывок,
 * когда кадр не вышел вовремя, независимо от того, чем браузер был занят.
 */
function recordFrames(scope, state) {
  if (typeof scope.requestAnimationFrame !== 'function') return;

  const tick = (now) => {
    if (state.recording && state.previous) state.frames.push(now - state.previous);
    state.previous = now;
    scope.requestAnimationFrame(tick);
  };
  scope.requestAnimationFrame(tick);
}

/** Ставит счётчики и открывает `__probe` с управлением записью. */
export function installProbe(scope) {
  const host = scope || globalThis;
  const state = { reads: 0, frames: [], recording: false, previous: 0 };
  const count = () => {
    if (state.recording) state.reads += 1;
  };

  const protos = [host.Element?.prototype, host.HTMLElement?.prototype];
  countMethod(host.Element?.prototype, 'getBoundingClientRect', count);
  countMethod(host.Element?.prototype, 'getClientRects', count);
  countMethod(host, 'getComputedStyle', count);
  for (const name of GEOMETRY) countGetter(protos, name, count);
  recordFrames(host, state);

  host.__probe = {
    start: () => Object.assign(state, { reads: 0, frames: [], recording: true, previous: 0 }),
    stop: () => Object.assign(state, { recording: false }),
    result: () => ({ reads: state.reads, frames: state.frames.slice() }),
  };
  return host.__probe;
}
