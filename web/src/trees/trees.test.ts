import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { genericTriangles } from './generic';
import { ginkgo, ginkgoState } from './ginkgo';
import { SPECIES } from './index';
import { createTrees, skeletonGeometry, treeTriangles, type TreePlacement } from './render';
import { SIZE_CLASSES, calendarDoy, doyOf, hash01 } from './species';

const offsets = (days: number) => Array.from({ length: 200 }, (_, seed) => (hash01(seed, 2) * 2 - 1) * days);

describe('generic baseline', () => {
  it('counts the Midtown leaf-clump tree from the meshes World builds', () => {
    // 8 or 3 octahedron clumps, a capped five-sided trunk and seven capped four-sided branches.
    expect(genericTriangles('high')).toEqual({ total: 196, draws: 3 });
    expect(genericTriangles('low')).toEqual({ total: 156, draws: 3 });
  });
});

describe.each(SPECIES.map(s => [s.id, s] as const))('%s', (_, species) => {
  for (const size of SIZE_CLASSES) {
    it(`${size}: nominal size lies in its sourced range`, () => {
      const n = species.sizes[size], r = species.ranges[size];
      for (const k of ['heightM', 'spreadM', 'calliperM'] as const) {
        expect(n[k]).toBeGreaterThanOrEqual(r[k][0]);
        expect(n[k]).toBeLessThanOrEqual(r[k][1]);
      }
    });
    for (const q of ['high', 'low'] as const) {
      it(`${size} ${q}: within the generic tree's triangles, one pad per clump, true calliper`, () => {
        expect(treeTriangles(species, size, q).total).toBeLessThanOrEqual(genericTriangles(q).total);
        const form = species.form(size, q, species.sizes[size]);
        expect(form.pads).toHaveLength(species.clumps[q]);
        // The trunk's unit radius times the crown radius is half the calliper.
        const d = species.sizes[size];
        expect(form.segs[0].r0 * d.spreadM).toBeCloseTo(d.calliperM, 6);
        // And the drawn trunk base is that wide, round, at the nominal size.
        const g = skeletonGeometry(species, size, q);
        const pos = g.attributes.position;
        let half = 0;
        for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 1e-6) half = Math.max(half, Math.hypot(pos.getX(i), pos.getZ(i)) * d.spreadM / 2);
        expect(half * 2).toBeCloseTo(d.calliperM, 3);
      });
    }
  }
});

describe('ginkgo season', () => {
  const stage = (m: number, d: number, offset = 0) => ginkgoState(doyOf(m, d), offset).stage;
  it('follows the Atlanta calendar', () => {
    expect(stage(1, 15)).toBe('bare');
    expect(stage(4, 5)).toBe('leafout');
    expect(stage(7, 1)).toBe('green');
    expect(stage(10, 31)).toBe('green');
    expect(stage(11, 8)).toBe('turning');
    expect(stage(11, 30)).toBe('dropping');
    expect(stage(12, 5)).toBe('carpet');
    expect(stage(12, 20)).toBe('bare');
  });
  it('is full gold Nov 23–24 for every tree, as dated photos show', () => {
    for (const o of offsets(ginkgo.offsetDays)) {
      expect(stage(11, 23, o)).toBe('gold');
      expect(stage(11, 24, o)).toBe('gold');
    }
  });
  it('reads leap-year dates on the same calendar', () => {
    expect(calendarDoy(new Date('2028-11-24T12:00:00-05:00'))).toBe(doyOf(11, 24));
    expect(calendarDoy(new Date('2028-02-29T12:00:00-05:00'))).toBe(doyOf(2, 28));
    expect(calendarDoy(new Date('2026-12-31T23:30:00-05:00'))).toBe(365);
  });
  it('drops in three days, not weeks', () => {
    expect(ginkgoState(doyOf(11, 28)).leaves).toBe(1);
    expect(ginkgoState(doyOf(12, 1)).leaves).toBe(0);
  });
  it('is bare across the new year, with no carpet in summer', () => {
    for (const d of [365, 366, 1, 2]) expect(ginkgoState(d)).toMatchObject({ stage: 'bare', leaves: 0, carpet: 0 });
    expect(ginkgoState(doyOf(7, 1)).carpet).toBe(0);
  });
  it('lays a carpet with the drop that fades by mid-December', () => {
    expect(ginkgoState(doyOf(11, 27)).carpet).toBe(0);
    expect(ginkgoState(doyOf(11, 30)).carpet).toBeGreaterThan(0);
    expect(ginkgoState(doyOf(12, 3)).carpet).toBe(1);
    expect(ginkgoState(doyOf(12, 12)).carpet).toBeLessThan(0.3);
  });
});

describe('renderer', () => {
  const row = (n: number): TreePlacement[] =>
    Array.from({ length: n }, (_, i) => ({ species: ginkgo, size: SIZE_CLASSES[i % 4], x: i * 30, z: 0, seed: i }));

  it('batches any number of trees into one limb draw per size class plus leaves and carpet', () => {
    for (const q of ['high', 'low'] as const) {
      const trees = createTrees(row(40), q, () => 0)!;
      expect(trees.draws).toBe(4 + 2);
      const leaves = trees.group.getObjectByName('clump leaves') as THREE.InstancedMesh;
      expect(leaves.count).toBe(40 * ginkgo.clumps[q]);
      trees.dispose();
    }
    const one = createTrees(row(1), 'high', () => 0)!;
    expect(one.draws).toBe(3);
    one.dispose();
  });

  it('skips trees off the board and builds nothing for none', () => {
    expect(createTrees(row(3), 'high', () => null)).toBeNull();
  });

  it('shows every clump in summer and none in winter', () => {
    const trees = createTrees(row(1), 'high', () => 0)!;
    const leaves = trees.group.getObjectByName('clump leaves') as THREE.InstancedMesh;
    const shown = () => {
      const m = new THREE.Matrix4();
      let n = 0;
      for (let i = 0; i < leaves.count; i++) { leaves.getMatrixAt(i, m); if (m.determinant() !== 0) n++; }
      return n;
    };
    trees.setSeason(doyOf(7, 1));
    expect(shown()).toBe(ginkgo.clumps.high);
    trees.setSeason(doyOf(1, 15));
    expect(shown()).toBe(0);
    trees.dispose();
  });
});
