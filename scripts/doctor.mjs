import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './lib/env.mjs';
import { verifyFile } from './lib/download.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env, ...await loadEnv(path.join(root, '.env')) };
const manifest = JSON.parse(await readFile(path.join(root, 'models/anima-turbo.json'), 'utf8'));
const comfyPath = path.resolve(root, env.COMFYUI_PATH || '.pixelator/ComfyUI');
const modelRoot = path.join(comfyPath, 'models');
let failed = false;

function report(ok, label, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` · ${detail}` : ''}`);
  if (!ok) failed = true;
}

report(Number(process.versions.node.split('.')[0]) >= 22, 'Node.js 22+', process.versions.node);
report(existsSync(path.join(root, 'node_modules')), 'npm dependencies');
report(existsSync(path.join(comfyPath, 'main.py')), 'managed ComfyUI', comfyPath);
for (const file of manifest.files) {
  const location = path.join(modelRoot, file.relativePath);
  report(await verifyFile(location, file.bytes, file.sha256), `model ${file.id}`, location);
}
try {
  const response = await fetch(`${env.COMFYUI_URL || 'http://127.0.0.1:8188'}/system_stats`, { signal: AbortSignal.timeout(2000) });
  report(response.ok, 'ComfyUI API', response.statusText);
} catch { report(false, 'ComfyUI API', 'offline; start with npm run start:all'); }
try {
  const response = await fetch(`http://127.0.0.1:${env.PIXELATOR_BRIDGE_PORT || '4817'}/health`, { signal: AbortSignal.timeout(2000) });
  report(response.ok, 'Pixelator bridge', response.statusText);
} catch { report(false, 'Pixelator bridge', 'offline; start with npm run start:all'); }

if (failed) process.exitCode = 1;
else console.log('\nPixelator is ready.');
