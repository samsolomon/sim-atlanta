import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createRitzCarlton } from './ritz-carlton-atlanta';

it('keeps the 191 Peachtree footprint and looks under the Ritz carriage entrance and over its folded facade', () => {
  const sites: VBuilding[] = [
    {
      id: '74911c46-8821-4b61-95d0-c571563d795d',
      rings: [
        [
          [394.5, -542.1],
          [380.72, -542.21],
          [380.52, -519.67],
          [389.39, -519.59],
          [389.35, -513.71],
          [421.85, -513.43],
          [424.52, -513.4],
          [435.25, -513.31],
          [435.43, -532.92],
          [421.98, -533.04],
          [422.02, -536.71],
          [427.01, -536.66],
          [427.08, -543.97],
          [421.76, -544.01],
          [394.52, -544.24],
        ],
      ],
      h: 94.0,
      floors: 24,
    },
  ];
  const next: VBuilding = {
    id: 'cca22dcb-b333-4b2a-9371-869465370bda',
    rings: [
      [
        [383.42, -580.85],
        [385.97, -580.82],
        [385.66, -554.9],
        [382.52, -554.94],
        [382.39, -544.43],
        [394.52, -544.24],
        [421.76, -544.01],
        [421.83, -549.69],
        [441.81, -549.45],
        [455.76, -549.28],
        [486.8, -548.9],
        [491.49, -548.84],
        [491.93, -585.06],
        [487.17, -585.13],
        [456.25, -585.5],
        [423.1, -585.91],
        [423.19, -593.04],
        [383.57, -593.51],
      ],
    ],
    h: 234.7,
    floors: 50,
  };
  const grid = new GroundGrid(
    {
      version: 1,
      rows: 2,
      cols: 2,
      stepM: 600,
      bounds: { minX: 0, maxX: 600, minZ: -600, maxZ: 0 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3250).buffer,
  );
  const result = createRitzCarlton([...sites, next], grid)!;
  expect(result.buildings).toEqual([next]);
  expect(createRitzCarlton([next], grid)).toBeNull();
  result.group.updateMatrixWorld(true);
  const ray = (x: number, z: number, y = 500, dy = -1) =>
    new Raycaster(new Vector3(x, y - 323.8, z), new Vector3(0, dy, 0)).intersectObject(result.group)[0]?.point.y;

  const d = Math.hypot(1, 0.009);
  const world = (u: number, v: number) => [380 + (u - 0.009 * v) / d, -544 + (0.009 * u + v) / d] as const;
  const height = (u: number, v: number) => ray(...world(u, v))! + 323.8;
  expect(height(5, 5)).toBeCloseTo(397.05, 1);
  expect(height(18, 15)).toBeCloseTo(402.9, 1);
  expect(height(40.8, 21.1)).toBeCloseTo(402.57, 1);
  expect(height(30, 5)).toBeCloseTo(357.65, 1);
  expect(height(4, 27)).toBeCloseTo(337.1, 1);
  expect(ray(...world(49, 26), 330)! + 323.8).toBeCloseTo(325.14, 1);
  expect(ray(...world(49, 26), 330, 1)! + 323.8).toBeCloseTo(334.9, 1);
  // Projecting bay centers reach beyond the joints along Ellis.
  const bayWidth = (55.05 - 9.45) / 11;
  expect(height(55.05 - bayWidth / 2, 29.95)).toBeCloseTo(397.05, 1);
  expect(height(55.05 - bayWidth, 29.95)).toBeCloseTo(325.14, 1);
});
