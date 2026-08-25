/**
 * Lighthouse на мобильном экране: скорость, доступность, надёжность, поиск.
 *
 * Порог по скорости — 95, как обещано в плане. Замер идёт против своего
 * статического сервера без сжатия и заголовков кеша, а Nginx на проде и то,
 * и другое включает (`deploy/nginx.conf`). Значит здешняя цифра заведомо
 * ниже боевой: ворота обязаны быть пессимистом, иначе обещание не обещание.
 *
 * Из трёх прогонов берём средний. Один прогон скачет на пару баллов от
 * загрузки машины, и красные ворота без единой правки в коде — верный способ
 * приучить всех нажимать «перезапустить».
 */
import { createServer } from 'node:net';
import { chromium } from 'playwright';
import lighthouse from 'lighthouse';
import { serveDist } from './lib/serve.mjs';
import { report } from './lib/report.mjs';

const THRESHOLDS = {
  performance: 95,
  accessibility: 100,
  'best-practices': 100,
  seo: 100,
};

const RUNS = 3;
const MOBILE = { mobile: true, width: 390, height: 844, deviceScaleFactor: 2 };

// По одной странице каждого типа плюс английская главная: на неё приходят
// из поиска не с русского рынка, и весит она столько же.
const URLS = ['/ru/', '/ru/work/vn-neva-beauty/', '/ru/log/unicode-range-fonts/', '/'];

/** Свободный порт для отладочного протокола: 9222 может быть занят чужим Chrome. */
const freePort = () =>
  new Promise((done) => {
    const probe = createServer();
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => done(port));
    });
  });

const median = (numbers) => [...numbers].sort((a, b) => a - b)[Math.floor(numbers.length / 2)];

/** Средний балл каждой категории по нескольким прогонам одной страницы. */
async function scoresFor(url, port) {
  const runs = [];
  for (let i = 0; i < RUNS; i += 1) {
    const { lhr } = await lighthouse(url, {
      port,
      output: 'json',
      logLevel: 'error',
      formFactor: 'mobile',
      screenEmulation: MOBILE,
    });
    runs.push(lhr.categories);
  }

  return Object.fromEntries(
    Object.keys(THRESHOLDS).map((key) => [
      key,
      median(runs.map((categories) => Math.round(categories[key].score * 100))),
    ]),
  );
}

const port = await freePort();
const site = await serveDist();
const browser = await chromium.launch({ args: [`--remote-debugging-port=${port}`] });

const problems = [];
for (const url of URLS) {
  const scores = await scoresFor(site.origin + url, port);
  for (const [category, threshold] of Object.entries(THRESHOLDS)) {
    if (scores[category] < threshold) {
      problems.push(`${url} — ${category} ${scores[category]}, порог ${threshold}`);
    }
  }
  const line = Object.entries(scores)
    .map(([key, value]) => `${key} ${value}`)
    .join(' · ');
  console.log(`    ${url} — ${line}`);
}

await browser.close();
await site.stop();

process.exit(report('Lighthouse на мобильном', problems, URLS.length, 'страниц'));
