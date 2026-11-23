import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createWilliamOliver } from './william-oliver';

it('resolves the rooftop pavilion and the recesses beside 34 Peachtree', () => {
  const sites: VBuilding[] = [
    {
      id: '9bfb58f3-4fec-416b-a4e9-3b869d799cc2',
      h: 62.7,
      floors: 16,
      rings: [
        [
          [156.21, -77.05],
          [177.26, -95.54],
          [157.34, -118.58],
          [135.52, -99.86],
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
  const result = createWilliamOliver([...sites, next], grid)!;
  expect(result.buildings).toEqual([next]);
  expect(createWilliamOliver([next], grid)).toBeNull();
  result.group.updateMatrixWorld(true);
  const ray = (x: number, z: number, y = 500, dy = -1) =>
    new Raycaster(new Vector3(x, y - 323.8, z), new Vector3(0, dy, 0)).intersectObject(result.group)[0]?.point.y;
  const length = Math.hypot(20.69, 22.81);
  const roof = (u: number, v: number) =>
    ray(156.21 + (-20.69 * u + 22.81 * v) / length, -77.05 + (-22.81 * u - 20.69 * v) / length)! + 323.8;
  expect(roof(4, 4)).toBeCloseTo(379.15, 1);
  expect(roof(8, 18)).toBeCloseTo(387.4, 1);
  expect(roof(16, 20)).toBeCloseTo(326.7, 1);
  expect(roof(21, 20)).toBeCloseTo(382.2, 1);
});
