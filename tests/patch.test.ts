import { describe, expect, it } from 'vitest';
import { applyJsonPatch } from '../src/core/patch';

describe('applyJsonPatch', () => {
  it('applies object and array edits without mutating the source', () => {
    const source = { name: 'village', objects: [{ id: 'a', x: 1 }] };
    const result = applyJsonPatch(source, [
      { op: 'replace', path: '/objects/0/x', value: 9 },
      { op: 'add', path: '/objects/-', value: { id: 'b', x: 2 } },
      { op: 'replace', path: '/name', value: 'ruins' },
    ]);
    expect(result).toEqual({ name: 'ruins', objects: [{ id: 'a', x: 9 }, { id: 'b', x: 2 }] });
    expect(source.objects).toHaveLength(1);
  });
  it('rejects prototype-pollution paths', () => {
    expect(() => applyJsonPatch({}, [{ op: 'add', path: '/__proto__/polluted', value: true }])).toThrow('Unsafe');
  });
});
