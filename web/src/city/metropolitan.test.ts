import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createMetropolitan } from './metropolitan';

it('keeps the rear court open below the two roof housings and preserves the adjoining lot', () => {
  const tower: VBuilding = {
    id: 'ae833b60-6228-4d0e-8098-ccec8a81c2f8',
    h: 62.7,
    floors: 17,
    rings: [
      [
        [105.3, -80.24],
        [91.55, -96.11],
        [81.47, -86.58],
        [68.61, -74.41],
        [70.6, -72.9],
        [89.44, -58.67],
      ],
    ],
  };
  const neighbor: VBuilding = {
    id: '8823b763-1d37-44f3-b2f0-8b7de989868b',
    h: 72.7,
    floors: null,
    rings: [
      [
        [123.45, -66.83],
        [105.3, -80.24],
        [89.44, -58.67],
        [84.78, -51.53],
        [102.83, -39.2],
        [106.83, -45.47],
        [108.05, -44.69],
      ],
    ],
  };
  const grid = new GroundGrid(
    {
      version: 1,
      rows: 2,
      cols: 2,
      stepM: 200,
      bounds: { minX: 0, maxX: 200, minZ: -200, maxZ: 0 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3200).buffer,
  );
  expect(createMetropolitan([neighbor], grid)).toBeNull();
  expect(createMetropolitan([{ ...tower, rings: neighbor.rings }], grid)).toBeNull();
  const result = createMetropolitan([tower, neighbor], grid)!;
  expect(result.buildings).toEqual([neighbor]);
  result.group.updateMatrixWorld(true);
  function roof(x: number, z: number) {
    const origin = result.group.localToWorld(new Vector3(x, 405, z));
    const hits = new Raycaster(origin, new Vector3(0, -1, 0)).intersectObject(result.group, true);
    return hits[0]?.point.y + 323.8;
  }
  expect(roof(4, 17)).toBeCloseTo(386.2);
  expect(roof(20, 23)).toBeCloseTo(342);
  expect(roof(12, 7)).toBeCloseTo(388.15);
  expect(roof(13, 10)).toBeCloseTo(392.55);
  expect(roof(20, 7)).toBeCloseTo(391.9);
});
