import { expect, it } from 'vitest';
import { Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createHardRock, hardRockId } from './hard-rock';

// The Overture outline as staged in downtown/vignette.json (mapped 69.3 m).
const site: VBuilding = {
  id: hardRockId, h: 69.3, floors: null as unknown as number,
  rings: [[[383.1, -686.5], [382.6, -655.2], [437.4, -654.6], [437.9, -685.8], [389.1, -686.5]]],
};
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: 100, maxX: 700, minZ: -900, maxZ: -300 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3243).buffer,
);

it('replaces the 69 m extrusion with the lidar-height six-storey block', () => {
  const other: VBuilding = { id: 'x', h: 10, floors: 3, rings: [[[100, -400], [110, -400], [110, -390], [100, -390]]] };
  const model = createHardRock([site, other], grid)!;
  expect(model.buildings).toEqual([other]);
  model.group.updateMatrixWorld(true);
  const h = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y + 323.8 - 324.3;
  // Lidar (2019) roof p50 22.3, p95 26.3 m; mapped 69.3 m is wrong.
  expect(h(395, -660)).toBeCloseTo(24.2, 0); // parapet deck
  expect(h(416, -668)).toBeCloseTo(26.8, 0); // rooftop plant
  expect(h(395, -660)).toBeLessThan(30);
  expect(createHardRock([other], grid)).toBeNull();
});
