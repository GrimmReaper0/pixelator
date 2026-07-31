import { createHash, randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { characterSchema, projectSchema, sceneSchema } from './schema.js';
import { applyJsonPatch } from './patch.js';
import type { CharacterDocument, GameProjectDocument, JsonPatchOperation, SceneDocument } from './types.js';

export class ProjectStore {
  readonly root: string;
  private mutationQueue: Promise<unknown> = Promise.resolve();

  constructor(root: string) { this.root = path.resolve(root); }

  resolve(relativePath: string): string {
    const resolved = path.resolve(this.root, relativePath);
    if (resolved !== this.root && !resolved.startsWith(`${this.root}${path.sep}`)) throw new Error('Path escapes PIXELATOR_WORKSPACE');
    return resolved;
  }

  async readJson<T>(relativePath: string): Promise<T> {
    return JSON.parse(await readFile(this.resolve(relativePath), 'utf8')) as T;
  }

  async writeJsonAtomic(relativePath: string, value: unknown): Promise<void> {
    const destination = this.resolve(relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    const temporary = `${destination}.${randomUUID()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await rename(temporary, destination);
  }

  async getProject(): Promise<GameProjectDocument> { return projectSchema.parse(await this.readJson('game.project.json')); }
  async getScene(relativePath: string): Promise<SceneDocument> { return sceneSchema.parse(await this.readJson(relativePath)); }

  async listScenes(): Promise<Array<{ path: string; scene: SceneDocument }>> {
    const project = await this.getProject();
    return Promise.all(project.scenes.map(async (scenePath) => ({ path: scenePath, scene: await this.getScene(scenePath) })));
  }

  async validate(): Promise<{ valid: boolean; files: string[]; warnings: string[] }> {
    const project = await this.getProject();
    const files = ['game.project.json'];
    const warnings: string[] = [];
    for (const scenePath of project.scenes) {
      const scene = await this.getScene(scenePath);
      files.push(scenePath);
      const ids = new Set<string>();
      for (const object of scene.objects) {
        if (ids.has(object.id)) warnings.push(`${scenePath}: duplicate object id ${object.id}`);
        ids.add(object.id);
      }
    }
    for (const characterPath of project.characters) {
      characterSchema.parse(await this.readJson<CharacterDocument>(characterPath));
      files.push(characterPath);
    }
    return { valid: warnings.length === 0, files, warnings };
  }

  async checkpoint(label = 'checkpoint'): Promise<string> {
    const project = await this.getProject();
    const id = `${new Date().toISOString().replaceAll(':', '-')}-${label.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    const checkpointRoot = this.resolve(path.join('.pixelator', 'checkpoints', id));
    await mkdir(checkpointRoot, { recursive: true });
    for (const relativePath of ['game.project.json', ...project.scenes, ...project.characters]) {
      const destination = path.join(checkpointRoot, relativePath);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(this.resolve(relativePath), destination);
    }
    return id;
  }

  async saveScene(relativePath: string, expectedRevision: number, replacement: SceneDocument): Promise<{ scene: SceneDocument; checkpoint: string }> {
    return this.serial(async () => {
      const current = await this.getScene(relativePath);
      if (current.revision !== expectedRevision) throw new Error(`Revision conflict: expected ${expectedRevision}, found ${current.revision}`);
      const checkpoint = await this.checkpoint(`before-${current.id}-save-r${current.revision}`);
      const validated = sceneSchema.parse({ ...replacement, id: current.id, revision: current.revision + 1 });
      await this.writeJsonAtomic(relativePath, validated);
      return { scene: validated, checkpoint };
    });
  }

  async applyScenePatch(relativePath: string, expectedRevision: number, operations: JsonPatchOperation[]): Promise<{ scene: SceneDocument; checkpoint: string }> {
    return this.serial(async () => {
      const current = await this.getScene(relativePath);
      if (current.revision !== expectedRevision) throw new Error(`Revision conflict: expected ${expectedRevision}, found ${current.revision}`);
      const checkpoint = await this.checkpoint(`before-${current.id}-r${current.revision}`);
      const patched = applyJsonPatch(current, operations);
      patched.revision = current.revision + 1;
      const validated = sceneSchema.parse(patched);
      await this.writeJsonAtomic(relativePath, validated);
      return { scene: validated, checkpoint };
    });
  }

  async writeCharacter(relativePath: string, character: CharacterDocument, expectedRevision?: number): Promise<CharacterDocument> {
    return this.serial(async () => {
      let isNew = false;
      try {
        const current = characterSchema.parse(await this.readJson<CharacterDocument>(relativePath));
        if (expectedRevision !== undefined && current.revision !== expectedRevision) throw new Error(`Revision conflict: expected ${expectedRevision}, found ${current.revision}`);
        character = { ...character, revision: current.revision + 1 };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') isNew = true;
        else throw error;
      }
      const validated = characterSchema.parse(character);
      await this.writeJsonAtomic(relativePath, validated);
      if (isNew) {
        const project = await this.getProject();
        if (!project.characters.includes(relativePath)) await this.writeJsonAtomic('game.project.json', { ...project, revision: project.revision + 1, characters: [...project.characters, relativePath] });
      }
      return validated;
    });
  }

  async approveGeneratedAsset(sourceRelativePath: string, requestedName: string): Promise<string> {
    return this.serial(async () => {
      const source = this.resolve(sourceRelativePath);
      await stat(source);
      const safeName = requestedName.replace(/[^a-zA-Z0-9._-]/g, '-');
      const extension = path.extname(safeName) || path.extname(source) || '.png';
      const stem = path.basename(safeName, extension);
      let version = 1;
      let destinationRelative = path.join('assets', 'approved', `${stem}-v${version}${extension}`);
      while (true) {
        try { await stat(this.resolve(destinationRelative)); version += 1; destinationRelative = path.join('assets', 'approved', `${stem}-v${version}${extension}`); }
        catch { break; }
      }
      const destination = this.resolve(destinationRelative);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(source, destination);
      return destinationRelative.replaceAll(path.sep, '/');
    });
  }

  async fileHash(relativePath: string): Promise<string> {
    return createHash('sha256').update(await readFile(this.resolve(relativePath))).digest('hex');
  }

  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.mutationQueue.then(operation, operation);
    this.mutationQueue = next.then(() => undefined, () => undefined);
    return next;
  }
}
