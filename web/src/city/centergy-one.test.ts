import { expect, it } from 'vitest';
import { Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import fixture from './fixtures/centergy-one.json';
import { centergyOneId, createCentergyOne } from './centergy-one';

const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: -100, maxX: 500, minZ: -2900, maxZ: -2300 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2912).buffer,
);

it('builds the brick tower at the lidar roof with the trellis crown', () => {
  const site = fixture as unknown as VBuilding;
  expect(site.id).toBe(centergyOneId);
  const other: VBuilding = { id: 'x', h: 10, floors: 3, rings: [[[0, -2500], [10, -2500], [10, -2490], [0, -2490]]] };
  const model = createCentergyOne([site, other], site, grid)!;
  expect(model.buildings).toEqual([other]);
  model.group.updateMatrixWorld(true);
  const h = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y + 323.8 - 291.2;
  // Lidar (2019): roof p50 58.8, p95 64.4 m; the trellis slats are the high returns.
  expect(h(189, -2632.1)).toBeCloseTo(64.7, 0); // a trellis slat over the roof centre
  expect(h(189, -2628)).toBeCloseTo(59.5, 0); // roof between slats
  const split = { ...site, rings: [site.rings[0], site.rings[0]] };
  expect(createCentergyOne([split], split, grid)).toBeNull();
});
