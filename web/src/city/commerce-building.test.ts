import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createCommerceBuilding } from './commerce-building';

it('places the stepped roof and drum and preserves the neighboring lots and the Broad Street parking opening', () => {
  const sites: VBuilding[] = [
    {
      id: '06942e29-e032-4d6b-a30f-7e1f4bc9f2a4',
      h: null,
      floors: 14,
      rings: [
        [
          [183.01, -140.6],
          [167.1, -159.15],
          [119.6, -118.43],
          [135.52, -99.86],
          [157.34, -118.58],
        ],
      ],
    },
    {
      id: 'a9313126-a6d9-4c97-b401-93833c887542',
      h: 47.5,
      floors: 10,
      rings: [
        [
          [117.93, -217.68],
          [97.31, -199.31],
          [108.35, -186.87],
          [113.12, -191.08],
          [117.25, -189.42],
          [126.51, -177.96],
          [128.63, -179.75],
          [130.77, -176.96],
          [122.43, -170.25],
          [133.28, -157.33],
          [154.26, -175.03],
        ],
      ],
    },
    {
      id: '6fbc1106-9bdc-4074-81a6-4ed996cdaa41',
      h: 55.0,
      floors: 12,
      rings: [
        [
          [108.35, -186.87],
          [97.31, -199.31],
          [69.33, -175.04],
          [86.72, -154.76],
          [115.33, -179.1],
        ],
      ],
    },
    {
      id: 'c4d0fd71-eba0-46b2-b551-1e840e220b6e',
      h: 66.6,
      floors: 17,
      rings: [
        [
          [106.49, -133.93],
          [131.13, -154.58],
          [114.36, -173.39],
          [93.47, -153.54],
        ],
      ],
    },
  ];
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
    new Int16Array(4).fill(3200).buffer,
  );

  const tower = sites.find((b) => b.id.startsWith('c4d0'))!;
  const neighbors = sites.filter((b) => b !== tower);
  expect(createCommerceBuilding(neighbors, grid)).toBeNull();
  expect(createCommerceBuilding([{ ...tower, rings: neighbors[0].rings }], grid)).toBeNull();
  const result = createCommerceBuilding(sites, grid)!;
  expect(result.buildings).toEqual(neighbors);
  result.group.updateMatrixWorld(true);
  const len = Math.hypot(20.89, 19.85);
  function hit(u: number, v: number, elev: number, dy: number) {
    return (
      new Raycaster(
        new Vector3(93.47 + (20.89 * u + 19.85 * v) / len, elev - 323.8, -153.54 + (-19.85 * u + 20.89 * v) / len),
        new Vector3(0, dy, 0),
      ).intersectObject(result.group)[0]?.point.y + 323.8
    );
  }
  expect(hit(12.8, 15, 425, -1)).toBeCloseTo(389.62, 1);
  expect(hit(7, 11, 425, -1)).toBeCloseTo(387.4, 1);
  expect(hit(9, 5, 425, -1)).toBeCloseTo(383.2, 1);
  expect(hit(26, 8, 425, -1)).toBeCloseTo(381.85, 1);
  expect(hit(26, 21, 425, -1)).toBeCloseTo(379.35, 1);
  // From inside the garage mouth a ray finds pavement below and the garage soffit above.
  expect(hit(24.6, 22.8, 323.8, -1)).toBeGreaterThan(320.95);
  expect(hit(24.6, 22.8, 323.8, 1)).toBeCloseTo(324.69, 1);
});
