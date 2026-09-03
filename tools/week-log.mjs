/**
 * Что сделано за неделю — сырьё для пятничного разбора журнала.
 *
 * Смотрит в GitHub, а не в папки на диске: репозиториев в аккаунте вдвое больше,
 * чем склонировано локально, и часть самых активных на этой машине отсутствует
 * вовсе. Ключей скрипт не просит — берёт уже настроенный `gh`.
 *
 * Только читает и только печатает. Отбор — работа человека и происходит после
 * этого вывода, а не внутри него: машина не отличает «починил прайс клиенту»
 * от «поправил отступ в тестах», и притворяться, что отличает, ей не следует.
 */
import { execFileSync } from 'node:child_process';

/** Неделя — шаг разбора: владелец просит вывод по пятницам. */
const DEFAULT_DAYS = 7;

/** Потолки запросов. Аккаунт на порядок меньше, взяты с запасом. */
const REPO_LIMIT = 100;
const COMMITS_PER_REPO = 100;

const MS_IN_DAY = 86_400_000;

/** Граница окна в том виде, в каком её понимает API GitHub. */
function sinceIso(days) {
  return new Date(Date.now() - days * MS_IN_DAY).toISOString();
}

/** Поток ошибок перехватывается, а не наследуется: иначе `gh` печатает свою
 *  жалобу сам и она задваивается с нашей же строкой разбора. */
function gh(args) {
  const io = { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] };
  return execFileSync('gh', args, io);
}

/** Все репозитории аккаунта, новые сверху по времени последней записи. */
function listRepos() {
  const fields = 'nameWithOwner,name,isPrivate,pushedAt';
  const raw = gh(['repo', 'list', '--limit', String(REPO_LIMIT), '--json', fields]);
  return JSON.parse(raw).sort((a, b) => b.pushedAt.localeCompare(a.pushedAt));
}

/**
 * Заголовки записей основной ветки за окно.
 *
 * Берётся только первая строка: для отбора её достаточно, а полные тела на
 * тринадцати репозиториях превращают вывод в нечитаемое полотно. За подробностями
 * по конкретной записи идём отдельным запросом.
 */
function recentCommits(repo, since) {
  const path = `repos/${repo.nameWithOwner}/commits?since=${since}&per_page=${COMMITS_PER_REPO}`;
  const jq = '.[] | "\\(.commit.author.date[0:10]) \\(.commit.message | split("\\n")[0])"';

  // Заведённый и ни разу не заполненный репозиторий отвечает 409 и без этого
  // ронял весь прогон. Молча пропускать нельзя: так же выглядит и отвалившийся
  // доступ, а пустой журнал из-за протухшего ключа выглядит как спокойная неделя.
  try {
    return gh(['api', path, '--jq', jq]).split('\n').filter(Boolean);
  } catch (error) {
    console.error(`   ! ${repo.name}: ${reasonOf(error)}`);
    return [];
  }
}

/** Из многословной ошибки `gh` — одна строка, по которой понятно, что делать. */
function reasonOf(error) {
  const text = String(error.stderr ?? error.message);
  return text
    .replace(/^gh:\s*/, '')
    .split('\n')[0]
    .trim();
}

/** Репозиторий, который точно не мог измениться в окне, не спрашиваем вовсе. */
function touchedSince(repo, since) {
  return repo.pushedAt >= since;
}

function printProject(repo, commits) {
  const mark = repo.isPrivate ? '  [закрытый — спросить, как называть]' : '';
  console.log(`\n── ${repo.name}${mark}`);
  for (const line of commits) console.log(`   ${line}`);
}

function main() {
  const days = Number(process.argv[2]) || DEFAULT_DAYS;
  const since = sinceIso(days);

  console.log(`Записи за последние ${days} дн. (с ${since.slice(0, 10)})`);

  let total = 0;
  for (const repo of listRepos()) {
    if (!touchedSince(repo, since)) continue;

    const commits = recentCommits(repo, since);
    if (commits.length === 0) continue;

    printProject(repo, commits);
    total += commits.length;
  }

  console.log(`\nВсего: ${total}`);
}

main();
