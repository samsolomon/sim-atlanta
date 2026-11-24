import { expect, it } from 'vitest';
import { Mesh, Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createMuseumTower, museumTowerId } from './museum-tower';

it('raises Museum Tower to its lidar deck and penthouse, with the crown band lit at night', () => {
  const site: VBuilding = { id: museumTowerId, h: 94, floors: 25,
    rings: [[[-25.8, -986.1], [-25.9, -948.1], [4.9, -948.0], [5.1, -985.9]]] };
  const grid = new GroundGrid({ version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: -300, maxX: 300, minZ: -1300, maxZ: -700 }, encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 }, scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '' },
  new Int16Array(4).fill(2981).buffer);
  const model = createMuseumTower([site], grid)!;
  expect(model.buildings).toEqual([]);
  model.group.updateMatrixWorld(true);
  const top = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 300, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y + 300;
  expect(top(-18, -967)).toBeCloseTo(298.1 + 93.9, 0); // penthouse, lidar 95th percentile
  expect(top(0, -967)).toBeCloseTo(298.1 + 85.8, 0); // planted roof deck near the lidar median
  const [body, lamps] = model.group.children as Mesh[];
  expect(body.geometry.getAttribute('position').count / 3).toBeLessThanOrEqual(2400);
  model.setNight(1);
  expect((lamps.material as { emissiveIntensity: number }).emissiveIntensity).toBeGreaterThan(0);
});
