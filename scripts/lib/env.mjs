import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

export async function loadEnv(file) {
  if (!existsSync(file)) return {};
  const result = {};
  for (const raw of (await readFile(file, 'utf8')).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const at = line.indexOf('=');
    if (at > 0) result[line.slice(0, at)] = line.slice(at + 1);
  }
  return result;
}
