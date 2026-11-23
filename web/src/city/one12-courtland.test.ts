import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createOne12Courtland } from './one12-courtland';

it('preserves the Dobbs light well, the pool deck and the staggered tower roof on the two named footprints', () => {
  const sites: VBuilding[] = [
    {
      id: '8759966e-3226-4802-be0f-28ccf249a4ff',
      h: 28.0,
      floors: 7,
      rings: [
        [
          [572.17, -416.9],
          [572.06, -369.77],
          [613.38, -369.93],
          [613.83, -404.23],
          [613.85, -410.15],
          [614.01, -416.8],
        ],
        [
          [583.8, -397.62],
          [602.21, -397.38],
          [602.07, -386.98],
          [583.66, -387.23],
        ],
      ],
    },
    {
      id: '9af30d4c-b3ad-4d36-8dd0-fc7dd3aaaf69',
      h: null,
      floors: null,
      rings: [
        [
          [616.97, -410.14],
          [613.85, -410.15],
          [613.83, -404.23],
          [616.96, -404.22],
        ],
      ],
    },
    {
      id: 'bccde72e-a77b-442f-b249-3337f088152a',
      h: 3.0,
      floors: null,
      rings: [
        [
          [614.76, -429.02],
          [599.19, -429.08],
          [598.07, -429.09],
          [598.04, -422.33],
          [614.74, -422.27],
        ],
      ],
    },
    {
      id: 'fae8f47d-2852-45da-a09e-ae6246586874',
      h: 62.7,
      floors: 16,
      rings: [
        [
          [666.93, -424.49],
          [634.46, -425.21],
          [617.36, -425.59],
          [616.97, -410.14],
          [616.96, -404.22],
          [616.21, -369.68],
          [633.43, -369.65],
          [665.17, -369.2],
          [665.27, -376.18],
          [663.66, -376.21],
          [663.73, -380.75],
          [666.02, -382.94],
        ],
      ],
    },
  ];
  const grid = new GroundGrid(
    {
      version: 1,
      rows: 2,
      cols: 2,
      stepM: 800,
      bounds: { minX: 0, maxX: 800, minZ: -800, maxZ: 0 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3200).buffer,
  );
  const other = sites.find((b) => b.id.startsWith('bccde'))!;
  expect(
    createOne12Courtland(
      sites.filter((b) => !b.id.startsWith('9af30')),
      grid,
    ),
  ).toBeNull();
  const result = createOne12Courtland(sites, grid)!;
  expect(result.buildings).toEqual([other]);
  result.group.updateMatrixWorld(true);
  function roof(x: number, z: number) {
    return (
      new Raycaster(new Vector3(x, 410 - 323.8, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point
        .y + 323.8
    );
  }
  expect(roof(590, -395)).toBeCloseTo(314.72);
  expect(roof(576, -392)).toBeCloseTo(341.25);
  expect(roof(624.5, -385)).toBeCloseTo(333.88);
  expect(roof(639, -397)).toBeCloseTo(333.65);
  expect(roof(638, -408)).toBeCloseTo(363.15);
  expect(roof(658, -397)).toBeCloseTo(363.15);
  expect(roof(615.4, -407)).toBeCloseTo(344.55);
});
