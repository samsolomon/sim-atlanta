import { expect, it } from 'vitest';
import { Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import fixture from './fixtures/hampton-inn-midtown.json';
import { createHamptonInnMidtown, hamptonMidtownId } from './hampton-inn-midtown';

const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: 100, maxX: 700, minZ: -4100, maxZ: -3500 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2818).buffer,
);

it('builds the 20-storey slab, its rooftop lounge and the bronze corner frame', () => {
  const site = fixture as unknown as VBuilding;
  expect(site.id).toBe(hamptonMidtownId);
  const model = createHamptonInnMidtown([site], site, grid)!;
  expect(model.buildings).toEqual([]);
  model.group.updateMatrixWorld(true);
  const h = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y + 323.8 - 281.8;
  expect(h(395, -3822)).toBeCloseTo(66, 0); // lounge parapet (reported 20 storeys)
  expect(h(368, -3825)).toBeCloseTo(60.9, 0); // room roof, west of the lounge
  // The frame rises above the roof at the NW chamfer.
  expect(h(366.9, -3840.6)).toBeGreaterThan(66);
});
