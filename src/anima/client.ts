import { randomUUID } from 'node:crypto';
import type { AnimaGenerationRequest, ComfyQueueResponse } from './types.js';
import { buildAnimaWorkflow } from './workflow.js';

export class AnimaTurboClient {
  constructor(readonly comfyUrl: string) {}

  async configuration(): Promise<{ configured: boolean; comfyUrl: string; mode: string; error?: string }> {
    if (!await this.health()) return { configured: false, comfyUrl: this.comfyUrl, mode: 'native', error: 'ComfyUI is offline. Run npm run start:all.' };
    return { configured: true, comfyUrl: this.comfyUrl, mode: 'native' };
  }

  async health(): Promise<boolean> {
    try { return (await fetch(`${this.comfyUrl}/system_stats`, { signal: AbortSignal.timeout(2500) })).ok; }
    catch { return false; }
  }

  async queue(request: AnimaGenerationRequest): Promise<ComfyQueueResponse & { workflowHash: string; seed: number; width: number; height: number }> {
    const built = buildAnimaWorkflow(request);
    const response = await fetch(`${this.comfyUrl}/prompt`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: built.workflow, client_id: `pixelator-${randomUUID()}` })
    });
    if (!response.ok) throw new Error(`ComfyUI queue failed: ${response.status} ${await response.text()}`);
    return { ...(await response.json() as ComfyQueueResponse), workflowHash: built.workflowHash, seed: built.seed, width: built.width, height: built.height };
  }

  async history(promptId: string): Promise<unknown> {
    const response = await fetch(`${this.comfyUrl}/history/${encodeURIComponent(promptId)}`);
    if (!response.ok) throw new Error(`ComfyUI history failed: ${response.status} ${await response.text()}`);
    return response.json();
  }
}

export function createAnimaClient(): AnimaTurboClient {
  return new AnimaTurboClient(process.env.COMFYUI_URL ?? 'http://127.0.0.1:8188');
}
