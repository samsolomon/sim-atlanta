import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createHyattRegency } from './hyatt-regency';

it('keeps the restaurant, atrium and both later towers at distinct surveyed elevations', () => {
  const hotel: VBuilding = {
    id: '0feb6547-009b-487f-954b-3a4f2a864df6',
    h: 8,
    floors: 2,
    rings: [
      [
        [385, -795],
        [505, -795],
        [506, -918],
        [409, -919],
        [411, -829],
        [385, -829],
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
      bounds: { minX: 350, maxX: 540, minZ: -940, maxZ: -750 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3130).buffer
  );
  const result = createHyattRegency([...offices, hotel], grid)!;
  expect(result.buildings).toEqual(offices);
  result.group.updateMatrixWorld(true);
  const hit = (x: number, y: number, z: number, dir: Vector3) =>
    new Raycaster(new Vector3(x, y - 323.8, z), dir).intersectObject(result.group)[0].point;
  const down = new Vector3(0, -1, 0);
  const height = (x: number, z: number) => hit(x, 500, z, down).y + 323.8;
  expect(height(442.98, -844.09)).toBeCloseTo(417.2, 1);
  expect(height(432, -845)).toBeCloseTo(410, 0);
  expect(height(455, -807)).toBeCloseTo(395.3, 1);
  expect(height(399, -810)).toBeCloseTo(398.15, 1);
  expect(height(489, -905)).toBeCloseTo(332, 1);
  expect(createHyattRegency(offices, grid)).toBeNull();
});
