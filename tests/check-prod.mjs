/**
 * Прод после выката.
 *
 * Все остальные ворота смотрят в `dist` — в то, что собрал CI. Но посетителю
 * страницы отдаёт Nginx, а его конфигурацию копирует на сервер человек
 * (`deploy/README.md`), а не выкат. В этом зазоре живёт всё, чего не видит
 * ни одна проверка: заголовки безопасности, редиректы, страницы 404, типы
 * содержимого, кеширование, сжатие. Правка конфига руками роняет любое
 * из этого молча.
 *
 * Прежняя проверка выката была одной строкой — «отвечает ли `/` двумястами».
 * Она ловит полное падение стенда и больше ничего: сайт без CSP, с лентой
 * под чужим типом и с заглушкой Nginx вместо своей 404 проходил её зелёным.
 *
 * Заголовки сверяются не со списком в этом файле, а с самим
 * `deploy/snippets/security-headers.conf`. Вопрос ворот — «отдаёт ли сервер
 * то, что обещает репозиторий», а не «то, что я однажды сюда вписал»:
 * иначе расхождение репозитория с сервером проверяемо не было бы вовсе.
 *
 * Три правила из конфига стоят здесь потому, что уже ломались однажды и
 * объяснены комментариями на месте: тип у русской ленты, `Cache-Control`
 * у страниц-каталогов и заголовки внутри location с собственным `add_header`.
 */
import { readFile } from 'node:fs/promises';
import { report } from './lib/report.mjs';

const SITE = process.env.PROD_ORIGIN ?? 'https://jw-dev.pro';
const SNIPPET = 'deploy/snippets/security-headers.conf';

/** По одной странице на каждый location, который включает заголовки. */
const GUARDED = [
  '/',
  '/ru/',
  '/work/vn-neva-beauty/',
  '/rss.xml',
  '/ru/rss.xml',
  '/site.webmanifest',
  '/og/en/home.png',
];

/** Страницы, у которых сверяются карточка шаринга и ссылки наружу. */
const SAMPLE = ['/', '/ru/', '/work/vn-neva-beauty/', '/log/page-weight-after-tilda/'];

const CONTENT_TYPES = [
  ['/robots.txt', 'text/plain'],
  ['/sitemap-index.xml', 'text/xml'],
  ['/rss.xml', 'application/rss+xml'],
  ['/ru/rss.xml', 'application/rss+xml'],
  ['/site.webmanifest', 'application/manifest+json'],
];

const NO_CACHE = ['/', '/ru/', '/work/vn-neva-beauty/', '/log/'];
const LONG_CACHE = ['/og/en/home.png', '/site.webmanifest'];

const MISSING = '/страницы-с-таким-адресом-нет/';
const OG_SIZE = { width: 1200, height: 630 };

/** Все адреса выводятся из SITE: иначе PROD_ORIGIN слушала бы только часть
 *  проверок, а остальные молча ходили бы в прод — в том числе на приёмке. */
const ORIGIN = new URL(SITE);
const WWW = `${ORIGIN.protocol}//www.${ORIGIN.host}`;
const INSECURE = `http://${ORIGIN.host}`;
const IS_DOMAIN = ORIGIN.hostname.includes('.') && !/^[\d.]+$/.test(ORIGIN.hostname);

const get = (path, init) => fetch(new URL(path, SITE), { redirect: 'manual', ...init });
const html = (r) => r.text();

/** Ожидаемые заголовки берём из конфига стенда, а не из этого файла. */
async function promisedHeaders() {
  const conf = await readFile(SNIPPET, 'utf8');
  const found = [...conf.matchAll(/^\s*add_header\s+(\S+)\s+"([^"]*)"\s+always;/gm)];
  return found.map(([, name, value]) => [name.toLowerCase(), value]);
}

