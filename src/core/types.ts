export type Vec2 = { x: number; y: number };
export type ObjectKind = 'player' | 'npc' | 'enemy' | 'prop' | 'trigger';

export interface ComponentDocument {
  type: string;
  enabled?: boolean;
  properties?: Record<string, unknown>;
}

export interface SceneObjectDocument {
  id: string;
  name: string;
  kind: ObjectKind;
  position: Vec2;
  size: Vec2;
  rotation: number;
  color: string;
  layer: number;
  tags: string[];
  characterId?: string;
  components: ComponentDocument[];
}

export interface SceneDocument {
  schemaVersion: '1.0';
  id: string;
  revision: number;
  name: string;
  world: { width: number; height: number; background: string; gridSize: number };
  objects: SceneObjectDocument[];
}

export interface CharacterDocument {
  schemaVersion: '1.0';
  id: string;
  revision: number;
  displayName: string;
  aliases: string[];
  description: string;
  traits: string[];
  visualProfile: {
    hair: string;
    eyes: string;
    outfit: string;
    silhouette: string;
    palette: string[];
  };
  generationProfile: {
    provider: 'anima-turbo';
    workflowId: string;
    approvedReference?: string;
    referenceImage?: string;
    seedBank: number[];
    ipAdapterStrength?: number;
  };
  gameplay: { health: number; speed: number; abilities: string[] };
}

export interface AssetRecord {
  id: string;
  kind: 'character' | 'environment' | 'prop' | 'fx' | 'ui';
  status: 'generated' | 'approved' | 'rejected';
  path: string;
  prompt: string;
  negativePrompt: string;
  seed: number;
  createdAt: string;
  provider: 'anima-turbo';
  workflowHash?: string;
  referenceImage?: string;
  ipAdapterStrength?: number;
}

export interface GameProjectDocument {
  schemaVersion: '1.0';
  id: string;
  revision: number;
  name: string;
  description: string;
  startSceneId: string;
  viewport: Vec2;
  scenes: string[];
  characters: string[];
  assetIndex: AssetRecord[];
}

export type JsonPatchOperation =
  | { op: 'add' | 'replace'; path: string; value: unknown }
  | { op: 'remove'; path: string };
