import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { createWilliams250 } from './250-williams';
const site: VBuilding = {
  id: 'b13d3a92-ab62-4c26-812f-543d3597f3dc',
  h: 57.9,
  floors: 8,
  rings: [
    [
      [-10.84, -922.73],
      [-29.95, -922.7],
      [-30.21, -900.68],
      [-30.93, -821.89],
      [-31.22, -799.6],
      [-11.69, -799.54],
      [66.44, -798.94],
      [85.9, -798.71],
      [86.13, -820.4],
      [86.17, -838.47],
      [86.62, -880.65],
      [86.89, -899.19],
      [87.15, -922.05],
      [68.15, -922.1],
    ],
  ],
};
const grid = new GroundGrid(
  {
    version: 1,
    rows: 2,
    cols: 2,
    stepM: 1000,
    bounds: { minX: -500, maxX: 500, minZ: -1500, maxZ: -500 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
    scaleM: 0.1,
    offsetM: 0,
    noData: -32768,
    sha256: '',
  },
  new Int16Array(4).fill(3000).buffer,
);

it('sets the corner terraces and crossing rooflights on the existing block', () => {
  const other: VBuilding = {
    id: 'adjacent-building',
    rings: [
      [
        [91, -801],
        [98, -801],
        [98, -810],
        [91, -810],
      ],
    ],
    floors: 2,
    h: 7,
  };
  expect(createWilliams250([other], grid)).toBeNull();
  const result = createWilliams250([other, site], grid)!;
  expect(result.buildings).toEqual([other]);
  result.group.updateMatrixWorld(true);
  const roof = (x: number, z: number) => {
    const start = result.group.localToWorld(new Vector3(x, 400, z));
    return new Raycaster(start, new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 323.8;
  };
  expect(roof(3, 3)).toBeCloseTo(346.85);
  expect(roof(35, 32)).toBeCloseTo(351.22);
  expect(roof(58.5, 33)).toBeCloseTo(356.35, 1);
  expect(roof(36, 61.3)).toBeCloseTo(354.9, 1);
  expect(roof(58.5, 61.3)).toBeCloseTo(359.83);
  // The opening sits behind the park railing and below the office cantilever.
  const west = (z: number, y: number) => {
    const start = result.group.localToWorld(new Vector3(-4, y, z));
    const dir = new Vector3(1, 0, 0).transformDirection(result.group.matrixWorld);
    const hit = new Raycaster(start, dir).intersectObject(result.group, true)[0];
    return result.group.worldToLocal(hit.point.clone()).x;
  };
  expect(west(60.2, 323.0)).toBeGreaterThan(5);
  expect(west(60.2, 331)).toBeCloseTo(0, 1);
});