async function checkSecurityHeaders(fail) {
  const promised = await promisedHeaders();
  if (promised.length < 6) fail(`в ${SNIPPET} разобрано только ${promised.length} заголовков`);

  for (const path of GUARDED) {
    const r = await get(path);
    for (const [name, value] of promised) {
      const live = r.headers.get(name);
      if (live === null) fail(`${path}: нет заголовка ${name}`);
      else if (live !== value) fail(`${path}: ${name} на сервере не тот, что в репозитории`);
    }
  }
}

async function checkRedirects(fail) {
  // Переезд обязан быть одним переходом: цепочка стоит посетителю ещё одного
  // соединения, а поисковику — размытого веса ссылки.
  const target = `${SITE}/ru/log/`;
  const moves = [[`${INSECURE}/ru/log/`, target]];
  // Имя www бывает только у настоящего домена: на стенде по адресу
  // или по localhost такого узла нет, и проверка сорвалась бы на резолве.
  if (IS_DOMAIN)
    moves.push([`http://www.${ORIGIN.host}/ru/log/`, target], [`${WWW}/ru/log/`, target]);
  for (const [from, to] of moves) {
    const r = await fetch(from, { redirect: 'manual' });
    if (r.status !== 301) fail(`${from}: код ${r.status}, а не 301`);
    if (r.headers.get('location') !== to)
      fail(`${from} ведёт на ${r.headers.get('location')}, а не на ${to}`);
  }
}

async function checkNotFoundPages(fail) {
  // У каждого языка своя 404: англоязычная страница тому, кто ходит по /ru/,
  // теряет его на первой же битой ссылке.
  for (const [path, lang] of [
    [MISSING, 'en'],
    [`/ru${MISSING}`, 'ru'],
  ]) {
    const r = await get(path);
    if (r.status !== 404) fail(`${path}: код ${r.status}, а не 404`);
    const page = await html(r);
    if (!page.includes(`<html lang="${lang}"`)) fail(`${path}: отдана не ${lang}-страница сайта`);
    if (!page.includes('</head>')) fail(`${path}: это заглушка Nginx, а не страница сайта`);
  }
}

async function checkContentTypes(fail) {
  for (const [path, expected] of CONTENT_TYPES) {
    const r = await get(path);
    const live = r.headers.get('content-type') ?? '';
    if (r.status !== 200) fail(`${path}: код ${r.status}`);
    else if (!live.startsWith(expected)) fail(`${path}: тип ${live}, а не ${expected}`);
  }
}

async function checkCaching(fail) {
  // HTML не кешируем: иначе выкаченная правка не доедет до посетителя.
  for (const path of NO_CACHE) {
    const live = (await get(path)).headers.get('cache-control');
    if (live !== 'no-cache') fail(`${path}: Cache-Control «${live}», а страницы кешировать нельзя`);
  }
  for (const path of LONG_CACHE) {
    const live = (await get(path)).headers.get('cache-control') ?? '';
    if (!live.includes('max-age='))
      fail(`${path}: Cache-Control «${live}», а у файла должен быть долгий кеш`);
  }
}

const ogImage = (page) => page.match(/<meta[^>]+property="og:image"[^>]*content="([^"]*)"/i)?.[1];

/** Размер PNG лежит в заголовке IHDR — двенадцатью байтами после подписи. */
const pngSize = (buf) => ({ width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) });

async function checkShareImages(fail) {
  // Карточки собираются в сборке, но заливаются rsync-ом и раздаются Nginx:
  // «картинка есть в dist» и «мессенджер её показал» — разные утверждения.
  for (const path of SAMPLE) {
    const image = ogImage(await html(await get(path)));
    if (!image?.startsWith('https://')) {
      fail(`${path}: og:image не абсолютный адрес — ${image}`);
      continue;
    }
    const r = await get(new URL(image).pathname);
    if (!r.ok) {
      fail(`${path}: карточка ${image} не залита — код ${r.status}`);
      continue;
    }
    const size = pngSize(Buffer.from(await r.arrayBuffer()));
    if (size.width !== OG_SIZE.width || size.height !== OG_SIZE.height)
      fail(
        `${path}: карточка ${size.width}×${size.height}, а мессенджеры ждут ${OG_SIZE.width}×${OG_SIZE.height}`,
      );
  }
}

