import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, stat } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

async function hashFile(file) {
  const hash = createHash('sha256');
  await pipeline(createReadStream(file), hash);
  return hash.digest('hex');
}

async function sizeOf(file) {
  try { return (await stat(file)).size; } catch { return 0; }
}

export async function verifyFile(file, expectedBytes, expectedSha256) {
  if (await sizeOf(file) !== expectedBytes) return false;
  return await hashFile(file) === expectedSha256;
}

export async function downloadVerified(spec, options = {}) {
  const logger = options.logger ?? console.log;
  const destination = path.resolve(spec.destination);
  const partial = `${destination}.part`;
  await mkdir(path.dirname(destination), { recursive: true });

  if (!options.force && await verifyFile(destination, spec.bytes, spec.sha256)) {
    logger(`Verified ${path.basename(destination)}`);
    return destination;
  }

  let offset = options.force ? 0 : await sizeOf(partial);
  if (offset > spec.bytes) { await rename(partial, `${partial}.oversized-${Date.now()}`); offset = 0; }
  const headers = offset ? { Range: `bytes=${offset}-` } : {};
  logger(`${offset ? 'Resuming' : 'Downloading'} ${path.basename(destination)} (${(spec.bytes / 1e9).toFixed(2)} GB)`);
  const response = await fetch(spec.url, { headers, redirect: 'follow' });
  if (!response.ok || !response.body) throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  if (offset && response.status !== 206) offset = 0;
  await pipeline(Readable.fromWeb(response.body), createWriteStream(partial, { flags: offset ? 'a' : 'w' }));

  const actualBytes = await sizeOf(partial);
  if (actualBytes !== spec.bytes) throw new Error(`Size mismatch for ${destination}: expected ${spec.bytes}, got ${actualBytes}`);
  const actualSha = await hashFile(partial);
  if (actualSha !== spec.sha256) {
    const quarantine = `${partial}.bad-${Date.now()}`;
    await rename(partial, quarantine);
    throw new Error(`SHA-256 mismatch for ${destination}; quarantined as ${quarantine}`);
  }
  await rename(partial, destination);
  logger(`Installed ${path.basename(destination)}`);
  return destination;
}
