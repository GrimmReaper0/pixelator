import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadVerified } from './lib/download.mjs';
import { command, detectNvidia, detectPython, ensureDirectory, ensureEnv, parseArgs, pythonExecutable } from './lib/setup-core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const options = parseArgs(process.argv.slice(2));
const runtime = path.resolve(root, '.pixelator');
const comfyDir = path.resolve(options.comfyDir ?? path.join(runtime, 'ComfyUI'));
const venv = path.join(runtime, 'comfy-venv');
const manifest = JSON.parse(await readFile(path.join(root, 'models', 'anima-turbo.json'), 'utf8'));
const modelsDir = path.resolve(options.modelsDir ?? path.join(comfyDir, 'models'));

const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor < 22) throw new Error(`Node.js 22 or newer is required; found ${process.versions.node}`);
console.log(`Pixelator setup · Node ${process.versions.node} · ${process.platform}/${process.arch}`);

command(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', '--no-audit', '--no-fund'], { cwd: root, dryRun: options.dryRun });
await ensureDirectory(runtime, options.dryRun);

if (!options.skipComfy) {
  if (!existsSync(path.join(comfyDir, 'main.py'))) {
    command('git', ['clone', '--depth', '1', 'https://github.com/Comfy-Org/ComfyUI.git', comfyDir], { dryRun: options.dryRun });
  }
  const python = detectPython();
  const venvPython = pythonExecutable(venv);
  if (!existsSync(venvPython)) command(python.program, [...python.prefix, '-m', 'venv', venv], { dryRun: options.dryRun });
  command(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip', 'setuptools', 'wheel'], { dryRun: options.dryRun });
  if (detectNvidia()) {
    console.log('NVIDIA GPU detected; installing CUDA PyTorch wheels.');
    command(venvPython, ['-m', 'pip', 'install', 'torch', 'torchvision', 'torchaudio', '--extra-index-url', 'https://download.pytorch.org/whl/cu130'], { dryRun: options.dryRun });
  }
  command(venvPython, ['-m', 'pip', 'install', '-r', path.join(comfyDir, 'requirements.txt')], { dryRun: options.dryRun });
}

if (!options.skipModels) {
  if (!options.acceptLicense && process.env.PIXELATOR_ACCEPT_ANIMA_LICENSE !== '1') {
    throw new Error(`Anima Turbo uses ${manifest.license.name}. Read ${manifest.license.url}, then rerun with --accept-anima-license.`);
  }
  for (const file of manifest.files) {
    const destination = path.join(modelsDir, file.relativePath);
    if (options.dryRun) console.log(`[dry-run] verified download ${file.url} -> ${destination}`);
    else await downloadVerified({ ...file, destination }, { force: options.force });
  }
}

await ensureEnv(root, {
  PIXELATOR_WORKSPACE: './projects/moonfall',
  PIXELATOR_BRIDGE_PORT: '4817',
  COMFYUI_URL: 'http://127.0.0.1:8188',
  COMFYUI_PATH: path.relative(root, comfyDir) || '.',
  COMFYUI_PYTHON: path.relative(root, pythonExecutable(venv))
});

console.log('\nPixelator setup complete.');
console.log('Run: npm run doctor');
console.log('Then: npm run start:all');
console.log('Studio: http://127.0.0.1:4173');
