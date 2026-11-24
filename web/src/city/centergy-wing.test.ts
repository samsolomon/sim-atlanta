import { expect, it } from 'vitest';
import { Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import fixture from './fixtures/centergy-wing.json';
import { centergyWingId, createCentergyWing } from './centergy-wing';

const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: -100, maxX: 500, minZ: -2900, maxZ: -2300 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2934).buffer,
);

it('builds the glass wing at the lidar roof and leaves its party wall bare', () => {
  const site = fixture as unknown as VBuilding;
  expect(site.id).toBe(centergyWingId);
  const model = createCentergyWing([site], site, grid)!;
  expect(model.buildings).toEqual([]);
  model.group.updateMatrixWorld(true);
  const h = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y + 323.8 - 293.4;
  expect(h(240, -2620)).toBeCloseTo(52.2, 0); // roof
  expect(h(229.8, -2631.8)).toBeCloseTo(57, 0); // plant
  // Nothing stands proud of the west (party) wall shared with Centergy One.
  const r = new Raycaster(new Vector3(195, 330 - 323.8, -2631.8), new Vector3(1, 0, 0)).intersectObject(model.group)[0];
  expect(r.point.x).toBeGreaterThan(202.3);
});
