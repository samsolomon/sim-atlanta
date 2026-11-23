import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createSamNunn } from './sam-nunn';
it('keeps the 24-story tower, suspended Forsyth bridge and former department store at separate levels', () => {
  const sites: VBuilding[] = [
    {
      id: '7300fd12-c904-4654-8263-cf47f751fd64',
      h: 118.3,
      rings: [
        [
          [-198.84, -43.13],
          [-254.06, 40.62],
          [-221.97, 61.77],
          [-206.34, 38.07],
          [-166.75, -21.97],
          [-176.97, -28.71],
        ],
      ],
    },
    {
      id: '5a5f7fc1-6865-42bf-89e6-dde9ceb2d789',
      h: 22.358081817626953,
      rings: [
        [
          [-208.11, -49.33],
          [-265.57, 39.9],
          [-171.89, 102.54],
          [-169.04, 97.86],
          [-164.44, 89.9],
          [-161.22, 91.88],
          [-153.65, 96.52],
          [-146.79, 100.7],
          [-141.39, 104.03],
          [-146.34, 111.47],
          [-136.67, 117.68],
          [-142.87, 128.59],
          [-113.11, 146.69],
          [-89.45, 110.36],
          [-60.3, 65.59],
          [-46.66, 46.5],
          [-47.9, 41.54],
          [-66.25, 30.13],
          [-76.34, 24.0],
          [-90.42, 15.0],
          [-117.68, 57.65],
          [-124.77, 68.57],
          [-120.56, 72.29],
          [-129.14, 85.06],
          [-132.21, 89.65],
          [-137.72, 85.91],
          [-144.11, 81.85],
          [-150.72, 77.53],
          [-153.78, 75.51],
          [-153.78, 72.54],
          [-206.34, 38.07],
          [-166.75, -21.97],
          [-176.97, -28.71],
          [-198.84, -43.13],
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
      stepM: 300,
      bounds: { minX: -300, maxX: 0, minZ: -80, maxZ: 220 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3190).buffer,
  );
  const result = createSamNunn([...sites, next], grid)!;
  expect(result.buildings).toEqual([next]);
  expect(createSamNunn([next], grid)).toBeNull();
  result.group.updateMatrixWorld(true);
  const ray = (x: number, z: number, y = 500, dy = -1) =>
    new Raycaster(new Vector3(x, y - 323.8, z), new Vector3(0, dy, 0)).intersectObject(result.group)[0]?.point.y;
  expect(ray(-198.09, -4.3)! + 323.8).toBeCloseTo(423.2, 1);
  expect(ray(-147.97, 88.63)! + 323.8).toBeCloseTo(356.15, 1);
  expect(ray(-77.6, 72.74)! + 323.8).toBeCloseTo(351.25, 1);
  expect(ray(-106.34, 94.52)! + 323.8).toBeCloseTo(371.95, 1);
  expect(ray(-147.97, 88.63, 324, 1)! + 323.8).toBeCloseTo(331.3, 1);
  expect(createSamNunn([sites[0], next], grid)).toBeNull();
});
