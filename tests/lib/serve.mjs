/**
 * Статический сервер над `dist` для браузерных проверок.
 *
 * Свой, а не `astro preview`: в Astro 7 предпросмотр — демон-одиночка. Уже
 * запущенный экземпляр отказывается стартовать вторым и молча отдаёт ту
 * сборку, с которой поднялся. Проверка, читающая вчерашний `dist` и
 * зеленеющая, хуже отсутствующей, поэтому сервер поднимаем сами.
 *
 * Повторяет соглашения сайта: каталог отдаёт свой `index.html`, слеш в конце,
 * несуществующий адрес — `404.html` с кодом 404.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';

const DIST = resolve('dist');
const HOST = '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

const isFile = async (p) => {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
};

/** Путь запроса → файл внутри dist, либо null. Наружу из dist не выпускает. */
async function resolveFile(pathname) {
  const target = resolve(DIST, `.${decodeURIComponent(pathname)}`);
  if (target !== DIST && !target.startsWith(DIST + sep)) return null;

  for (const candidate of [target, join(target, 'index.html')]) {
    if (await isFile(candidate)) return candidate;
  }
  return null;
}

async function send(res, status, file) {
  res.writeHead(status, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(await readFile(file));
}

/** Поднимает сервер на свободном порту. Возвращает адрес и способ погасить. */
export async function serveDist() {
  const server = createServer(async (req, res) => {
    const { pathname } = new URL(req.url, `http://${HOST}`);
    const file = await resolveFile(pathname);
    if (file) return send(res, 200, file);
    await send(res, 404, join(DIST, '404.html'));
  });

  await new Promise((done) => server.listen(0, HOST, done));

  return {
    origin: `http://${HOST}:${server.address().port}`,
    // Без обрыва keep-alive закрытие ждёт таймаута живых соединений браузера.
    stop: () =>
      new Promise((done) => {
        server.closeAllConnections();
        server.close(done);
      }),
  };
}
