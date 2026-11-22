import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createTwelveCentennial } from './twelve-centennial';

it('keeps the east podium low, steps the north crown above the main roof and retains the adjoining hotel', () => {
  const tower: VBuilding = {
    id: 'ff0016db-34f2-44b2-9f28-30bfc6c26b9c',
    h: 150,
    floors: 39,
    rings: [
      [
        [358.3, -1245.89],
        [349.84, -1246.04],
        [342.12, -1246.17],
        [336.92, -1251.42],
        [324.22, -1264.25],
        [323.02, -1265.46],
        [321.88, -1264.23],
        [304.25, -1246.86],
        [300.12, -1246.94],
        [298.45, -1245.89],
        [295.69, -1245.9],
        [295.56, -1226.52],
        [295.57, -1222.19],
        [346, -1222.09],
        [349.81, -1222.17],
        [349.84, -1226.26],
        [357.93, -1226.26],
      ],
    ],
  };
  const hotel = { ...tower, id: 'b3827be6-be37-4ae8-8605-e99d8b07ec53' };
  const grid = new GroundGrid(
    {
      version: 1,
      rows: 2,
      cols: 2,
      stepM: 100,
      bounds: { minX: 280, maxX: 380, minZ: -1300, maxZ: -1200 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3050).buffer
  );
  const { group, buildings } = createTwelveCentennial([tower, hotel], grid)!;
  expect(buildings).toEqual([hotel]);
  group.updateMatrixWorld(true);
  const height = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(group)[0].point.y + 323.8;
  expect(height(356, -1237)).toBeCloseTo(314.6);
  expect(height(305, -1232)).toBeCloseTo(429.15);
  expect(height(323, -1239)).toBeCloseTo(435.5);
  expect(height(323, -1262.5)).toBeCloseTo(445.1);
  expect(height(321.7, -1264)).toBeCloseTo(457.5);
  expect(createTwelveCentennial([hotel], grid)).toBeNull();
});
