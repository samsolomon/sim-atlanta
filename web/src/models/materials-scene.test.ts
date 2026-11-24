import { describe, expect, it } from 'vitest';
import { catalogue, SURFACE_KINDS } from '../materials';
import { createMaterialScene, ROOFS, WALLS } from './materials-scene';

describe('material swatches', () => {
  it('place every library kind on a wall or a roof, never both', () => {
    for (const kind of SURFACE_KINDS.slice(1)) expect(Number(ROOFS.has(kind)) + Number(WALLS.has(kind)), kind).toBe(1);
  });

  it('draw every catalogue material at both tiers, each vertex range painted', () => {
    const scene = createMaterialScene();
    expect(scene.swatches).toBe(catalogue().length);
    const meshes = scene.group.children as unknown as { material: { userData: { surfaces?: string } }; geometry: { getAttribute(n: string): { count: number; getX(i: number): number } } }[];
    expect(meshes.map(m => m.material.userData.surfaces)).toEqual(['high', 'low']);
    for (const m of meshes) {
      const a = m.geometry.getAttribute('aSurface'), kinds = new Set<number>();
      for (let i = 0; i < a.count; i++) kinds.add(Math.round(a.getX(i)));
      expect(kinds.size).toBe(SURFACE_KINDS.length); // every kind plus the flat (0) parts
    }
    scene.dispose();
  });
});
