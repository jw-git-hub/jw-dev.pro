import { readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';

/** Рекурсивно собирает пути файлов с нужным расширением. */
export async function filesWithExt(dir, ext) {
  const found = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await filesWithExt(full, ext)));
    else if (extname(entry.name) === ext) found.push(full);
  }
  return found;
}