async function checkOutwardLinks(fail) {
  // Canonical и hreflang — единственные ссылки, которые сайт даёт наружу
  // от своего имени. Битая среди них уводит поисковик, а не посетителя,
  // и потому замечается последней.
  for (const path of SAMPLE) {
    const page = await html(await get(path));
    const canonical = page.match(/<link[^>]+rel="canonical"[^>]*href="([^"]*)"/i)?.[1];
    const alternates = [...page.matchAll(/<link[^>]+rel="alternate"[^>]*href="([^"]*)"/gi)].map(
      (m) => m[1],
    );
    for (const href of [canonical, ...alternates].filter(Boolean)) {
      if (!href.startsWith('https://')) fail(`${path}: ссылка наружу не абсолютная — ${href}`);
      const r = await get(new URL(href).pathname, { method: 'HEAD' });
      if (r.status !== 200) fail(`${path}: ссылка наружу ${href} отвечает ${r.status}`);
    }
  }
}

async function checkContactReceiver(fail) {
  // Форма — главный призыв сайта, и живёт она в отдельном контейнере:
  // он может умереть, а статика останется зелёной. Тело пустое, поэтому
  // заявка никуда не уходит; приёмник отвечает переездом на форму, как
  // и посетителю без JS. Упавший контейнер дал бы 502.
  const r = await get('/api/contact', { method: 'POST', body: new URLSearchParams() });
  if (r.status !== 303)
    fail(`приёмник формы отвечает ${r.status}, а не 303 — контейнер не отвечает`);
  const back = r.headers.get('location') ?? '';
  if (!back.startsWith(SITE) && !back.startsWith('/'))
    fail(`приёмник уводит на чужой адрес: ${back}`);
}

async function checkHealthzHidden(fail) {
  // Состояние стенда гостей сайта не касается. Закрывает его не правило
  // `deny`, а неопубликованный порт: `allow`/`deny` рядом с `return`
  // не исполняются вовсе — `return` живёт в фазе rewrite, которая идёт
  // раньше фазы access. Однажды этот адрес уже отдавал «ok» всему интернету.
  for (const origin of new Set([INSECURE, SITE])) {
    const r = await fetch(`${origin}/healthz`, { redirect: 'manual' });
    if (r.status === 200) fail(`${origin}/healthz открыт наружу`);
  }
}

async function checkCompression(fail) {
  // Замер Lighthouse в CI идёт без сжатия, поэтому обещание «на проде будет
  // выше» держится только на этой настройке сервера.
  for (const path of ['/', '/ru/']) {
    const r = await get(path, { headers: { 'accept-encoding': 'gzip' } });
    if (r.headers.get('content-encoding') !== 'gzip') fail(`${path}: отдаётся без сжатия`);
  }
}

const CHECKS = [
  ['заголовки безопасности', checkSecurityHeaders],
  ['переезд на канонический адрес', checkRedirects],
  ['страницы 404 на обоих языках', checkNotFoundPages],
  ['типы содержимого', checkContentTypes],
  ['кеширование', checkCaching],
  ['карточки шаринга залиты', checkShareImages],
  ['ссылки наружу', checkOutwardLinks],
  ['приёмник формы жив', checkContactReceiver],
  ['живость стенда не видна снаружи', checkHealthzHidden],
  ['сжатие', checkCompression],
];

const problems = [];
for (const [name, run] of CHECKS) {
  const fail = (why) => problems.push(`${name}: ${why}`);
  try {
    await run(fail);
  } catch (error) {
    fail(`проверка сорвалась — ${error.message.split('\n')[0]}`);
  }
}

process.exit(report(`прод ${SITE}`, problems, CHECKS.length, 'проверок'));
