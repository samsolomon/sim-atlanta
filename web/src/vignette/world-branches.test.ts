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
    w.group.traverse(o => { if (o instanceof THREE.InstancedMesh && o.geometry.attributes.color && o.count === w.trees.length && !(o.material as THREE.MeshLambertMaterial).flatShading && (o.material as THREE.MeshLambertMaterial).vertexColors) b = o; });
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
