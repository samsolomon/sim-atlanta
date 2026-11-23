import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { ginkgo } from './ginkgo';
import { VARIANTS, createGinkgoVariant, variantTriangles, type GinkgoVariant } from './ginkgo-variants';
import { SIZE_CLASSES, doyOf } from './species';

const ids = Object.keys(VARIANTS) as GinkgoVariant[];

describe('ginkgo rendering variants (lab only)', () => {
  it('keep A, C and D within the generic tree budget at both tiers; B is the near-range exception', () => {
    for (const size of SIZE_CLASSES) for (const q of ['high', 'low'] as const) {
      for (const v of ['A', 'C', 'D'] as const) expect(variantTriangles(v, size, q).total).toBeLessThanOrEqual(q === 'high' ? 196 : 156);
      expect(variantTriangles('B', size, q).total).toBeGreaterThan(variantTriangles('A', size, q).total);
    }
  });

  it('draw in a fixed handful of instanced meshes however many trees', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ species: ginkgo, size: 'mature' as const, x: i * 15, z: 0, seed: i }));
    for (const v of ids.filter(v => v !== 'C')) {
      const g = createGinkgoVariant(many, v, 'high', () => 0)!;
      // limbs + foliage (+ B's far sleeves) + carpet + falling leaves
      expect(g.group.children.length).toBe(v === 'B' ? 5 : 4);
      g.dispose();
    }
  });

  it('hide foliage in winter and show it in summer', () => {
    const g = createGinkgoVariant([{ species: ginkgo, size: 'mature', x: 0, z: 0, seed: 1 }], 'A', 'high', () => 0)!;
    const foliage = g.group.children.find(o => o.name.includes('foliage')) as THREE.InstancedMesh;
    const m = new THREE.Matrix4();
    g.setSeason(doyOf(7, 1));
    foliage.getMatrixAt(0, m);
    expect(m.determinant()).not.toBe(0);
    g.setSeason(doyOf(1, 15));
    foliage.getMatrixAt(0, m);
    expect(m.determinant()).toBe(0);
    g.dispose();
  });
});
