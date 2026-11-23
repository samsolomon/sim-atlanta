import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { ginkgo } from './ginkgo';
import { C_FAMILY, TIP_CAP, VARIANTS, createGinkgoVariant, variantTriangles, type GinkgoVariant } from './ginkgo-variants';
import { SIZE_CLASSES, doyOf } from './species';

const ids = Object.keys(VARIANTS) as GinkgoVariant[];

describe('ginkgo rendering variants (lab only)', () => {
  it('keep A, C and D within the generic tree budget at both tiers; B is the near-range exception', () => {
    for (const size of SIZE_CLASSES) for (const q of ['high', 'low'] as const) {
      for (const v of ['A', 'C', 'D'] as const) expect(variantTriangles(v, size, q).total).toBeLessThanOrEqual(q === 'high' ? 196 : 156);
      // B's fans are near-range and high detail only; at low it is A.
      if (q === 'high') expect(variantTriangles('B', size, q).total).toBeGreaterThan(variantTriangles('A', size, q).total);
      else expect(variantTriangles('B', size, q).total).toBe(variantTriangles('A', size, q).total);
    }
  });

  it('draw in a fixed handful of instanced meshes however many trees', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ species: ginkgo, size: 'mature' as const, x: i * 15, z: 0, seed: i }));
    for (const v of ids) {
      const g = createGinkgoVariant(many, v, 'high', () => 0)!;
      // limbs + foliage (+ B's far sleeves or C4's fan tips) + carpet + falling leaves
      expect(g.group.children.length).toBe(v === 'B' || v === 'C4' ? 5 : 4);
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

describe('ginkgo leaf guardrails (worst case: a 20-tree grove, camera inside it)', () => {
  // A 4 × 5 grove of mature ginkgos 11.5 m apart, as dense as the Peachtree avenue at Andrew Young.
  const grove = Array.from({ length: 20 }, (_, i) => ({ species: ginkgo, size: 'mature' as const, x: (i % 4) * 11.5, z: Math.floor(i / 4) * 11.5, seed: i }));
  const camera = new THREE.PerspectiveCamera(40, 1.6, 0.5, 2000);
  camera.position.set(17, 3, 23);
  camera.updateMatrixWorld();
  // Ceilings per tier for the whole grove: triangles actually drawn, and instanced draws.
  const CEILING = { high: { triangles: 20 * 196 + TIP_CAP * 300, draws: 5 }, low: { triangles: 20 * 156, draws: 4 } };

  for (const q of ['high', 'low'] as const) for (const v of C_FAMILY) {
    it(`${v} at ${q} detail stays under the grove ceiling`, () => {
      const g = createGinkgoVariant(grove, v, q, () => 0)!;
      g.setSeason(doyOf(11, 23));
      g.update(0.016, camera);
      expect(g.drawnTriangles()).toBeLessThanOrEqual(CEILING[q].triangles);
      expect(g.draws()).toBeLessThanOrEqual(CEILING[q].draws);
      if (v === 'C4') expect(g.tipped()).toBe(q === 'high' ? TIP_CAP : 0);
      g.dispose();
    });
  }

  it('C4 draws no fan tips at all at low detail', () => {
    const g = createGinkgoVariant(grove, 'C4', 'low', () => 0)!;
    expect(g.group.children.some(o => o.name.includes('fan'))).toBe(false);
    g.dispose();
  });

  it('cards are alpha-tested, never blended', () => {
    const g = createGinkgoVariant(grove.slice(0, 1), 'C2', 'high', () => 0)!;
    const cards = g.group.children.find(o => o.name.includes('foliage')) as THREE.Mesh;
    const mat = cards.material as THREE.Material;
    expect(mat.transparent).toBe(false);
    expect(mat.alphaTest).toBeGreaterThan(0);
    g.dispose();
  });
});
