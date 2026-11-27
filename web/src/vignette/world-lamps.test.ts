import * as THREE from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { World } from './world';

afterEach(() => { vi.unstubAllGlobals(); });

it('drops park path lamps by day at a long orbit, keeps them at night and up close', () => {
  const ctx = { fillRect() {}, createRadialGradient: () => null, set fillStyle(_v: unknown) {}, set globalCompositeOperation(_v: unknown) {} };
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx, width: 0, height: 0 }) });
  const bounds = { minX: -300, maxX: 300, minZ: -300, maxZ: 300 };
  const w = new World({ bounds, buildings: [], roads: [], rail: [] }, null, { terrain: 'flat', clumps: 3, lightMapMax: 64 });
  w.buildLights(undefined, () => 0, undefined, { include: () => false, paths: [], lamps: [[50, 50]], dimPaths: [[[-200, 0], [200, 0]]] });
  const posts = w.group.children.filter((o): o is THREE.InstancedMesh => o instanceof THREE.InstancedMesh);
  const total = posts[0].instanceMatrix.count;
  const dim = posts[0].userData.lamps.dimPaths;
  expect(dim).toBeGreaterThan(8); // a lamp every 30 m along 400 m
  w.setNight(0);
  w.setDetail({ farLamps: true });
  for (const m of posts) expect(m.count).toBe(total - dim);
  // The first cull, by day, must not leave bounds that miss the park lamps once they return.
  for (const m of posts) {
    if (!m.boundingSphere) m.computeBoundingSphere();
    const at = new THREE.Matrix4(), p = new THREE.Vector3();
    for (let i = 0; i < total; i++) {
      m.getMatrixAt(i, at);
      expect(m.boundingSphere!.containsPoint(p.setFromMatrixPosition(at))).toBe(true);
    }
  }
  w.setNight(1);
  for (const m of posts) expect(m.count).toBe(total);
  w.setNight(0);
  w.setDetail({ farLamps: false });
  for (const m of posts) expect(m.count).toBe(total);
});

it('keeps every street lamp where it is when the park paths change', () => {
  const ctx = { fillRect() {}, createRadialGradient: () => null, set fillStyle(_v: unknown) {}, set globalCompositeOperation(_v: unknown) {} };
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx, width: 0, height: 0 }) });
  const bounds = { minX: -300, maxX: 300, minZ: -300, maxZ: 300 };
  const roads = [{ cls: 'residential', name: null, bridge: false, tunnel: false, pts: [[-280, 100], [280, 100]] as [number, number][] }];
  const streetLamps = (dimPaths: [number, number][][]) => {
    const w = new World({ bounds, buildings: [], roads, rail: [] }, null, { terrain: 'flat', clumps: 3, lightMapMax: 64 });
    w.buildLights(undefined, () => 0, undefined, { include: () => true, paths: [], lamps: [], dimPaths });
    const posts = w.group.children.find((o): o is THREE.InstancedMesh => o instanceof THREE.InstancedMesh)!;
    const at = new THREE.Matrix4();
    return Array.from({ length: posts.count - posts.userData.lamps.dimPaths }, (_, i) => { posts.getMatrixAt(i, at); return at.elements.slice(12, 15); });
  };
  const none = streetLamps([]);
  expect(none.length).toBeGreaterThan(5);
  expect(streetLamps([[[-200, -100], [200, -100]], [[-200, -150], [200, -150]]])).toEqual(none);
});
