import { expect, it } from 'vitest';
import { Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import fixture from './fixtures/the-landmark.json';
import { createTheLandmark, landmarkId } from './the-landmark';

const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: 600, maxX: 1200, minZ: -1000, maxZ: -400 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2969).buffer,
);

it('replaces the 86 m extrusion with the lidar-height slab', () => {
  const site = fixture as unknown as VBuilding;
  expect(site.id).toBe(landmarkId);
  const other: VBuilding = { id: 'x', h: 10, floors: 3, rings: [[[700, -500], [710, -500], [710, -490], [700, -490]]] };
  const model = createTheLandmark([site, other], grid)!;
  expect(model.buildings).toEqual([other]);
  model.group.updateMatrixWorld(true);
  const h = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y + 323.8 - 296.9;
  // Lidar (2019): roof p50 62.5, p95 67.9 m; mapped 86.2 m is wrong.
  expect(h(908, -684)).toBeCloseTo(64.6, 0); // parapet deck off the penthouse
  expect(h(921.9, -691.9)).toBeCloseTo(67.9, 0); // penthouse
  expect(createTheLandmark([other], grid)).toBeNull();
});
