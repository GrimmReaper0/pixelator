import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AnimaBindings, AnimaGenerationRequest, ComfyQueueResponse, WorkflowBinding } from './types.js';

function setBinding(workflow: Record<string, any>, binding: WorkflowBinding | undefined, value: unknown): void {
  if (!binding || value === undefined) return;
  const node = workflow[binding.node];
  if (!node || typeof node !== 'object' || !node.inputs || typeof node.inputs !== 'object') throw new Error(`Anima binding node ${binding.node} is missing or has no inputs`);
  node.inputs[binding.field] = value;
}

export class AnimaTurboClient {
  constructor(readonly comfyUrl: string, readonly workflowPath: string, readonly bindingsPath: string) {}

  async configuration(): Promise<{ configured: boolean; comfyUrl: string; workflowPath: string; bindingsPath: string; error?: string }> {
    try {
      await Promise.all([readFile(this.workflowPath), readFile(this.bindingsPath)]);
      return { configured: true, comfyUrl: this.comfyUrl, workflowPath: this.workflowPath, bindingsPath: this.bindingsPath };
    } catch (error) {
      return { configured: false, comfyUrl: this.comfyUrl, workflowPath: this.workflowPath, bindingsPath: this.bindingsPath, error: `Copy your ComfyUI API workflow and bindings into workflows/anima-turbo. ${String(error)}` };
    }
  }

  async health(): Promise<boolean> {
    try { return (await fetch(`${this.comfyUrl}/system_stats`, { signal: AbortSignal.timeout(2000) })).ok; }
    catch { return false; }
  }

  async queue(request: AnimaGenerationRequest): Promise<ComfyQueueResponse & { workflowHash: string; seed: number }> {
    const [workflowText, bindingsText] = await Promise.all([readFile(this.workflowPath, 'utf8'), readFile(this.bindingsPath, 'utf8')]);
    const workflow = JSON.parse(workflowText) as Record<string, any>;
    const bindings = JSON.parse(bindingsText) as AnimaBindings;
    const seed = request.seed ?? Math.floor(Math.random() * 2_147_483_647);
    setBinding(workflow, bindings.positivePrompt, request.prompt);
    setBinding(workflow, bindings.negativePrompt, request.negativePrompt ?? 'text, watermark, logo, malformed anatomy, inconsistent costume');
    setBinding(workflow, bindings.seed, seed);
    setBinding(workflow, bindings.width, request.width ?? 1024);
    setBinding(workflow, bindings.height, request.height ?? 1024);
    setBinding(workflow, bindings.steps, request.steps ?? 8);
    setBinding(workflow, bindings.referenceImage, request.referenceImage);
    setBinding(workflow, bindings.ipAdapterStrength, request.ipAdapterStrength ?? 0.75);
    setBinding(workflow, bindings.outputPrefix, request.outputPrefix ?? `pixelator/${new Date().toISOString().slice(0, 10)}`);
    const workflowHash = createHash('sha256').update(JSON.stringify(workflow)).digest('hex');
    const response = await fetch(`${this.comfyUrl}/prompt`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: workflow, client_id: `pixelator-${randomUUID()}` }),
    });
    if (!response.ok) throw new Error(`ComfyUI queue failed: ${response.status} ${await response.text()}`);
    return { ...(await response.json() as ComfyQueueResponse), workflowHash, seed };
  }

  async history(promptId: string): Promise<unknown> {
    const response = await fetch(`${this.comfyUrl}/history/${encodeURIComponent(promptId)}`);
    if (!response.ok) throw new Error(`ComfyUI history failed: ${response.status} ${await response.text()}`);
    return response.json();
  }
}

export function createAnimaClient(cwd = process.cwd()): AnimaTurboClient {
  return new AnimaTurboClient(
    process.env.COMFYUI_URL ?? 'http://127.0.0.1:8188',
    path.resolve(cwd, process.env.ANIMA_WORKFLOW ?? 'workflows/anima-turbo/workflow.api.json'),
    path.resolve(cwd, process.env.ANIMA_BINDINGS ?? 'workflows/anima-turbo/bindings.json'),
  );
}
