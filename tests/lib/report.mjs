/** Общий вывод для всех проверок: одинаковый формат, одинаковый код выхода. */

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

export function report(name, problems, checkedCount, unit = 'файл(ов)') {
  if (problems.length === 0) {
    console.log(`${GREEN}✓${OFF} ${name} ${DIM}— проверено ${checkedCount} ${unit}${OFF}`);
    return 0;
  }
  console.error(`${RED}✗${OFF} ${name} — нарушений: ${problems.length}`);
  for (const p of problems) console.error(`    ${p}`);
  return 1;
}
