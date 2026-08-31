/**
 * Мастер-кадры кейсов по регламенту CONTENT-CASES §3.
 *
 * Скриптом, а не руками, потому что размеры в регламенте точные, а `check-content`
 * сверяет их на каждой сборке: кадр другого размера или тяжелее 400 КБ до прода
 * не доедет. Пересъёмка после правки чужого сайта — один прогон, а не полчаса
 * кадрирования заново.
 *
 * Снимает только то, что открыто в вебе. Кадры из Telegram (`shotKind: telegram`)
 * и закрытых стендов машине недоступны — они снимаются владельцем со своего клиента.
 */
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { report } from '../tests/lib/report.mjs';

/** Мастер вдвое плотнее CSS-пикселя — про это `@2x` в имени файла. */
const DENSITY = 2;

/** Ширина окна при съёмке десктопа (§3). Высота выводится из пропорции роли. */
const SHOT_WIDTH = 1440;

/** Качество WebP и потолок веса — оба из §3. */
const QUALITY = 82;
const MAX_BYTES = 400 * 1024;

/** Роли и размеры мастеров (§3). Тот же список сверяет `check-content`. */
const ROLES = {
  card: { file: 'card@2x.webp', width: 1600, height: 1000 },
  cover: { file: 'cover@2x.webp', width: 1920, height: 960 },
  og: { file: 'og.webp', width: 1200, height: 630 },
};

const SHOTS_DIR = 'src/content/cases/shots';

/** Что снимаем. Только живые публичные адреса — остальное машине не видно. */
const TARGETS = [
  { slug: 'vn-neva-beauty', url: 'https://vn.neva.beauty', roles: ['card', 'cover'] },
  { slug: 'psy-aleksander', url: 'https://psy-krasnogor.pro', roles: ['card', 'cover'] },
];

/** Окно под роль: ширина из регламента, высота — чтобы кадр вышел без обрезки. */
function viewportFor(role) {
  const { width, height } = ROLES[role];
  return { width: SHOT_WIDTH, height: Math.round((SHOT_WIDTH * height) / width) };
}

/**
 * Страница, готовая к съёмке: тёмная тема (§3), движение выключено.
 *
 * Без `reducedMotion` кадр ловит анимацию появления в случайной фазе,
 * и два прогона подряд дают разные картинки.
 */
async function openPage(browser, url, role) {
  const context = await browser.newContext({
    viewport: viewportFor(role),
    deviceScaleFactor: DENSITY,
    colorScheme: 'dark',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  // Тело уезжает в браузер, где `document` есть; ESLint судит его по правилам Node.
  // eslint-disable-next-line no-undef
  await page.evaluate(() => document.fonts.ready);
  return { page, context };
}

/** Мастер-файл роли: снимок вдвое больше, ужатый ровно в размер регламента. */
async function writeShot(raw, slug, role, problems) {
  const { file, width, height } = ROLES[role];
  const path = `${SHOTS_DIR}/${slug}/${file}`;
  await mkdir(dirname(path), { recursive: true });
  const info = await sharp(raw).resize(width, height).webp({ quality: QUALITY }).toFile(path);
  if (info.size > MAX_BYTES) {
    problems.push(`${slug}/${file}: ${Math.round(info.size / 1024)} КБ, потолок 400 КБ`);
  }
  return `${path} — ${width}×${height}, ${Math.round(info.size / 1024)} КБ`;
}

const problems = [];
const browser = await chromium.launch();
let shot = 0;

for (const target of TARGETS) {
  for (const role of target.roles) {
    const { page, context } = await openPage(browser, target.url, role);
    const raw = await page.screenshot();
    await context.close();
    console.log(`  ${await writeShot(raw, target.slug, role, problems)}`);
    shot += 1;
  }
}

await browser.close();
report('мастер-кадры', problems, `снято ${shot}`);
