import { expect, it } from 'vitest';
import { Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import fixture from './fixtures/coca-cola-usa.json';
import { cokeUsaId, createCocaColaUsa } from './coca-cola-usa';

const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: -900, maxX: -300, minZ: -2100, maxZ: -1500 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2972).buffer,
);

it('builds the tower at the lidar roof, parapet and penthouse (NAVD88)', () => {
  const site = fixture as unknown as VBuilding;
  expect(site.id).toBe(cokeUsaId);
  const model = createCocaColaUsa([site], site, grid)!;
  expect(model.buildings).toEqual([]);
  model.group.updateMatrixWorld(true);
  const navd = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y + 323.8;
  expect(navd(-592, -1860)).toBeCloseTo(383.2, 1); // roof cap at the parapet line (the 1.1 m deck recess is not modelled)
  expect(navd(-577, -1820)).toBeCloseTo(388.8, 1); // penthouse
  expect(navd(-598.5, -1830)).toBeCloseTo(307.6, 1); // west strip is a low wing, not tower
  const split = { ...site, rings: [site.rings[0], site.rings[0]] };
  expect(createCocaColaUsa([split], split, grid)).toBeNull();
});
