/**
 * Схема контента: правила, которых не выражает zod из `src/content.config.ts`.
 *
 * Astro проверяет типы и длины при сборке. Здесь — то, что живёт между файлами
 * и между языками: пара RU↔EN, счёт предложений в абзацах, уникальность порядка.
 * Дыра в EN — невыполненная работа, дыра в RU — опечатка; и то и другое валит
 * сборку, а не всплывает на живом сайте.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';
import { parse } from 'yaml';
import { report } from './lib/report.mjs';

const CASES_DIR = 'src/content/cases';
const SOURCE = 'ru';
const TARGET = 'en';

/** Слаг живёт в адресе `/work/<slug>/`: кириллица и пробелы там недопустимы. */
const SLUG = /^[a-z0-9-]+$/;

/** Конец предложения: точка, восклицательный или вопросительный знак перед пробелом или концом строки. */
const SENTENCE_END = /[.!?](?:\s|$)/g;

/** Поля, которые переводятся: они обязаны быть в обоих документах. */
const TRANSLATED = ['kind', 'summary', 'metrics', 'logLine', 'body'];

/** Роли снимков, без которых кейс не показать (CONTENT-CASES §3). */
const REQUIRED_SHOTS = ['card', 'cover'];

/**
 * Размер мастер-кадра по роли — CONTENT-CASES §3. Пропорция здесь не украшение:
 * слот карточки жёстко 16:10, и кадр другой формы сборка обрежет по своему
 * усмотрению — как правило, по самому важному месту.
 */
const SHOT_SIZE = {
  card: [1600, 1000],
  cover: [1920, 960],
  feature: [1600, 1000],
  proof: [1600, 1000],
  before: [1600, 1000],
  og: [1200, 630],
};

/** Потолок веса одного мастер-кадра, байты. */
const SHOT_MAX_BYTES = 400 * 1024;

function countSentences(text) {
  return (text.match(SENTENCE_END) ?? []).length;
}

/** Front-matter между первой и второй строкой `---`. */
function frontMatter(raw, where, problems) {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    problems.push(`${where}: нет front-matter между «---»`);
    return null;
  }
  try {
    return parse(match[1]);
  } catch (error) {
    problems.push(`${where}: YAML не разбирается — ${error.message.split('\n')[0]}`);
    return null;
  }
}

async function readCases(locale, problems) {
  const dir = `${CASES_DIR}/${locale}`;
  const files = (await readdir(dir)).filter((name) => name.endsWith('.md'));
  const cases = new Map();
  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const data = frontMatter(
      await readFile(`${dir}/${file}`, 'utf8'),
      `${locale}/${file}`,
      problems,
    );
    if (data) cases.set(slug, data);
  }
  return cases;
}

/** Абзац разбора: один абзац в 2–4 предложения, иначе это уже не карточка, а статья. */
function checkParagraphs(body, where, problems) {
  for (const [part, text] of Object.entries(body ?? {})) {
    const sentences = countSentences(text);
    if (sentences < 2 || sentences > 4) {
      problems.push(`${where}: body.${part} — предложений ${sentences}, нужно 2–4`);
    }
  }
}

async function checkSource(slug, data, file, problems) {
  const where = `${SOURCE}/${slug}`;
  if (!SLUG.test(slug))
    problems.push(`${where}: слаг должен быть из строчной латиницы, цифр и дефисов`);

  // Одно предложение — требование карточки: два не помещаются под обложкой.
  const sentences = countSentences(data.summary ?? '');
  if (sentences !== 1)
    problems.push(`${where}: summary — предложений ${sentences}, нужно ровно одно`);

  // logLine и summary стоят в разных местах и не должны совпадать дословно.
  if (data.logLine === data.summary) problems.push(`${where}: logLine дословно повторяет summary`);

  if (data.link === null && !data.linkNote) {
    problems.push(`${where}: при link: null нужен linkNote — почему демо недоступно`);
  }
  checkParagraphs(data.body, where, problems);
  await checkShots(data.screenshots, file, where, problems);
}

