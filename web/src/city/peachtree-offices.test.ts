import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createPeachtreeOffices } from './peachtree-offices';

it('separates the limestone tower from its Baker Street podium and the glass tower', () => {
  const sites: VBuilding[] = [
    {
      id: '312f9110-8d45-4b1a-8082-bb3720a51340',
      h: 97.0,
      floors: 22,
      rings: [
        [
          [352.93, -868.09],
          [353.24, -909.95],
          [346.43, -910.0],
          [346.46, -917.72],
          [309.0, -917.86],
          [309.01, -920.83],
          [286.01, -920.92],
          [285.9, -890.57],
          [295.07, -890.54],
          [294.96, -859.89],
          [323.59, -859.94],
          [323.48, -868.26],
        ],
      ],
    },
    {
      id: '2a1d8e6b-2b13-4c6a-8a27-d7520cd38bec',
      h: 115.0,
      floors: 27,
      rings: [
        [
          [361.1, -829.33],
          [361.23, -859.76],
          [323.59, -859.94],
          [323.45, -829.49],
        ],
      ],
    },
  ];
  const next = { ...sites[0], id: 'unrelated' };
  const grid = new GroundGrid(
    {
      version: 1,
      rows: 2,
      cols: 2,
      stepM: 600,
      bounds: { minX: 0, maxX: 600, minZ: -1000, maxZ: -400 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3140).buffer,
  );
  const result = createPeachtreeOffices([...sites, next], grid)!;
  expect(result.buildings).toEqual([next]);
  expect(createPeachtreeOffices([next], grid)).toBeNull();
  result.group.updateMatrixWorld(true);
  const ray = (x: number, z: number, y = 500, dy = -1) =>
    new Raycaster(new Vector3(x, y - 323.8, z), new Vector3(0, dy, 0)).intersectObject(result.group)[0]?.point.y;

  expect(ray(298, -906)! + 323.8).toBeCloseTo(328.3, 1);
  expect(ray(347, -885)! + 323.8).toBeCloseTo(405.5, 1);
  expect(ray(332, -891)! + 323.8).toBeCloseTo(413.1, 1);
  expect(ray(358, -850)! + 323.8).toBeCloseTo(429.6, 1);
  expect(ray(338, -847)! + 323.8).toBeCloseTo(435.8, 1);
});
