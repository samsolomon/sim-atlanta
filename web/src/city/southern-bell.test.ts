import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createSouthernBell } from './southern-bell';

it('separates the Southern Bell roof, shoulders, mast and low east return above local grade', () => {
  const sites: VBuilding[] = [
    {
      id: 'c39654db-4734-4f65-a65e-8c46ff9e1fb0',
      rings: [
        [
          [616.22, -228.04],
          [585.18, -228.66],
          [585.38, -245.73],
          [518.37, -246.52],
          [517.43, -196.05],
          [585.22, -196.14],
          [585.21, -211.36],
          [617.98, -211.0],
          [617.93, -209.81],
          [632.37, -209.93],
          [632.52, -217.21],
          [616.15, -217.39],
        ],
      ],
      h: 78.0,
      floors: 14,
    },
  ];
  const next: VBuilding = {
    id: '253747de-16b5-4d05-a37c-8df7dc701d12',
    rings: [
      [
        [554.69, -250.96],
        [568.95, -250.41],
        [569.08, -253.26],
        [554.81, -253.83],
      ],
    ],
    h: 6.3,
    floors: null,
  };
  const grid = new GroundGrid(
    {
      version: 1,
      rows: 2,
      cols: 2,
      stepM: 600,
      bounds: { minX: 100, maxX: 700, minZ: -600, maxZ: 0 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3150).buffer,
  );
  const result = createSouthernBell([...sites, next], grid)!;
  expect(result.buildings).toEqual([next]);
  expect(createSouthernBell([next], grid)).toBeNull();
  result.group.updateMatrixWorld(true);
  const ray = (x: number, z: number, y = 500, dy = -1) =>
    new Raycaster(new Vector3(x, y - 323.8, z), new Vector3(0, dy, 0)).intersectObject(result.group)[0]?.point.y;

  const d = Math.hypot(1, 0.009);
  const world = (u: number, v: number) => [517.95 + (u - 0.009 * v) / d, -246.4 + (0.009 * u + v) / d] as const;
  const height = (u: number, v: number) => ray(...world(u, v))! + 323.8;
  expect(height(8, 8)).toBeCloseTo(381.7, 1);
  expect(height(33, 25)).toBeCloseTo(389.1, 1);
  expect(height(30, 49.5)).toBeCloseTo(350.4, 1);
  expect(height(30, 47.8)).toBeCloseTo(364.3, 1);
  expect(height(30, 45.7)).toBeCloseTo(373.35, 1);
  expect(height(80, 25)).toBeCloseTo(318.85, 1);
  expect(height(108, 32)).toBeCloseTo(317.5, 1);
  expect(height(12.8, 39.6)).toBeCloseTo(440.785, 1);
  expect(height(12.8 + 1.19 * 1.8, 39.6 + 1.19 * 1.8)).toBeCloseTo(442.825, 1);
  expect(ray(...world(1.2, 24.8), 318)).toBeUndefined();
  expect(ray(...world(1.2, 24.8), 318, 1)! + 323.8).toBeCloseTo(326.8, 1);
  expect(ray(...world(1.2, 27.3), 318, 1)! + 323.8).toBeCloseTo(323.45, 1);
});
