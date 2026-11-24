import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CULL_LAYER, DetailCull, nextCulled, projectedRadiusPx } from './detail-cull';
import { boxDistance, pastFog } from './manager';

function camera(z: number) {
  const c = new THREE.PerspectiveCamera(22, 1, 1, 1e5);
  c.position.set(0, 0, z);
  c.updateMatrixWorld();
  return c;
}

describe('detail cull', () => {
  it('projects a sphere to pixels on City\'s lens', () => {
    // A 1 m sphere 1 km away on a 22° lens and an 892 px canvas is about 2.3 px in radius.
    expect(projectedRadiusPx(1, 1000, 22, 892)).toBeCloseTo(2.29, 1);
  });
  it('culls below 0.75 px and restores above 1 px', () => {
    expect(nextCulled(false, 0.8)).toBe(false);
    expect(nextCulled(false, 0.7)).toBe(true);
    expect(nextCulled(true, 0.9)).toBe(true);
    expect(nextCulled(true, 1.1)).toBe(false);
  });
  it('moves a sub-pixel mesh off layer 0 and keeps glowing or instanced ones', () => {
    const root = new THREE.Group();
    const small = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshLambertMaterial());
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshLambertMaterial({ emissive: '#ffcc88' }));
    const named = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshLambertMaterial());
    named.name = 'crown lights';
    const trees = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshLambertMaterial(), 4);
    const big = new THREE.Mesh(new THREE.BoxGeometry(200, 200, 200), new THREE.MeshLambertMaterial());
    root.add(small, lamp, named, trees, big);
    root.updateMatrixWorld();
    const cull = new DetailCull(() => [root]);
    cull.update(camera(2000), 892);
    expect(small.layers.isEnabled(0)).toBe(false);
    expect(small.layers.isEnabled(CULL_LAYER)).toBe(true);
    for (const kept of [lamp, named, trees, big]) expect(kept.layers.isEnabled(0)).toBe(true);
    expect(cull.count).toBe(1);
    // Close in: the small mesh comes back.
    cull.update(camera(20), 892, performance.now() + 1000);
    expect(small.layers.isEnabled(0)).toBe(true);
    // Night lights a material: an invalidated pass sees it with a still camera.
    cull.update(camera(2000), 892, performance.now() + 2000);
    expect(small.layers.isEnabled(0)).toBe(false);
    (small.material as THREE.MeshLambertMaterial).emissive.set('#332211');
    cull.invalidate();
    cull.update(camera(2000), 892, performance.now() + 3000);
    expect(small.layers.isEnabled(0)).toBe(true);
    cull.dispose();
  });
});

describe('fog rule', () => {
  it('hides an area only once its nearest point is past the fog, with a gap to return', () => {
    expect(pastFog(false, 600, 660)).toBe(false);
    expect(pastFog(false, 720, 660)).toBe(true);
    expect(pastFog(true, 690, 660)).toBe(true);
    expect(pastFog(true, 650, 660)).toBe(false);
  });
  it('measures the eye to the nearest point of the box', () => {
    const b = { minX: 0, maxX: 100, minZ: 0, maxZ: 100 };
    expect(boxDistance(b, 50, 0, 50)).toBe(0);
    expect(boxDistance(b, 130, 40, 50)).toBe(50);
  });
});
