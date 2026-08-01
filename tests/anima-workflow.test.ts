import { describe, expect, it } from 'vitest';
import { buildAnimaWorkflow } from '../src/anima/workflow';

describe('native Anima Turbo workflow', () => {
  it('uses pinned models and distilled defaults', () => {
    const result = buildAnimaWorkflow({ prompt: 'game hero', width: 769, height: 1001, seed: 42 });
    const workflow = result.workflow as Record<string, { inputs: Record<string, unknown> }>;
    expect(workflow['1'].inputs.unet_name).toBe('anima-turbo-v1.0.safetensors');
    expect(workflow['2'].inputs.clip_name).toBe('qwen_3_06b_base.safetensors');
    expect(workflow['3'].inputs.vae_name).toBe('qwen_image_vae.safetensors');
    expect(workflow['7'].inputs.cfg).toBe(1);
    expect(workflow['7'].inputs.steps).toBe(8);
    expect(result.width % 16).toBe(0);
    expect(result.height % 16).toBe(0);
  });

  it('rejects unsupported reference conditioning clearly', () => {
    expect(() => buildAnimaWorkflow({ prompt: 'hero', referenceImage: 'hero.png' })).toThrow('Reference conditioning');
  });
});
