import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createFiftyFiveParkPlace } from './55-park-place';

it('restores the west atrium steps, office roof and separate east core at 55 Park Place', () => {
  const sites: VBuilding[] = [
    {
      id: '731be9d3-8574-4c40-91dd-7940bc38067e',
      rings: [
        [
          [437.37, -249.17],
          [436.36, -249.19],
          [431.9, -249.3],
          [432.05, -255.57],
          [377.29, -256.91],
          [376.82, -237.64],
          [384.84, -237.43],
          [384.41, -219.83],
          [376.42, -220.03],
          [375.98, -201.59],
          [430.94, -200.24],
          [431.08, -205.96],
          [436.32, -205.82],
        ],
      ],
      h: 86.868,
      floors: 19,
    },
  ];
  const next: VBuilding = {
    id: '07fa5c03-884f-4bb1-baff-b0d858f13699',
    rings: [
      [
        [345.74, -108.39],
        [345.71, -105.84],
        [315.43, -105.75],
        [315.53, -78.9],
        [322.68, -78.89],
        [364.8, -79.06],
        [364.72, -105.31],
        [362.32, -105.31],
        [362.28, -118.85],
        [366.36, -118.87],
        [366.35, -120.86],
        [366.34, -124.34],
        [366.19, -175.67],
        [341.49, -175.59],
        [341.65, -119.21],
        [345.67, -119.22],
        [345.68, -116.07],
      ],
    ],
    h: 115.0,
    floors: 28,
  };
  const grid = new GroundGrid(
    {
      version: 1,
      rows: 2,
      cols: 2,
      stepM: 600,
      bounds: { minX: 0, maxX: 600, minZ: -500, maxZ: 100 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3180).buffer,
  );
  const result = createFiftyFiveParkPlace([...sites, next], grid)!;
  expect(result.buildings).toEqual([next]);
  expect(createFiftyFiveParkPlace([next], grid)).toBeNull();
  result.group.updateMatrixWorld(true);
  const ray = (x: number, z: number, y = 500, dy = -1) =>
    new Raycaster(new Vector3(x, y - 323.8, z), new Vector3(0, dy, 0)).intersectObject(result.group)[0]?.point.y;
  const len = Math.hypot(54.76, 1.34);
  const xz = (u: number, v: number) =>
    [377.29 + (54.76 * u - 1.34 * v) / len, -256.91 + (1.34 * u + 54.76 * v) / len] as const;
  const roof = (u: number, v: number) => ray(...xz(u, v))! + 323.8;
  expect(roof(3, 10)).toBeCloseTo(399.61, 1);
  expect(roof(2.2, 28)).toBeCloseTo(383.48, 1);
  expect(roof(3.8, 28)).toBeCloseTo(387.46, 1);
  expect(roof(7.1, 28)).toBeCloseTo(395.42, 1);
  expect(roof(24.3, 28.6)).toBeCloseTo(399.76, 1);
  expect(ray(...xz(24.3, 28.6), 385)! + 323.8).toBeCloseTo(359.52, 1);
  expect(roof(55, 23)).toBeCloseTo(405.87, 1);
});
