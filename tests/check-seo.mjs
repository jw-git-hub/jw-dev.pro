/**
 * Мета, превью и граф schema.org на собранных страницах.
 *
 * Ошибки этого слоя не видно ни в браузере, ни в вёрстке: страница выглядит
 * целой, а в поиске у неё нет описания, в мессенджере — картинки, а в графе
 * ссылка `@id` ведёт в пустоту. Заметно это становится уже на живом сайте,
 * поэтому проверка стоит в тех же воротах, что и остальные.
 */
import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import { relative, join } from 'node:path';
import { filesWithExt } from './lib/walk.mjs';
import { report } from './lib/report.mjs';

const DIST = 'dist';
const SITE = 'https://jw-dev.pro';

/** Теги, без которых страница теряет вид в выдаче или в переписке. */
const REQUIRED_META = [
  ['og:title', /<meta property="og:title" content="([^"]*)"/],
  ['og:description', /<meta property="og:description" content="([^"]*)"/],
  ['og:url', /<meta property="og:url" content="([^"]*)"/],
  ['og:image', /<meta property="og:image" content="([^"]*)"/],
  ['twitter:card', /<meta name="twitter:card" content="([^"]*)"/],
];

const exists = (path) =>
  access(path)
    .then(() => true)
    .catch(() => false);

const first = (html, re) => html.match(re)?.[1];

/** Заголовок и описание: пустые — то же самое, что их нет. */
function checkTitle(html, problems, where) {
  const title = first(html, /<title>([^<]*)<\/title>/);
  const description = first(html, /<meta name="description" content="([^"]*)"/);

  if (!title?.trim()) problems.push(`${where} — пустой <title>`);
  if (!description?.trim()) problems.push(`${where} — нет описания страницы`);
}

/**
 * Канонический адрес есть ровно у индексируемых страниц.
 *
 * Обратное тоже проверяем: canonical на странице под noindex — это две
 * взаимоисключающие команды поисковику в одной шапке.
 */
function checkCanonical(html, problems, where) {
  const noindex = /<meta name="robots" content="noindex"/.test(html);
  const canonical = first(html, /<link rel="canonical" href="([^"]*)"/);

  if (noindex && canonical) problems.push(`${where} — noindex и canonical одновременно`);
  if (!noindex && !canonical) problems.push(`${where} — нет canonical`);
  if (canonical && !canonical.startsWith(SITE)) {
    problems.push(`${where} — canonical не абсолютный: ${canonical}`);
  }
}

/** Картинка превью: абсолютный адрес и файл, который правда собрался. */
async function checkImage(html, problems, where) {
  const image = first(html, /<meta property="og:image" content="([^"]*)"/);
  if (!image) return;

  if (!image.startsWith(SITE)) {
    problems.push(`${where} — og:image не абсолютный: ${image}`);
    return;
  }
  if (!(await exists(join(DIST, image.slice(SITE.length))))) {
    problems.push(`${where} — og:image не собрался: ${image}`);
  }
}

function checkMeta(html, problems, where) {
  for (const [name, re] of REQUIRED_META) {
    if (!first(html, re)?.trim()) problems.push(`${where} — нет ${name}`);
  }
}

/**
 * Граф schema.org: разбирается, у каждого узла есть тип, а ссылки `@id`
 * ведут на узел этой же страницы. Поисковик сшивает граф в пределах одной
 * страницы, и ссылка на человека, которого здесь не описали, пуста.
 */
function checkGraph(html, problems, where) {
  const raw = first(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!raw) return 0;

  let graph;
  try {
    graph = JSON.parse(raw)['@graph'];
  } catch (error) {
    problems.push(`${where} — граф не разбирается: ${error.message}`);
    return 0;
  }

  const ids = new Set(graph.map((node) => node['@id']).filter(Boolean));
  for (const node of graph) {
    if (!node['@type']) problems.push(`${where} — узел без @type`);
    for (const target of references(node)) {
      if (!ids.has(target)) problems.push(`${where} — ссылка @id в пустоту: ${target}`);
    }
  }
  return graph.length;
}

/** Все `{ "@id": … }`, которыми узел ссылается на соседей. */
function references(node) {
  const found = [];
  for (const value of Object.values(node)) {
    if (!value || typeof value !== 'object') continue;
    const target = value['@id'];
    // У самого узла тоже есть @id — но там он объявление, а не ссылка.
    if (typeof target === 'string' && !value['@type']) found.push(target);
  }
  return found;
}

const files = await filesWithExt(DIST, '.html');
const problems = [];
let nodes = 0;

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const where = relative(DIST, file);

  checkTitle(html, problems, where);
  checkCanonical(html, problems, where);
  checkMeta(html, problems, where);
  await checkImage(html, problems, where);
  nodes += checkGraph(html, problems, where);
}

// Карта сайта не должна звать в индекс то, что помечено noindex.
const sitemap = await readFile(join(DIST, 'sitemap-0.xml'), 'utf8').catch(() => '');
if (!sitemap) problems.push('sitemap-0.xml не собрался');
for (const location of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const page = join(DIST, location[1].slice(SITE.length), 'index.html');
  const html = await readFile(page, 'utf8').catch(() => '');
  if (/<meta name="robots" content="noindex"/.test(html)) {
    problems.push(`карта сайта зовёт в индекс noindex-страницу: ${location[1]}`);
  }
}

if (files.length === 0) {
  console.error('✗ SEO — в dist нет ни одного HTML. Сначала `npm run build`.');
  process.exit(1);
}

console.log(`  узлов schema.org: ${nodes}`);
process.exit(report('мета, превью и граф', problems, files.length, 'страниц'));
