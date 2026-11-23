import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createAtlantaCityHall } from './atlanta-city-hall';

it('separates the Mitchell tower, rear court and Trinity roof levels', () => {
  const sites: VBuilding[] = [
    {
      id: '721de634-8a32-4beb-a8d8-089afe296f1b',
      h: 66.6,
      floors: 17,
      rings: [
        [
          [45.37, 570.41],
          [32.83, 589.43],
          [58.94, 606.81],
          [60.9, 603.81],
          [67.65, 608.27],
          [66.81, 610.17],
          [66.2, 613.21],
          [66.16, 615.97],
          [67.02, 618.7],
          [68.7, 621.7],
          [71.89, 624.84],
          [73.74, 625.93],
          [76.33, 626.6],
          [79.76, 627.04],
          [82.62, 626.66],
          [85.03, 625.64],
          [88.63, 622.19],
          [95.17, 626.6],
          [93.03, 630.01],
          [119.13, 647.2],
          [131.5, 628.25],
          [128.54, 626.33],
          [132.69, 619.98],
          [135.69, 621.94],
          [154.84, 592.61],
          [140.27, 582.65],
          [131.13, 596.38],
          [108.6, 581.33],
          [113.86, 573.44],
          [127.52, 582.55],
          [147.42, 552.7],
          [108.34, 526.86],
          [88.09, 557.25],
          [100.76, 565.7],
          [95.96, 572.9],
          [74.87, 558.89],
          [84.06, 544.87],
          [68.81, 534.94],
          [49.25, 564.63],
          [52.3, 566.64],
          [48.46, 572.45],
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
  const result = createAtlantaCityHall([...sites, next], grid)!;
  expect(result.buildings).toEqual([next]);
  expect(createAtlantaCityHall([next], grid)).toBeNull();
  result.group.updateMatrixWorld(true);
  const ray = (x: number, z: number, y = 500, dy = -1) =>
    new Raycaster(new Vector3(x, y - 323.8, z), new Vector3(0, dy, 0)).intersectObject(result.group)[0]?.point.y;
  const l = Math.hypot(39.08, 25.84);
  const roof = (u: number, v: number) =>
    ray(108.34 + (39.08 * u - 25.84 * v) / l, 526.86 + (25.84 * u + 39.08 * v) / l)! + 323.8;
  expect(roof(3, 24)).toBeCloseTo(327.2, 1);
  expect(roof(23, 30)).toBeCloseTo(318.95, 1);
  expect(roof(24.05, 8.42)).toBeCloseTo(376.15, 1);
  expect(roof(23, 60.5)).toBeCloseTo(337.35, 1);
  expect(roof(25, 96)).toBeCloseTo(323.35, 1);
});
