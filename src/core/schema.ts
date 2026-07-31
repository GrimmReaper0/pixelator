import { z } from 'zod/v4';

const vec2 = z.object({ x: z.number(), y: z.number() });
const component = z.object({
  type: z.string().min(1),
  enabled: z.boolean().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export const sceneObjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(['player', 'npc', 'enemy', 'prop', 'trigger']),
  position: vec2,
  size: vec2,
  rotation: z.number(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  layer: z.number().int(),
  tags: z.array(z.string()),
  characterId: z.string().optional(),
  components: z.array(component),
});

export const sceneSchema = z.object({
  schemaVersion: z.literal('1.0'),
  id: z.string().min(1),
  revision: z.number().int().nonnegative(),
  name: z.string().min(1),
  world: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    background: z.string(),
    gridSize: z.number().int().positive(),
  }),
  objects: z.array(sceneObjectSchema),
});

export const characterSchema = z.object({
  schemaVersion: z.literal('1.0'),
  id: z.string().min(1),
  revision: z.number().int().nonnegative(),
  displayName: z.string().min(1),
  aliases: z.array(z.string()),
  description: z.string(),
  traits: z.array(z.string()),
  visualProfile: z.object({
    hair: z.string(),
    eyes: z.string(),
    outfit: z.string(),
    silhouette: z.string(),
    palette: z.array(z.string()),
  }),
  generationProfile: z.object({
    provider: z.literal('anima-turbo'),
    workflowId: z.string(),
    approvedReference: z.string().optional(),
    referenceImage: z.string().optional(),
    seedBank: z.array(z.number().int()),
    ipAdapterStrength: z.number().min(0).max(2).optional(),
  }),
  gameplay: z.object({
    health: z.number().positive(),
    speed: z.number().nonnegative(),
    abilities: z.array(z.string()),
  }),
});

export const assetRecordSchema = z.object({
  id: z.string(),
  kind: z.enum(['character', 'environment', 'prop', 'fx', 'ui']),
  status: z.enum(['generated', 'approved', 'rejected']),
  path: z.string(),
  prompt: z.string(),
  negativePrompt: z.string(),
  seed: z.number().int(),
  createdAt: z.string(),
  provider: z.literal('anima-turbo'),
  workflowHash: z.string().optional(),
  referenceImage: z.string().optional(),
  ipAdapterStrength: z.number().optional(),
});

export const projectSchema = z.object({
  schemaVersion: z.literal('1.0'),
  id: z.string().min(1),
  revision: z.number().int().nonnegative(),
  name: z.string().min(1),
  description: z.string(),
  startSceneId: z.string().min(1),
  viewport: vec2,
  scenes: z.array(z.string()),
  characters: z.array(z.string()),
  assetIndex: z.array(assetRecordSchema),
});
