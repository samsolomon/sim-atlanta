import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createFultonBank } from './55-marietta';

it('separates the Fulton Bank roof levels and keeps the Marietta entrance recessed', () => {
  const sites: VBuilding[] = [
    {
      id: '57b15807-8d28-41b6-99c4-82bfb7a56eb9',
      rings: [
        [
          [41.28, -255.37],
          [15.92, -233.6],
          [56.48, -188.02],
          [81.95, -209.78],
        ],
      ],
      h: 90.0,
      floors: 21,
    },
  ];
  const next: VBuilding = {
    id: 'eac07580-5f94-48d6-bacd-7e4cd932bc68',
    rings: [
      [
        [86.2, -254.66],
        [63.83, -235.22],
        [67.63, -230.53],
        [68.76, -231.51],
        [77.16, -221.83],
        [75.85, -220.7],
        [83.94, -211.38],
        [106.6, -231.05],
      ],
    ],
    h: 18.7,
    floors: 2,
  };
  const grid = new GroundGrid(
    {
      version: 1,
      rows: 2,
      cols: 2,
      stepM: 600,
      bounds: { minX: -100, maxX: 500, minZ: -500, maxZ: 100 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3180).buffer,
  );
  const result = createFultonBank([...sites, next], grid)!;
  expect(result.buildings).toEqual([next]);
  expect(createFultonBank([next], grid)).toBeNull();
  result.group.updateMatrixWorld(true);
  const ray = (x: number, z: number, y = 500, dy = -1) =>
    new Raycaster(new Vector3(x, y - 323.8, z), new Vector3(0, dy, 0)).intersectObject(result.group)[0]?.point.y;
  const len = Math.hypot(25.36, 21.77);
  const xz = (u: number, v: number) =>
    [15.92 + (25.36 * u + 21.77 * v) / len, -233.6 + (-21.77 * u + 25.36 * v) / len] as const;
  const roof = (u: number, v: number) => ray(...xz(u, v))! + 323.8;
  expect(roof(12, 17)).toBeCloseTo(397.7, 1);
  expect(roof(12, 42)).toBeCloseTo(406.22, 1);
  expect(roof(26, 38)).toBeCloseTo(408.34, 1);
  expect(roof(32.7, 38)).toBeCloseTo(412.36, 1);
  // At mid-height the projecting core meets the lower roof along the Fairlie-facing wall.
  const [x, z] = xz(28, 29);
  const coreWall = new Raycaster(
    new Vector3(x, 402 - 323.8, z),
    new Vector3(21.77 / len, 0, 25.36 / len),
  ).intersectObject(result.group)[0];
  expect(coreWall?.distance).toBeCloseTo(1.03, 1);
  expect(roof(18, 59.5)).toBeCloseTo(397.7, 1);
  expect(ray(...xz(1.15, 44), 326)).toBeUndefined();
  expect(ray(...xz(1.15, 44), 326, 1)! + 323.8).toBeCloseTo(331.72, 1);
});
