import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './lib/env.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const values = await loadEnv(path.join(root, '.env'));
const env = { ...process.env, ...values };
const children = [];

function run(name, program, args, cwd = root) {
  const child = spawn(program, args, { cwd, env, stdio: 'inherit', shell: false });
  child.on('exit', code => { if (code && code !== 0) stop(code, `${name} exited with ${code}`); });
  children.push(child);
  return child;
}
function stop(code = 0, message) {
  if (message) console.error(message);
  for (const child of children) child.kill('SIGTERM');
  process.exit(code);
}
async function comfyOnline() {
  try { return (await fetch(env.COMFYUI_URL || 'http://127.0.0.1:8188/system_stats', { signal: AbortSignal.timeout(1500) })).ok; }
  catch { return false; }
}

if (!await comfyOnline()) {
  const comfyPath = path.resolve(root, env.COMFYUI_PATH || '.pixelator/ComfyUI');
  const comfyPython = path.resolve(root, env.COMFYUI_PYTHON || (process.platform === 'win32' ? '.pixelator/comfy-venv/Scripts/python.exe' : '.pixelator/comfy-venv/bin/python'));
  run('ComfyUI', comfyPython, [path.join(comfyPath, 'main.py'), '--listen', '127.0.0.1', '--port', '8188'], comfyPath);
} else console.log('Using ComfyUI already running on localhost:8188');

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
run('bridge', npm, ['run', 'bridge']);
run('studio', npm, ['run', 'studio']);
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
console.log('Pixelator starting at http://127.0.0.1:4173');
