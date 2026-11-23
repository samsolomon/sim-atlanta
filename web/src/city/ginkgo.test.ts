import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { GINKGO_CLUMPS, createGinkgos, ginkgoOffset, ginkgoState, ginkgoTriangles, type GinkgoQuality } from './ginkgo';

const tris = (g: THREE.BufferGeometry) => (g.index ? g.index.count : g.attributes.position.count) / 3;

// The generic Midtown crown, as built by World.buildTrees in vignette/world.ts with
// simpleLeafClumps: octahedron clumps (8 high, 3 low), a five-sided trunk and seven
// four-sided bare-branch cylinders.
function genericTriangles(q: GinkgoQuality) {
  const clumps = q === 'high' ? 8 : 3;
  const trunk = tris(new THREE.CylinderGeometry(0.16, 0.24, 1, 5));
  const branches = 7 * tris(new THREE.CylinderGeometry(0.05, 0.1, 1.6, 4));
  return clumps * tris(new THREE.OctahedronGeometry(1)) + trunk + branches;
}

const day = (month: number, date: number) => Math.round((Date.UTC(2026, month - 1, date) - Date.UTC(2026, 0, 0)) / 86_400_000);

describe('ginkgo season', () => {
  it('follows the Atlanta calendar', () => {
    expect(ginkgoState(day(1, 15)).stage).toBe('bare');
    expect(ginkgoState(day(4, 5)).stage).toBe('leafout');
    expect(ginkgoState(day(7, 1)).stage).toBe('green');
    expect(ginkgoState(day(10, 31)).stage).toBe('green');
    expect(ginkgoState(day(11, 8)).stage).toBe('turning');
    expect(ginkgoState(day(11, 23)).stage).toBe('gold');
    expect(ginkgoState(day(11, 28)).stage).toBe('dropping');
    expect(ginkgoState(day(12, 3)).stage).toBe('carpet');
    expect(ginkgoState(day(12, 15)).stage).toBe('bare');
  });

  it('keeps today (Nov 23) butter-yellow for every tree offset', () => {
    for (let seed = 0; seed < 200; seed++) expect(ginkgoState(day(11, 23), ginkgoOffset(seed)).stage).toBe('gold');
  });

  it('drops in days, not weeks, and every tree within a week of the others', () => {
    const first = ginkgoState(day(11, 26));
    expect(first.leaves).toBeGreaterThan(0.7);
    expect(ginkgoState(day(11, 30)).leaves).toBe(0);
    for (let seed = 0; seed < 200; seed++) expect(Math.abs(ginkgoOffset(seed))).toBeLessThanOrEqual(3);
  });

  it('is bare across the new year and has no carpet in summer', () => {
    for (const d of [365, 366, 1, 2]) expect(ginkgoState(d)).toMatchObject({ stage: 'bare', leaves: 0, carpet: 0 });
    expect(ginkgoState(day(7, 1)).carpet).toBe(0);
  });

  it('carpet appears with the drop and fades out', () => {
    expect(ginkgoState(day(11, 24)).carpet).toBe(0);
    expect(ginkgoState(day(11, 28)).carpet).toBeGreaterThan(0);
    expect(ginkgoState(day(12, 1)).carpet).toBe(1);
    expect(ginkgoState(day(12, 10)).carpet).toBeLessThan(0.3);
  });
});

describe('ginkgo budget', () => {
  for (const q of ['high', 'low'] as const) {
    it(`stays within the generic Midtown tree at ${q} detail`, () => {
      expect(ginkgoTriangles(q).total).toBeLessThanOrEqual(genericTriangles(q));
    });
  }

  it('draws every ginkgo in three instanced meshes', () => {
    const trees = Array.from({ length: 40 }, (_, i) => ({ x: i * 20, z: 0, heightM: 17, crownM: 7, age: 1, seed: i }));
    for (const q of ['high', 'low'] as const) {
      const grove = createGinkgos(trees, q, () => 0)!;
      const meshes = grove.group.children as THREE.InstancedMesh[];
      expect(meshes).toHaveLength(3);
      expect(meshes.every(m => m instanceof THREE.InstancedMesh)).toBe(true);
      expect(meshes.find(m => m.name === 'ginkgo leaves')!.count).toBe(40 * GINKGO_CLUMPS[q]);
      grove.dispose();
    }
  });

  it('builds nothing when no tree lands on the board', () => {
    expect(createGinkgos([{ x: 0, z: 0, heightM: 10, crownM: 3, age: 0, seed: 1 }], 'high', () => null)).toBeNull();
  });

  it('hides every leaf in winter and shows them all in summer', () => {
    const grove = createGinkgos([{ x: 0, z: 0, heightM: 17, crownM: 7, age: 1, seed: 3 }], 'high', () => 0)!;
    const leaves = grove.group.getObjectByName('ginkgo leaves') as THREE.InstancedMesh;
    const visible = () => {
      let n = 0;
      const m = new THREE.Matrix4();
      for (let i = 0; i < leaves.count; i++) { leaves.getMatrixAt(i, m); if (m.determinant() !== 0) n++; }
      return n;
    };
    grove.setSeason(day(7, 1));
    expect(visible()).toBe(GINKGO_CLUMPS.high);
    grove.setSeason(day(1, 15));
    expect(visible()).toBe(0);
    grove.dispose();
  });
});
