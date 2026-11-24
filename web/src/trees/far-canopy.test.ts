import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { farCanopyInstances, farCrown } from './far-canopy';
import { World } from '../vignette/world';

const pine = { x: 0, y: 0, z: 0, s: 1, c: 0.1 };
const magnolia = { x: 10, y: 0, z: 0, s: 1, c: 0.2 };
const oak = { x: 20, y: 2, z: 5, s: 1.5, c: 0.5, th: 4 };

describe('far canopy', () => {
  it('draws two clumps and a trunk per broadleaf, two cones per pine, and only the trunk when bare', () => {
    const summer = farCanopyInstances([pine, magnolia, oak], 180);
    // Clumps for the magnolia and the oak, and a trunk for each tree; the pine's two tiers are cones.
    expect(summer.count).toBe(2 + 2 + 3);
    expect(summer.pines.count).toBe(2);
    // 15 January: the oak is bare, the evergreens are not.
    const winter = farCanopyInstances([pine, magnolia, oak], 15);
    expect(winter.count).toBe(2 + 3);
    expect(winter.pines.count).toBe(2);
  });

  it('stacks a pine\'s cones from its trunk top, the upper one narrower', () => {
    const { pines } = farCanopyInstances([pine], 180);
    const at = (i: number) => new THREE.Matrix4().fromArray(pines.matrices, i * 16);
    const [lo, hi] = [at(0), at(1)].map(m => ({ p: new THREE.Vector3().setFromMatrixPosition(m), s: new THREE.Vector3().setFromMatrixScale(m) }));
    expect(lo.p.y).toBeCloseTo(2 + 0.6);
    expect(hi.p.y).toBeGreaterThan(lo.p.y);
    expect(hi.s.x).toBeLessThan(lo.s.x);
  });

  it('reuses a buffer and writes plain transferable arrays', () => {
    const out = farCanopyInstances([oak], 180);
    expect(out.matrices).toBeInstanceOf(Float32Array);
    const again = farCanopyInstances([oak], 300, out);
    expect(again.matrices).toBe(out.matrices);
    // The trunk stands on the ground under the tree.
    const m = new THREE.Matrix4().fromArray(out.matrices, (out.count - 1) * 16);
    const p = new THREE.Vector3().setFromMatrixPosition(m);
    expect(p.x).toBeCloseTo(20);
    expect(p.z).toBeCloseTo(5);
  });

  it('colours a crown as World.setSeason does', () => {
    // Summer greens and the evergreen colours come from World's palette, in linear RGB.
    const green = ['#5f8f4e', '#6e9d55', '#4f7f45', '#7ea65f', '#5a8a58'][Math.floor(((oak.c * 3.1) % 1) * 5)];
    expect(farCrown(oak, 180).colour.map(v => +v.toFixed(5))).toEqual(new THREE.Color(green).toArray().map(v => +v.toFixed(5)));
    expect(farCrown(pine, 15).colour.map(v => +v.toFixed(5))).toEqual(new THREE.Color('#355f3c').toArray().map(v => +v.toFixed(5)));
  });
});

describe('World far form', () => {
  const build = (farForm: boolean) => {
    const bounds = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
    const w = new World({ bounds, buildings: [], roads: [], rail: [] }, null, { terrain: 'flat', clumps: 3, lightMapMax: 256, farForm });
    w.realTrees = [[0, 0, 12, 3], [30, 10, 18, 5], [-40, 20, 8, 2], [50, -30, 20, 6]];
    w.buildTrees(new THREE.OctahedronGeometry(1));
    w.setSeason(300);
    return w;
  };
  const meshes = (w: World) => w.group.children.filter((o): o is THREE.InstancedMesh => o instanceof THREE.InstancedMesh);

  it('leaves the near trees exactly as they were', () => {
    const [off, on] = [build(false), build(true)];
    const near = (w: World) => meshes(w).filter(m => !m.name.startsWith('far ')).map(m => [m.count, [...m.instanceMatrix.array.slice(0, m.count * 16)], m.instanceColor ? [...m.instanceColor.array.slice(0, m.count * 3)] : null]);
    expect(near(on)).toEqual(near(off));
    expect(meshes(off).some(m => m.name.startsWith('far '))).toBe(false);
  });

  it('swaps the near meshes for one far draw under farTrees, and back', () => {
    const w = build(true);
    const far = meshes(w).find(m => m.name === 'far trees')!;
    expect(far.visible).toBe(false);
    w.setDetail({ farTrees: true });
    // Only far meshes draw (the pine cones too, when the area has pines).
    const drawn = meshes(w).filter(m => m.visible).map(m => m.name);
    expect(drawn).toContain('far trees');
    expect(drawn.every(n => n.startsWith('far '))).toBe(true);
    w.setDetail({ farTrees: false });
    expect(far.visible).toBe(false);
    expect(meshes(w).filter(m => m.visible).length).toBeGreaterThan(1);
  });

  it('keeps the far form out of the shadow pass at a long orbit, and back', () => {
    const w = build(true);
    const far = meshes(w).filter(m => m.name.startsWith('far '));
    w.setDetail({ farTrees: true, farShadows: false });
    expect(far.every(m => !m.castShadow)).toBe(true);
    w.setDetail({ farShadows: true });
    expect(far.every(m => m.castShadow)).toBe(true);
    // The near trees always cast.
    expect(meshes(w).filter(m => !m.name.startsWith('far ')).every(m => m.castShadow)).toBe(true);
  });
});
