import { Raycaster, Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createHiltonAtlanta } from './hilton-atlanta';

const hotel: VBuilding = {
  id: '20ecbeda-7f1c-4009-b976-c005905f6e7a',
  h: 116.7,
  floors: 30,
  rings: [
    [
      [736.35, -811.41],
      [750.22, -833.26],
      [754.84, -830.07],
      [759.07, -832.42],
      [759.38, -838.17],
      [802.42, -838.16],
      [802.81, -859.0],
      [761.15, -858.88],
      [761.06, -866.2],
      [755.51, -868.98],
      [749.83, -866.41],
      [734.06, -894.59],
      [715.33, -884.86],
      [732.04, -856.09],
      [732.18, -849.66],
      [732.21, -848.63],
      [732.27, -847.0],
      [731.32, -842.81],
      [713.26, -810.9],
      [729.93, -800.58],
    ],
  ],
};
const podium: VBuilding = {
  id: 'c97061e3-9654-4b96-88de-06d74037fa35',
  h: 64.0,
  floors: 2,
  rings: [
    [
      [750.22, -833.26],
      [736.35, -811.41],
      [753.1, -800.72],
      [752.31, -792.79],
      [855.47, -790.41],
      [860.04, -794.48],
      [860.9, -814.7],
      [828.69, -814.88],
      [829.03, -879.53],
      [861.26, -879.36],
      [861.39, -887.76],
      [861.53, -895.92],
      [846.73, -911.8],
      [804.0, -914.13],
      [802.81, -859.0],
      [802.42, -838.16],
      [759.38, -838.17],
      [759.07, -832.42],
      [754.84, -830.07],
    ],
  ],
};
const north: VBuilding = {
  id: 'f7303311-3c8f-4a65-8414-b96c4b6753f4',
  h: 18.7,
  floors: null,
  rings: [
    [
      [802.81, -859.0],
      [804.0, -914.13],
      [753.01, -914.6],
      [752.88, -908.51],
      [741.62, -908.66],
      [741.48, -898.59],
      [734.06, -894.59],
      [749.83, -866.41],
      [755.51, -868.98],
      [761.06, -866.2],
      [761.15, -858.88],
    ],
  ],
};

const grid = new GroundGrid(
  {
    version: 1,
    rows: 2,
    cols: 2,
    stepM: 200,
    bounds: { minX: 690, maxX: 890, minZ: -950, maxZ: -750 },
    encoding: 'signed int16 little-endian',
    scaleM: 1,
    offsetM: 0,
    noData: -32768,
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 314 },
    sha256: '',
  },
  new Int16Array(4).fill(301).buffer,
);
afterEach(() => vi.unstubAllGlobals());

it('separates the hotel wings, crown, recreation deck and low east podium', () => {
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({ fillText() {} }) }) });
  const neighbor = { ...hotel, id: 'neighbor' };
  const result = createHiltonAtlanta([hotel, podium, north, neighbor], grid)!;
  expect(result.buildings).toEqual([neighbor]);
  result.group.updateMatrixWorld(true);
  const roof = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 180, z), new Vector3(0, -1, 0)).intersectObject(result.group)[0].point.y +
    grid.manifest.vertical.sceneZeroNavd88M;
  expect(roof(784, -849)).toBeCloseTo(395.6);
  expect(roof(750, -849)).toBeCloseTo(411.8);
  expect(roof(767, -891)).toBeCloseTo(321.1);
  expect(roof(825, -901)).toBeCloseTo(306.8);
  expect(roof(788, -808)).toBeCloseTo(322.1);
  // A podium vertex splits the southwest wing. Its short segment still carries recessed room bays.
  const normal = new Vector3(10.83, 0, 6.42).normalize();
  const pane = new Vector3(729.93 + 6.42 * 0.25, 351.0 - 314, -800.58 - 10.83 * 0.25);
  const ray = new Raycaster(pane.addScaledVector(normal, 2), normal.negate());
  expect(ray.intersectObject(result.group)[0].distance).toBeCloseTo(2 - 0.045, 3);
});

it('preserves a mismatched tower independently of the surveyed podium pieces', () => {
  const changed = { ...hotel, rings: north.rings };
  expect(createHiltonAtlanta([changed, podium], grid)!.buildings).toEqual([changed]);
  expect(createHiltonAtlanta([changed], grid)).toBeNull();
  const missing = Object.create(grid) as GroundGrid;
  missing.sample = () => null;
  expect(createHiltonAtlanta([hotel, north, podium], missing)).toBeNull();
});
