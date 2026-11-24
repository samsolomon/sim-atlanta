import { expect, it } from 'vitest';
import { Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import fixture from './fixtures/winship.json';
import { createWinship, winshipId } from './winship';

const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: 200, maxX: 800, minZ: -2100, maxZ: -1500 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3110).buffer,
);

it('builds the tower, podium and canopy, and leaves the oculus open', () => {
  const site = fixture as unknown as VBuilding;
  expect(site.id).toBe(winshipId);
  const model = createWinship([site], site, grid)!;
  expect(model).not.toBeNull();
  expect(model.buildings).toEqual([]);
  model.group.updateMatrixWorld(true);
  const ray = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 300, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0]?.point.y;
  const h = (x: number, z: number) => (ray(x, z) ?? -1000) + 300 - 311;
  expect(h(569, -1813)).toBeCloseTo(89, 0); // mechanical screen on the tower
  expect(h(569, -1786)).toBeCloseTo(84, 0); // tower roof beyond the screen
  expect(h(540, -1840)).toBeCloseTo(18, 0); // podium
  expect(h(480, -1820)).toBeCloseTo(19.2, 0); // canopy
  expect(ray(496.2, -1803.5)).toBeUndefined(); // oculus: open to the ground
  const split = { ...site, rings: [site.rings[0], site.rings[0]] };
  expect(createWinship([split], split, grid)).toBeNull();
});
