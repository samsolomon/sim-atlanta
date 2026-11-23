import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { World } from './world';

/** A small board of broadleaf trees (colour seeds ≥ 0.26 are deciduous). */
function grove() {
  const w = new World({ bounds: { minX: 0, maxX: 200, minZ: 0, maxZ: 200 }, buildings: [], roads: [], rail: [] }, null, { terrain: 'flat', clumps: 3, lightMapMax: 64 });
  w.realTrees = Array.from({ length: 12 }, (_, i) => [20 + (i % 4) * 40, 30 + Math.floor(i / 4) * 50, 12, 4] as [number, number, number, number]);
  w.buildTrees(new THREE.OctahedronGeometry(1));
  w.trees.forEach((t, i) => { t.c = 0.3 + (i * 0.05) % 0.6; });
  const branches = () => {
    let b: THREE.InstancedMesh | undefined;
    w.group.traverse(o => { if (o instanceof THREE.InstancedMesh && o.geometry.attributes.color && !(o.material as THREE.MeshLambertMaterial).flatShading && (o.material as THREE.MeshLambertMaterial).vertexColors) b = o; });
    return b!;
  };
  return { w, branches };
}

describe('generic tree branch skeletons', () => {
  it('skip drawing under full summer leaf and return when leaves thin or drop', () => {
    const { w, branches } = grove();
    w.setSeason(180);
    expect(branches().visible).toBe(false);
    w.setSeason(15);
    expect(branches().visible).toBe(true);
    w.setSeason(335);
    expect(branches().visible).toBe(true);
  });

  it('hide for far views and stop casting shadows on request', () => {
    const { w, branches } = grove();
    w.setSeason(15);
    w.setDetail({ farTrees: true, branchShadows: false });
    expect(branches().visible).toBe(false);
    expect(branches().castShadow).toBe(false);
    w.setDetail({ farTrees: false });
    expect(branches().visible).toBe(true);
    // Season changes keep the far-view choice.
    w.setDetail({ farTrees: true });
    w.setSeason(16);
    expect(branches().visible).toBe(false);
  });
});

describe('branch instances', () => {
  it('draw only for thinning broadleaves, never pines or magnolias', () => {
    const { w, branches } = grove();
    // Make a third of the grove evergreen.
    w.trees.forEach((t, i) => { if (i % 3 === 0) t.c = 0.1; });
    w.setSeason(15); // winter: every broadleaf bare
    const broadleaves = w.trees.filter(t => t.c >= 0.26).length;
    expect(branches().count).toBe(broadleaves);
    w.setSeason(180);
    expect(branches().count).toBe(0);
  });
});

describe('named crown sizes', () => {
  it('enlarge broadleaves past the usual cap without changing any colour seed', () => {
    const build = (big: boolean) => {
      const w = new World({ bounds: { minX: 0, maxX: 400, minZ: 0, maxZ: 400 }, buildings: [], roads: [], rail: [] }, null, { terrain: 'flat', clumps: 3, lightMapMax: 64 });
      w.realTrees = Array.from({ length: 30 }, (_, i) => [20 + (i % 6) * 60, 20 + Math.floor(i / 6) * 70, 12, 4] as [number, number, number, number]);
      if (big) w.crownSize = () => ({ h: 30, r: 13 });
      w.buildTrees();
      return w.trees;
    };
    const plain = build(false), big = build(true);
    expect(big.map(t => t.c)).toEqual(plain.map(t => t.c));
    big.forEach((t, i) => {
      if (t.c >= 0.26) {
        expect(t.s).toBeGreaterThan(4.5);
        // A real trunk: at least a quarter of the 30 m height.
        expect(t.th!).toBeGreaterThanOrEqual(30 * 0.25 - 1e-9);
      } else {
        expect(t.s).toBe(plain[i].s);
        expect(t.th).toBe(plain[i].th);
      }
    });
  });

  it('make a planted broadleaf deciduous whatever seed it drew', () => {
    const w = new World({ bounds: { minX: 0, maxX: 400, minZ: 0, maxZ: 400 }, buildings: [], roads: [], rail: [] }, null, { terrain: 'flat', clumps: 3, lightMapMax: 64 });
    w.realTrees = Array.from({ length: 40 }, (_, i) => [10 + (i % 8) * 45, 20 + Math.floor(i / 8) * 70, 20, 8] as [number, number, number, number]);
    w.crownSize = () => ({ h: 24, r: 9, broadleaf: true });
    w.buildTrees();
    for (const t of w.trees) expect(t.c).toBeGreaterThanOrEqual(0.26);
  });
});
