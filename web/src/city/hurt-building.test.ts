import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createHurtBuilding } from './hurt-building';

it('opens the upper court and keeps the rotunda below the street wings', () => {
  const sites: VBuilding[] = [
    {
      id: 'a7e88f9b-fa39-42c0-9804-9117c9cf8a7c',
      h: 82.0,
      floors: 18,
      rings: [
        [
          [359.51, -43.02],
          [422.7, -5.99],
          [455.42, -51.07],
          [451.64, -57.94],
          [363.33, -58.14],
          [362.48, -54.79],
          [359.54, -56.45],
          [357.18, -56.51],
          [355.05, -55.51],
          [353.28, -52.91],
          [353.33, -49.77],
          [354.57, -47.75],
          [355.84, -46.79],
          [357.77, -46.11],
          [360.26, -46.27],
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
      bounds: { minX: 0, maxX: 600, minZ: -300, maxZ: 300 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3120).buffer,
  );
  const result = createHurtBuilding([...sites, next], grid)!;
  expect(result.buildings).toEqual([next]);
  expect(createHurtBuilding([next], grid)).toBeNull();
  result.group.updateMatrixWorld(true);
  const ray = (x: number, z: number, y = 500, dy = -1) =>
    new Raycaster(new Vector3(x, y - 323.8, z), new Vector3(0, dy, 0)).intersectObject(result.group)[0]?.point.y;
  expect(ray(358.26, -51.35)! + 323.8).toBeCloseTo(328.6, 1);
  expect(ray(430, -51)! + 323.8).toBeCloseTo(379.65, 1);
  expect(ray(423, -15)! + 323.8).toBeCloseTo(379.65, 1);
  expect(ray(417, -35)! + 323.8).toBeCloseTo(317.5, 1);
  expect(ray(435, -36)! + 323.8).toBeCloseTo(329.2, 1);
  expect(ray(395, -41)! + 323.8).toBeCloseTo(386.85, 1);
});
