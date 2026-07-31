import type { JsonPatchOperation } from './types.js';

const blocked = new Set(['__proto__', 'prototype', 'constructor']);
const decode = (segment: string) => segment.replaceAll('~1', '/').replaceAll('~0', '~');

function segments(path: string): string[] {
  if (!path.startsWith('/')) throw new Error(`Patch path must start with /: ${path}`);
  const result = path.slice(1).split('/').map(decode);
  if (result.some((part) => blocked.has(part))) throw new Error('Unsafe patch path');
  return result;
}

export function applyJsonPatch<T>(source: T, operations: JsonPatchOperation[]): T {
  const target = structuredClone(source) as unknown as Record<string, unknown>;
  for (const operation of operations) {
    const parts = segments(operation.path);
    const key = parts.pop();
    if (key === undefined) throw new Error('Cannot patch document root');
    let parent: unknown = target;
    for (const part of parts) {
      if (Array.isArray(parent)) {
        const index = Number(part);
        if (!Number.isInteger(index) || index < 0 || index >= parent.length) throw new Error(`Invalid array index: ${part}`);
        parent = parent[index];
      } else if (parent && typeof parent === 'object') {
        parent = (parent as Record<string, unknown>)[part];
      } else {
        throw new Error(`Patch path does not exist: ${operation.path}`);
      }
    }
    if (Array.isArray(parent)) {
      if (operation.op === 'add' && key === '-') {
        parent.push(structuredClone(operation.value));
        continue;
      }
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || index >= parent.length) throw new Error(`Invalid array index: ${key}`);
      if (operation.op === 'remove') parent.splice(index, 1);
      else if (operation.op === 'add') parent.splice(index, 0, structuredClone(operation.value));
      else parent[index] = structuredClone(operation.value);
      continue;
    }
    if (!parent || typeof parent !== 'object') throw new Error(`Invalid parent for ${operation.path}`);
    const object = parent as Record<string, unknown>;
    if (operation.op === 'remove') {
      if (!(key in object)) throw new Error(`Patch path does not exist: ${operation.path}`);
      delete object[key];
    } else object[key] = structuredClone(operation.value);
  }
  return target as T;
}
