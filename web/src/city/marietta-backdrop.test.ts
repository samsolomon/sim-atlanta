import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createMariettaBackdrop } from './marietta-backdrop';

it('corrects the low Marietta lot and keeps both adjoining rings', () => {
  const low: VBuilding = {
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
  const metro = { ...low, id: 'ae833b60-6228-4d0e-8098-ccec8a81c2f8' };
  const bank = { ...low, id: '774eb32e-59c3-4c18-8cf9-ac8e9470c669' };
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
  expect(createMariettaBackdrop([metro, bank], grid)).toBeNull();
  const result = createMariettaBackdrop([metro, low, bank], grid)!;
  expect(result.buildings).toEqual([metro, bank]);
  result.group.updateMatrixWorld(true);
  function roof(u: number, v: number) {
    const eye = result.group.localToWorld(new Vector3(u, 405, v));
    return new Raycaster(eye, new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 323.8;
  }
  expect(roof(12, 14)).toBeCloseTo(332.25);
  expect(roof(18, 28)).toBeCloseTo(339.45);
  expect(roof(20, 23)).toBeCloseTo(341.4);
});
