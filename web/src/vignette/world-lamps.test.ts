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
  w.setNight(1);
  for (const m of posts) expect(m.count).toBe(total);
  w.setNight(0);
  w.setDetail({ farLamps: false });
  for (const m of posts) expect(m.count).toBe(total);
});
