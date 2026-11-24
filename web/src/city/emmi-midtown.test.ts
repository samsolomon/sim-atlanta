import { expect, it } from 'vitest';
import { Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createEmmiMidtown, emmiMidtownId } from './emmi-midtown';

// The mapped outline as staged in brookwood-south/context.json.
const ring: [number, number][] = [
  [237.58, -4335.31], [257.48, -4335.47], [279.95, -4335.66], [279.83, -4350.34], [279.8, -4353.01],
  [282.15, -4353.03], [282.01, -4370.38], [279.76, -4370.36], [279.72, -4374.73], [274.99, -4374.69],
  [237.25, -4374.37],
];

it('replaces the outline with the 102 m tower over a 36 m podium', () => {
  const site: VBuilding = { id: emmiMidtownId, h: null, floors: 31, rings: [ring] };
  const grid = new GroundGrid(
    {
      version: 1, rows: 2, cols: 2, stepM: 600,
      bounds: { minX: 0, maxX: 600, minZ: -4600, maxZ: -4000 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
      scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
    },
    new Int16Array(4).fill(2900).buffer,
  );
  const model = createEmmiMidtown([site], site, grid)!;
  expect(model).not.toBeNull();
  expect(model.buildings).toEqual([]);
  const split = { ...site, rings: [ring, ring] };
  expect(createEmmiMidtown([split], split, grid)).toBeNull();
  model.group.updateMatrixWorld(true);
  // Ground is 290 m NAVD88, scene zero 300 m.
  const roof = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 400, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y + 10;
  expect(roof(259.7 - 4, -4355 - 15)).toBeCloseTo(102.3, 1); // 18th Street wing
  expect(roof(259.7 - 15, -4355 + 15)).toBeCloseTo(102.3, 1); // Spring Street wing
  expect(roof(259.7 + 18, -4355 + 17)).toBeCloseTo(36, 1); // podium deck
});
