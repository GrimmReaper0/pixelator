import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export function parseArgs(args) {
  const result = { acceptLicense: false, skipModels: false, skipComfy: false, dryRun: false, force: false };
  for (let index = 0; index < args.length; index++) {
    const value = args[index];
    if (value === '--accept-anima-license') result.acceptLicense = true;
    else if (value === '--skip-models') result.skipModels = true;
    else if (value === '--skip-comfy') result.skipComfy = true;
    else if (value === '--dry-run') result.dryRun = true;
    else if (value === '--force') result.force = true;
    else if (value === '--comfy-dir') result.comfyDir = args[++index];
    else if (value === '--models-dir') result.modelsDir = args[++index];
    else throw new Error(`Unknown setup option: ${value}`);
  }
  return result;
}

export function command(program, args, options = {}) {
  if (options.dryRun) { console.log(`[dry-run] ${program} ${args.join(' ')}`); return; }
  const result = spawnSync(program, args, { stdio: 'inherit', cwd: options.cwd, env: options.env ?? process.env, shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${program} exited with ${result.status}`);
}

export function pythonExecutable(venv) {
  return process.platform === 'win32' ? path.join(venv, 'Scripts', 'python.exe') : path.join(venv, 'bin', 'python');
}

export function detectPython() {
  for (const candidate of process.platform === 'win32' ? ['py', 'python'] : ['python3', 'python']) {
    const args = candidate === 'py' ? ['-3', '--version'] : ['--version'];
    const result = spawnSync(candidate, args, { encoding: 'utf8' });
    if (result.status === 0) return { program: candidate, prefix: candidate === 'py' ? ['-3'] : [] };
  }
  throw new Error('Python 3.11-3.13 is required. Install Python, then rerun setup.');
}

export function detectNvidia() {
  return spawnSync('nvidia-smi', ['--query-gpu=name', '--format=csv,noheader'], { encoding: 'utf8' }).status === 0;
}

export async function ensureEnv(root, values = {}) {
  const envFile = path.join(root, '.env');
  if (!existsSync(envFile)) await copyFile(path.join(root, '.env.example'), envFile);
  const current = await readFile(envFile, 'utf8');
  const map = new Map(current.split(/\r?\n/).filter(Boolean).map(line => {
    const at = line.indexOf('='); return at < 0 ? [line, ''] : [line.slice(0, at), line.slice(at + 1)];
  }));
  for (const [key, value] of Object.entries(values)) map.set(key, String(value));
  await writeFile(envFile, [...map].map(([key, value]) => `${key}=${value}`).join(os.EOL) + os.EOL);
}

export async function ensureDirectory(directory, dryRun = false) {
  if (dryRun) { console.log(`[dry-run] mkdir ${directory}`); return; }
  await mkdir(directory, { recursive: true });
}
