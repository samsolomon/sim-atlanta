import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { detachedParts } from './skin-kit';
import { createMedicalGarage } from './medical-arts-garage';

const site: VBuilding = {
  id: '770fb440-8914-43bb-8223-38494fec539b',
  h: 16.432220458984375,
  floors: 4,
  cls: 'parking',
  name: 'Medical Arts Building Parking Garage',
  rings: [
    [
      [489.21, -1289.21],
      [462.45, -1263.61],
      [458.14, -1259.83],
      [455.73, -1252.76],
      [453.82, -1247.52],
      [497.27, -1232.3],
      [503.12, -1249.17],
      [506.21, -1257.29],
      [508.48, -1263.53],
      [510.03, -1267.79],
      [511.6, -1272.13],
    ],
  ],
  parts: [
    {
      id: 'overture:09e9a822-d8c5-3a0a-a430-2046e588be65',
      rings: [
        [
          [469.49, -1252.61],
          [471.66, -1251.87],
          [471.35, -1250.97],
          [475.81, -1249.43],
          [477.29, -1253.72],
          [470.67, -1256.0],
        ],
      ],
      h: 16.4,
      tier: 'inferred',
    },
    {
      id: 'overture:bdd899a4-005f-3636-89f3-f2647b5ea245',
      rings: [
        [
          [462.45, -1263.61],
          [458.14, -1259.83],
          [455.73, -1252.76],
          [453.82, -1247.52],
          [497.27, -1232.3],
          [503.12, -1249.17],
        ],
        [
          [470.67, -1256.0],
          [477.29, -1253.72],
          [475.81, -1249.43],
          [471.35, -1250.97],
          [471.66, -1251.87],
          [469.49, -1252.61],
        ],
      ],
      h: 16.4,
      tier: 'inferred',
    },
    {
      id: 'overture:d62bcf1f-1bc2-382f-a309-2686033e779b',
      rings: [
        [
          [508.48, -1263.53],
          [510.03, -1267.79],
          [511.6, -1272.13],
          [489.21, -1289.21],
          [462.45, -1263.61],
          [503.12, -1249.17],
          [506.21, -1257.29],
        ],
      ],
      h: 13.1,
      tier: 'inferred',
    },
  ],
};
// Flat ground at 304.0 m NAVD88 (the low side of the site) with the downtown scene zero.
const grid = new GroundGrid(
  {
    version: 1,
    rows: 2,
    cols: 2,
    stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -2000, maxZ: -1000 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1,
    offsetM: 0,
    noData: -32768,
    sha256: '',
  },
  new Int16Array(4).fill(3040).buffer,
);

it('replaces only the garage and seats both phases and the elevator head inside its footprint', () => {
  const tower = { ...site, id: 'tower' };
  const garage = createMedicalGarage([tower, site], grid)!;
  expect(garage.buildings).toEqual([tower]);
  expect(detachedParts(garage.group, site.rings)).toEqual([]);
  garage.group.updateMatrixWorld(true);
  const roof = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 100, z), new Vector3(0, -1, 0)).intersectObject(garage.group, true)[0]?.point
      .y;
  expect(roof(488, -1272)).toBeCloseTo(14.1, 1);
  expect(roof(485, -1245)).toBeCloseTo(17.5, 1);
  expect(roof(473, -1253)).toBeCloseTo(22.6, 1);
  expect(roof(505, -1240)).toBeUndefined();
});
