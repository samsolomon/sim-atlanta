import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createRussellBuilding } from './russell-building';
it('separates the roof of the main block from the low projecting pavilion', () => {
  const sites: VBuilding[] = [
    {
      id: 'e10bc2d8-2376-4e1b-969c-4eca7a3f2eb4',
      h: 116.7,
      floors: 26,
      rings: [
        [
          [-356.9, 45.3],
          [-399.36, 17.54],
          [-415.81, 42.72],
          [-418.42, 41.04],
          [-423.33, 48.66],
          [-428.36, 56.46],
          [-425.85, 58.09],
          [-442.22, 83.16],
          [-399.85, 110.99],
          [-372.04, 68.64],
          [-365.06, 73.22],
          [-364.29, 75.89],
          [-362.56, 78.37],
          [-360.45, 80.69],
          [-357.84, 82.6],
          [-358.91, 84.31],
          [-353.36, 87.78],
          [-351.78, 85.29],
          [-349.32, 85.75],
          [-348.76, 82.91],
          [-349.86, 82.7],
          [-348.5, 80.57],
          [-346.23, 77.24],
          [-348.97, 75.43],
          [-347.97, 73.92],
          [-358.29, 67.15],
          [-359.33, 68.73],
          [-360.44, 68.0],
          [-361.17, 69.17],
          [-369.06, 63.9],
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
      bounds: { minX: -500, maxX: -200, minZ: -100, maxZ: 200 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3190).buffer,
  );
  const result = createRussellBuilding([...sites, next], grid)!;
  expect(result.buildings).toEqual([next]);
  expect(createRussellBuilding([next], grid)).toBeNull();
  result.group.updateMatrixWorld(true);
  const ray = (x: number, z: number, y = 500, dy = -1) =>
    new Raycaster(new Vector3(x, y - 323.8, z), new Vector3(0, dy, 0)).intersectObject(result.group)[0]?.point.y;
  expect(ray(-394.08, 49.67)! + 323.8).toBeCloseTo(426.55, 1);
  expect(ray(-393.18, 26.36)! + 323.8).toBeCloseTo(421.82, 1);
  expect(ray(-352.23, 77.03)! + 323.8).toBeCloseTo(339.1, 1);
});
