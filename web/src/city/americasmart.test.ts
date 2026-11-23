import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createAmericasMart } from './americasmart';

it('separates the roof plates and leaves an open street under stacked skywalks', () => {
  const sites: VBuilding[] = [
    {
      id: '3ead9055-6c68-4bcc-8ea0-48aabc7892eb',
      h: 68.4,
      floors: 14,
      rings: [
        [
          [112.57, -803.64],
          [112.51, -799.78],
          [218.55, -798.73],
          [218.58, -802.48],
          [222.83, -802.38],
          [222.89, -805.9],
          [227.08, -805.83],
          [228.05, -912.12],
          [224.22, -912.14],
          [224.3, -916.07],
          [220.1, -916.13],
          [220.18, -920.75],
          [114.83, -921.75],
          [114.71, -918.07],
          [110.49, -918.12],
          [110.42, -914.28],
          [106.6, -914.27],
          [105.52, -807.68],
          [109.05, -807.69],
          [109.0, -803.68],
        ],
      ],
    },
    {
      id: '154b7076-e18b-49b0-8221-5c90e8bb6d6b',
      h: 91.5,
      floors: 20,
      rings: [
        [
          [360.49, -731.82],
          [360.71, -778.97],
          [245.38, -779.27],
          [244.3, -656.07],
          [270.02, -655.86],
          [270.33, -686.43],
          [289.66, -686.31],
          [289.61, -707.92],
          [295.82, -707.95],
          [295.88, -712.48],
          [334.9, -711.95],
          [334.85, -719.6],
          [360.41, -719.18],
        ],
      ],
    },
    {
      id: '5b26e4d5-8d9a-4282-b0f0-901a8899210f',
      h: 84.2,
      floors: 18,
      rings: [
        [
          [188.83, -779.37],
          [105.15, -780.47],
          [104.22, -657.51],
          [224.92, -656.14],
          [226.12, -779.42],
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
      bounds: { minX: 0, maxX: 600, minZ: -1000, maxZ: -400 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3140).buffer,
  );
  const result = createAmericasMart([...sites, next], grid)!;
  expect(result.buildings).toEqual([next]);
  expect(createAmericasMart([next], grid)).toBeNull();
  result.group.updateMatrixWorld(true);
  const ray = (x: number, z: number, y = 500, dy = -1) =>
    new Raycaster(new Vector3(x, y - 323.8, z), new Vector3(0, dy, 0)).intersectObject(result.group)[0]?.point.y;

  expect(ray(130, -725)! + 323.8).toBeCloseTo(360.95, 1);
  expect(ray(205, -725)! + 323.8).toBeCloseTo(389.25, 1);
  expect(ray(303, -757)! + 323.8).toBeCloseTo(413.4, 1);
  expect(ray(202, -827)! + 323.8).toBeCloseTo(379.4, 1);
  expect(ray(235, -730.6)! + 323.8).toBeCloseTo(388.1, 1);
  expect(ray(235, -730.6, 375)! + 323.8).toBeCloseTo(367, 1);
  expect(ray(235, -730.6, 340)).toBeUndefined();
  const span = {
    kind: 'bridge' as const,
    cls: 'pedestrian',
    pts: [
      [123.37, -799.66],
      [123.5, -780.2],
    ] as [number, number][],
  };
  const road = { ...span, cls: 'secondary' };
  const city = {
    bounds: grid.manifest.bounds,
    buildings: sites,
    roads: [],
    rail: [],
    terrainTransport: { version: 1 as const, roads: [span, road], rail: [] },
  };
  expect(result.surfaceData(city).terrainTransport?.roads).toEqual([road]);
});
