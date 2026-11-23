import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createFivePointsPlaza } from './five-points-plaza';

it('keeps the perimeter, raised roof and rear spine at their surveyed heights', () => {
  const sites: VBuilding[] = [
    {
      id: 'f215708b-6d11-484f-9146-451689895ec4',
      h: 72.8,
      floors: 17,
      rings: [
        [
          [60.65, -135.49],
          [44.85, -154.04],
          [18.29, -131.77],
          [34.08, -113.21],
          [38.24, -116.38],
          [39.37, -114.85],
          [38.7, -113.93],
          [38.24, -113.27],
          [38.3, -112.34],
          [38.64, -111.48],
          [39.62, -110.96],
          [40.85, -110.75],
          [52.11, -120.25],
          [52.21, -120.78],
          [52.25, -121.41],
          [52.02, -121.98],
          [51.64, -122.44],
          [51.05, -122.74],
          [50.36, -122.53],
          [49.1, -122.73],
          [47.87, -124.32],
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
      stepM: 200,
      bounds: { minX: -50, maxX: 150, minZ: -210, maxZ: -10 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3190).buffer,
  );
  const result = createFivePointsPlaza([...sites, next], grid)!;
  expect(result.buildings).toEqual([next]);
  expect(createFivePointsPlaza([next], grid)).toBeNull();
  result.group.updateMatrixWorld(true);
  const ray = (x: number, z: number, y = 500, dy = -1) =>
    new Raycaster(new Vector3(x, y - 323.8, z), new Vector3(0, dy, 0)).intersectObject(result.group)[0]?.point.y;
  expect(ray(27.53, -123.86)! + 323.8).toBeCloseTo(387.82, 1);
  expect(ray(39.03, -133.5)! + 323.8).toBeCloseTo(392.3, 1);
  expect(ray(43.05, -114.69)! + 323.8).toBeCloseTo(392.95, 1);
});
