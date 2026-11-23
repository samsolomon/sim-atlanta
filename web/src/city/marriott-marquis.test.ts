import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createMarriottMarquis } from './marriott-marquis';

it('keeps the offices separate and widens the hotel below the surveyed roof', () => {
  const hotel: VBuilding = {
    id: 'f36a8d1a-981d-4229-bfcf-f2635e5ab028',
    h: 20.53,
    floors: 3,
    rings: [
      [
        [675, -915],
        [588, -917],
        [587, -881],
        [525, -881],
        [525, -832],
        [586, -831],
        [586, -795],
        [674, -794],
      ],
    ],
  };
  const offices = ['Marquis One', 'Marquis Two'].map((id) => ({ ...hotel, id }));
  const grid = new GroundGrid(
    {
      version: 1,
      rows: 2,
      cols: 2,
      stepM: 190,
      bounds: { minX: 500, maxX: 690, minZ: -940, maxZ: -750 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3130).buffer
  );
  const result = createMarriottMarquis([...offices, hotel], grid)!;
  expect(result.buildings).toEqual(offices);
  result.group.updateMatrixWorld(true);
  const hit = (x: number, y: number, z: number, dir: Vector3) =>
    new Raycaster(new Vector3(x, y - 323.8, z), dir).intersectObject(result.group)[0].point;
  const down = new Vector3(0, -1, 0),
    south = new Vector3(0, 0, 1);
  expect(hit(643, 500, -854, down).y + 323.8).toBeCloseTo(471.4, 1);
  expect(hit(610, 500, -905, down).y + 323.8).toBeCloseTo(334.3, 1);
  expect(hit(625, 350, -910, south).z).toBeLessThan(hit(625, 453, -910, south).z - 10);
  expect(createMarriottMarquis(offices, grid)).toBeNull();
});
