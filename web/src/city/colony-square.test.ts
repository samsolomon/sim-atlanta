import { expect, it } from 'vitest';
import { Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import site100 from './fixtures/colony-100.json';
import site400 from './fixtures/colony-400.json';
import { colony100Id, colony400Id, createColony100, createColony400 } from './colony-square';

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

it('replaces 400 Colony Square with its 83.3 m roof, parapet ring and stepped core', () => {
  const site = site400 as unknown as VBuilding;
  expect(site.id).toBe(colony400Id);
  const model = createColony400([site], grid)!;
  expect(model.buildings).toEqual([]);
  model.group.updateMatrixWorld(true);
  const c = Math.SQRT1_2, o = [796.77, -3752.77];
  // Local (u, v) on the 45° frame to world (x, z).
  const at = (u: number, v: number) => [o[0] + (u + v) * c, o[1] + (v - u) * c];
  const h = (u: number, v: number) => {
    const [x, z] = at(u, v);
    return new Raycaster(new Vector3(x, 300, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y + 300 - 296.1;
  };
  expect(h(10, 15)).toBeCloseTo(83.3, 0); // roof deck
  expect(h(-18.8, 0)).toBeCloseTo(86, 0); // parapet ring
  expect(h(0, -10)).toBeCloseTo(91.2, 0); // upper core
  expect(h(0, 0)).toBeCloseTo(89.9, 0); // lower core
});
