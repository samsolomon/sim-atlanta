import { expect, it } from 'vitest';
import { Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import site100 from './fixtures/colony-100.json';
import { colony100Id, createColony100 } from './colony-square';

const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: 500, maxX: 1100, minZ: -4000, maxZ: -3400 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2961).buffer,
);

it('replaces 100 Colony Square with the lidar roof, core and low bases', () => {
  const site = site100 as unknown as VBuilding;
  expect(site.id).toBe(colony100Id);
  const other: VBuilding = { id: 'osm:way:1', h: 10, floors: 3, rings: [[[600, -3500], [610, -3500], [610, -3490], [600, -3490]]] };
  const model = createColony100([site, other], grid)!;
  expect(model.buildings).toEqual([other]);
  model.group.updateMatrixWorld(true);
  // Ground 296.1 m NAVD88; heights above grade.
  const h = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 300, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y + 300 - 296.1;
  expect(h(822.15 + 10, -3673.5 + 4)).toBeCloseTo(89.3, 0); // main roof, off the core
  expect(h(822.15, -3673.5)).toBeCloseTo(96.3, 0); // core penthouse
  expect(h(838, -3660)).toBeCloseTo(8.7, 0); // NE low part 1414724141 stays low
  expect(createColony100([other], grid)).toBeNull();
});
