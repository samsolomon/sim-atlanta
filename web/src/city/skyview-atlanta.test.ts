import { expect, it } from 'vitest';
import { Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createSkyView, skyViewId } from './skyview-atlanta';

it('stands SkyView in its mapped plane at the lidar height, within the landmark budget', () => {
  const site: VBuilding = { id: skyViewId, h: 61, floors: null,
    rings: [[[-5.8, -566.5], [-7.5, -568.0], [-40.8, -530.2], [-39.1, -528.7]]] };
  const grid = new GroundGrid({ version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: -300, maxX: 300, minZ: -900, maxZ: -300 }, encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 }, scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '' },
  new Int16Array(4).fill(1710).buffer);
  const model = createSkyView([site], grid)!;
  expect(model.buildings).toEqual([]);
  model.group.updateMatrixWorld(true);
  // Ground is NAVD88 171 m, scene y = NAVD88 - 300 = -129. Looking across the wheel's plane at its
  // centre line: the rim top (axle 29 m + radius 25 m) is solid, and nothing reaches 58 m.
  const across = new Vector3(37.7, 0, 33.4).normalize(), ground = 171 - 300;
  const hit = (h: number) => new Raycaster(new Vector3(-23.3, ground + h, -548.35).addScaledVector(across, -100), across)
    .intersectObject(model.group).length > 0;
  expect(hit(53.8)).toBe(true);
  expect(hit(29)).toBe(true); // the hub
  expect(hit(56)).toBe(false); // gondola tops stop at ~54.7 m, the lidar top
  // Every gondola floor clears the ground: nothing solid in the bottom 0.6 m under the wheel.
  const down = new Raycaster(new Vector3(-23.3, ground + .6, -548.35), new Vector3(0, -1, 0)).intersectObject(model.group);
  expect(down.filter(h => h.point.y > ground + .05)).toHaveLength(0);
  const [body, lamps] = model.group.children as Mesh[];
  expect(body.geometry.getAttribute('position').count / 3).toBeLessThanOrEqual(2400);
  model.setNight(1);
  expect((lamps.material as MeshLambertMaterial).emissiveIntensity).toBeGreaterThan(0);
});
