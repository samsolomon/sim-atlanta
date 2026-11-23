import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createFultonCourthouse } from './fulton-courthouse';

it('separates the Slaton court, high bridge and modern courthouse roof', () => {
  const sites: VBuilding[] = [
    {
      id: '0a4a8480-d8f4-40bf-9346-853c053cd064',
      h: 52.8,
      floors: 11,
      rings: [
        [
          [108.87, 327.48],
          [104.11, 334.75],
          [93.6, 327.87],
          [97.23, 322.31],
          [62.91, 299.84],
          [25.68, 356.69],
          [65.49, 382.77],
          [68.67, 377.91],
          [64.22, 374.99],
          [71.52, 363.84],
          [65.02, 359.57],
          [68.81, 353.79],
          [72.49, 356.2],
          [81.19, 342.93],
          [95.14, 352.05],
          [74.39, 383.75],
          [71.91, 382.13],
          [66.56, 390.29],
          [74.87, 395.74],
          [48.43, 436.03],
          [81.14, 457.45],
          [121.39, 395.98],
          [113.74, 390.97],
          [142.8, 346.61],
          [136.51, 342.48],
          [135.09, 344.65],
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
      bounds: { minX: -100, maxX: 500, minZ: 150, maxZ: 750 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3120).buffer,
  );
  const result = createFultonCourthouse([...sites, next], grid)!;
  expect(result.buildings).toEqual([next]);
  expect(createFultonCourthouse([next], grid)).toBeNull();
  result.group.updateMatrixWorld(true);
  const ray = (x: number, z: number, y = 500, dy = -1) =>
    new Raycaster(new Vector3(x, y - 323.8, z), new Vector3(0, dy, 0)).intersectObject(result.group)[0]?.point.y;
  const l = Math.hypot(34.32, 22.47);
  const roof = (u: number, v: number) =>
    ray(62.91 + (34.32 * u - 22.47 * v) / l, 299.84 + (22.47 * u + 34.32 * v) / l)! + 323.8;
  expect(roof(5, 34)).toBeCloseTo(354.55, 1);
  expect(roof(14, 35)).toBeCloseTo(356.8, 1);
  expect(roof(77, 96)).toBeCloseTo(352.05, 1);
  expect(roof(44, 24)).toBeCloseTo(347.3, 1);
  const bridgeX = 62.91 + (34.32 * 44 - 22.47 * 24) / l;
  const bridgeZ = 299.84 + (22.47 * 44 + 34.32 * 24) / l;
  expect(ray(bridgeX, bridgeZ, 340)).toBeUndefined();
  expect(ray(bridgeX, bridgeZ, 340, 1)! + 323.8).toBeCloseTo(343.3, 1);
});
