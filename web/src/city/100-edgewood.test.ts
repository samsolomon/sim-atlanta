import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createHundredEdgewood } from './100-edgewood';

it('keeps the parking deck separate and sets the colonnade, sunken fan well and rooftop housings on their measured levels', () => {
  const sites: VBuilding[] = [
    {
      id: 'fe2cbd9a-59d0-485d-8436-540b7df16af3',
      h: 26.8,
      floors: null,
      rings: [
        [
          [628.34, -174.31],
          [613.39, -174.68],
          [611.96, -123.09],
          [663.55, -122.74],
          [664.3, -176.04],
          [628.58, -176.54],
        ],
      ],
    },
    {
      id: '29cfc82a-c62b-4e31-9211-e3e8e640a312',
      h: 17.2,
      floors: 7,
      rings: [
        [
          [584.4, -123.44],
          [611.96, -123.09],
          [613.39, -174.68],
          [515.76, -176.37],
          [514.57, -124.92],
          [529.84, -125.07],
          [534.15, -126.7],
          [538.51, -128.25],
          [542.83, -129.12],
          [547.93, -129.96],
          [552.08, -129.96],
          [551.93, -126.85],
          [561.42, -126.7],
          [561.57, -129.96],
          [566.32, -129.96],
          [572.84, -128.63],
          [576.84, -127.3],
          [581.14, -125.66],
        ],
      ],
    },
    {
      id: 'f56ffe3c-cf56-4bc0-9ed3-eefadc1d7e89',
      h: 66.6,
      floors: 17,
      rings: [
        [
          [586.44, -111.21],
          [528.03, -111.95],
          [527.42, -77.85],
          [585.82, -76.49],
        ],
      ],
    },
    {
      id: '9d53ec61-85c2-421a-a106-d778d0477ce4',
      h: 3.3958332538604736,
      floors: null,
      rings: [
        [
          [515.54, -112.32],
          [515.43, -100.42],
          [518.66, -100.39],
          [518.76, -112.3],
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
    new Int16Array(4).fill(3090).buffer,
  );

  const tower = sites.find((b) => b.id.startsWith('f56ffe'))!,
    neighbors = sites.filter((b) => b !== tower);
  expect(createHundredEdgewood(neighbors, grid)).toBeNull();
  expect(createHundredEdgewood([{ ...tower, rings: neighbors[0].rings }], grid)).toBeNull();
  const result = createHundredEdgewood(sites, grid)!;
  expect(result.buildings).toEqual(neighbors);
  result.group.updateMatrixWorld(true);
  const h = (u: number, v: number, y = 420, dy = -1) => {
    const len = Math.hypot(58.41, 0.74);
    const origin = new Vector3(
      528.03 + (58.41 * u - 0.74 * v) / len,
      y - 323.8,
      -111.95 + (0.74 * u + 58.41 * v) / len,
    );
    return new Raycaster(origin, new Vector3(0, dy, 0)).intersectObject(result.group)[0]?.point.y + 323.8;
  };
  expect(h(54, 26)).toBeCloseTo(376.3, 1);
  expect(h(0.15, 25)).toBeCloseTo(377.55, 1);
  expect(h(10.8, 12.2)).toBeCloseTo(374.8, 1);
  expect(h(9.91, 16)).toBeCloseTo(381.7, 1);
  expect(h(14.08, 16.25)).toBeCloseTo(381.53, 1);
  expect(h(36, 16)).toBeCloseTo(381.8, 1);
  expect(h(33, 22.48)).toBeGreaterThan(382.5);
  // The entrance stair descends toward Edgewood. A ray inside the colonnade
  // sees the terrace and underside of the office slab through the same open bay.
  expect(h(27.5, 31.5, 314)).toBeCloseTo(310.1, 1);
  expect(h(27.5, 31.5, 314, 1)).toBeCloseTo(317.3, 1);
  expect(h(27.5, 37.1)).toBeLessThan(309.5);
});
