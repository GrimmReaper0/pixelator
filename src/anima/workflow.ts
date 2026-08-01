import { createHash } from 'node:crypto';
import type { AnimaGenerationRequest } from './types.js';

const MODEL = 'anima-turbo-v1.0.safetensors';
const CLIP = 'qwen_3_06b_base.safetensors';
const VAE = 'qwen_image_vae.safetensors';
const POSITIVE = 'masterpiece, best quality, score_7, safe';
const NEGATIVE = 'worst quality, low quality, score_1, score_2, score_3, text, watermark, logo, malformed anatomy, cropped subject';

const align = (value: number) => Math.max(256, Math.min(1536, Math.round(value / 16) * 16));

export function buildAnimaWorkflow(request: AnimaGenerationRequest) {
  if (request.referenceImage) throw new Error('Reference conditioning is not enabled in the native Turbo workflow yet. Generate a canonical source asset first.');
  const width = align(request.width ?? 1024);
  const height = align(request.height ?? 1024);
  const seed = request.seed ?? Math.floor(Math.random() * 2_147_483_647);
  const steps = Math.max(4, Math.min(16, request.steps ?? 8));
  const prompt = `${POSITIVE}, ${request.prompt}`;
  const negativePrompt = request.negativePrompt ?? NEGATIVE;
  const workflow = {
    '1': { class_type: 'UNETLoader', inputs: { unet_name: MODEL, weight_dtype: 'default' } },
    '2': { class_type: 'CLIPLoader', inputs: { clip_name: CLIP, type: 'qwen_image', device: 'default' } },
    '3': { class_type: 'VAELoader', inputs: { vae_name: VAE } },
    '4': { class_type: 'CLIPTextEncode', inputs: { clip: ['2', 0], text: prompt } },
    '5': { class_type: 'CLIPTextEncode', inputs: { clip: ['2', 0], text: negativePrompt } },
    '6': { class_type: 'EmptySD3LatentImage', inputs: { width, height, batch_size: 1 } },
    '7': { class_type: 'KSampler', inputs: { model: ['1', 0], positive: ['4', 0], negative: ['5', 0], latent_image: ['6', 0], seed, steps, cfg: 1, sampler_name: 'euler', scheduler: 'simple', denoise: 1 } },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['7', 0], vae: ['3', 0] } },
    '9': { class_type: 'SaveImage', inputs: { images: ['8', 0], filename_prefix: request.outputPrefix ?? 'pixelator/generated' } }
  };
  const workflowHash = createHash('sha256').update(JSON.stringify(workflow)).digest('hex');
  return { workflow, workflowHash, seed, width, height, prompt, negativePrompt };
}