/** Пока снимков нет, слот рисует условную вёрстку. Но неполный набор — уже ошибка. */
async function checkShots(screenshots, file, where, problems) {
  if (!screenshots?.length) return;
  const roles = screenshots.map((shot) => shot.role);
  for (const role of REQUIRED_SHOTS) {
    if (!roles.includes(role)) problems.push(`${where}: нет обязательного снимка «${role}»`);
  }
  for (const shot of screenshots) {
    await checkShotFile(shot, file, where, problems);
  }
}

/** Регламент §3 стережёт сборка, а не память: размер, пропорция и вес мастер-кадра. */
async function checkShotFile(shot, file, where, problems) {
  const path = resolve(dirname(file), shot.src);
  const [width, height] = SHOT_SIZE[shot.role] ?? [];
  let bytes;
  try {
    bytes = (await stat(path)).size;
  } catch {
    problems.push(`${where}: снимка «${shot.src}» нет на диске`);
    return;
  }
  if (bytes > SHOT_MAX_BYTES) {
    problems.push(`${where}: «${shot.src}» весит ${Math.round(bytes / 1024)} КБ, потолок 400 КБ`);
  }
  const meta = await sharp(path).metadata();
  if (meta.width !== width || meta.height !== height) {
    problems.push(
      `${where}: «${shot.src}» — ${meta.width}×${meta.height}, роль «${shot.role}» требует ${width}×${height}`,
    );
  }
}

function checkTranslation(slug, source, target, problems) {
  const where = `${TARGET}/${slug}`;
  for (const field of TRANSLATED) {
    if (target[field] === undefined) problems.push(`${where}: поле «${field}» не переведено`);
  }
  // Название — это домен или имя репозитория. Перевод его ломает: адрес станет другим.
  if (target.title !== source.title) {
    problems.push(`${where}: title «${target.title}» расходится с русским «${source.title}»`);
  }
  if (source.metrics?.length !== target.metrics?.length) {
    problems.push(
      `${where}: метрик ${target.metrics?.length}, в русском ${source.metrics?.length}`,
    );
  }
  if (source.link === null && !target.linkNote) {
    problems.push(`${where}: при link: null нужен переведённый linkNote`);
  }
  if (countSentences(target.summary ?? '') !== 1) {
    problems.push(`${where}: summary — нужно ровно одно предложение`);
  }
  checkParagraphs(target.body, where, problems);

  const sourceRoles = (source.screenshots ?? []).map((shot) => shot.role).join(',');
  const targetRoles = (target.screenshots ?? []).map((shot) => shot.role).join(',');
  if (sourceRoles !== targetRoles) problems.push(`${where}: роли снимков не совпадают с русскими`);
}

const problems = [];
const source = await readCases(SOURCE, problems);
const target = await readCases(TARGET, problems);

const orders = new Map();
for (const [slug, data] of source) {
  await checkSource(slug, data, `${CASES_DIR}/${SOURCE}/${slug}.md`, problems);

  // Порядок задаёт место в сетке: два кейса на одной позиции встанут как повезёт.
  if (orders.has(data.order))
    problems.push(`order ${data.order} занят и «${slug}», и «${orders.get(data.order)}»`);
  orders.set(data.order, slug);

  const pair = target.get(slug);
  if (!pair) problems.push(`${SOURCE}/${slug}: нет английской пары ${TARGET}/${slug}.md`);
  else checkTranslation(slug, data, pair, problems);
}

for (const slug of target.keys()) {
  if (!source.has(slug))
    problems.push(`${TARGET}/${slug}: нет русского оригинала — русский источник истины`);
}

const withoutShots = [...source]
  .filter(([, data]) => !data.screenshots?.length)
  .map(([slug]) => slug);
if (withoutShots.length) {
  console.log(
    `  снимков ещё нет у ${withoutShots.length} из ${source.size}: ${withoutShots.join(', ')}`,
  );
}

process.exit(report('схема контента', problems, source.size + target.size, 'документов'));
