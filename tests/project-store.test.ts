import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { demoProject, demoScene } from '../src/core/demo';
import { ProjectStore } from '../src/core/project-store';

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pixelator-'));
  await mkdir(path.join(root, 'scenes'), { recursive: true });
  await writeFile(path.join(root, 'game.project.json'), JSON.stringify({ ...demoProject, characters: [] }));
  await writeFile(path.join(root, 'scenes/village.scene.json'), JSON.stringify(demoScene));
  return { root, store: new ProjectStore(root) };
}

describe('ProjectStore', () => {
  it('confines paths to the workspace', async () => { const { store } = await fixture(); expect(() => store.resolve('../escape.json')).toThrow('escapes'); });
  it('saves a full scene with a guarded revision', async () => {
    const { store } = await fixture();
    const result = await store.saveScene('scenes/village.scene.json', 1, { ...demoScene, name: 'Saved scene' });
    expect(result.scene.name).toBe('Saved scene'); expect(result.scene.revision).toBe(2);
    await expect(store.saveScene('scenes/village.scene.json', 1, demoScene)).rejects.toThrow('Revision conflict');
  });
  it('applies guarded patches atomically', async () => {
    const { root, store } = await fixture();
    const result = await store.applyScenePatch('scenes/village.scene.json', 1, [{ op: 'replace', path: '/name', value: 'Changed' }]);
    expect(result.scene.revision).toBe(2);
    expect(JSON.parse(await readFile(path.join(root, 'scenes/village.scene.json'), 'utf8')).name).toBe('Changed');
  });
});
