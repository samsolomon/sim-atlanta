import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createTheCenter } from './the-center';

it('keeps the arena terraces below the offices and raised atrium', () => {
  const sites: VBuilding[] = [
    {
      id: '20a8be94-7717-42fd-a6e7-75c22214f4aa',
      rings: [
        [
          [-296.37, -486.96],
          [-298.89, -489.88],
          [-302.77, -492.85],
          [-305.68, -495.06],
          [-367.84, -436.17],
          [-369.96, -338.56],
          [-340.08, -337.35],
          [-340.05, -355.79],
          [-338.03, -355.66],
          [-334.68, -355.44],
          [-334.6, -352.83],
          [-328.17, -346.48],
          [-287.51, -384.36],
          [-287.02, -396.09],
          [-275.3, -396.01],
          [-268.8, -389.84],
          [-228.78, -428.02],
          [-239.73, -440.88],
          [-221.89, -460.48],
          [-227.95, -467.18],
          [-220.84, -473.22],
          [-240.32, -493.56],
          [-246.67, -487.49],
          [-233.6, -473.45],
          [-246.75, -459.78],
          [-254.89, -460.25],
          [-272.15, -461.25],
          [-272.77, -461.42],
          [-279.2, -466.42],
          [-282.72, -470.53],
          [-285.14, -473.34],
          [-287.38, -474.36],
          [-290.73, -479.76],
          [-292.18, -481.34],
          [-294.32, -484.42],
        ],
      ],
      h: 67.4,
      floors: 15,
    },
  ];
  const next = { ...sites[0], id: 'unrelated' };
  const grid = new GroundGrid(
    {
      version: 1,
      rows: 2,
      cols: 2,
      stepM: 600,
      bounds: { minX: -600, maxX: 0, minZ: -800, maxZ: -200 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3190).buffer,
  );
  const result = createTheCenter([...sites, next], grid)!;
  expect(result.buildings).toEqual([next]);
  expect(createTheCenter([next], grid)).toBeNull();
  result.group.updateMatrixWorld(true);
  const ray = (x: number, z: number, y = 500, dy = -1) =>
    new Raycaster(new Vector3(x, y - 323.8, z), new Vector3(0, dy, 0)).intersectObject(result.group)[0]?.point.y;
  expect(ray(-324.66, -408.26)! + 323.8).toBeCloseTo(382.62, 1);
  expect(ray(-244.39, -422.6)! + 323.8).toBeCloseTo(375.4, 1);
  expect(ray(-356.51, -377.9)! + 323.8).toBeCloseTo(350.0, 1);
});
