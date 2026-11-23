import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createRhodesHaverty } from './rhodes-haverty';

it('resolves the three street gables, flat roof, high north attic and separate one-storey storefront', () => {
  const tower: VBuilding = {
    id: '85e6fb90-92d5-4178-acb4-40ed503833d4',
    h: 75,
    floors: 21,
    rings: [
      [
        [316.47, -349.72],
        [327.89, -372.13],
        [314.7, -385.98],
        [297.36, -372.48],
      ],
    ],
  };
  const shop: VBuilding = {
    id: '419a1c3b-0973-40f3-b073-9344422c5e34',
    h: 73.6,
    floors: null,
    rings: [
      [
        [320.95, -391.45],
        [314.7, -385.98],
        [327.89, -372.13],
        [331.58, -379.21],
      ],
    ],
  };
  const hillyer: VBuilding = {
    id: 'e2ed4d1d-7c80-4486-b00d-5fc99ed81bae',
    h: 15.1,
    floors: null,
    rings: [
      [
        [320.95, -391.45],
        [331.58, -379.21],
        [334.91, -386.07],
        [326.84, -396.04],
      ],
    ],
  };
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
    new Int16Array(4).fill(3230).buffer,
  );
  expect(createRhodesHaverty([shop, hillyer], grid)).toBeNull();
  const movedShop = { ...shop, rings: hillyer.rings };
  expect(createRhodesHaverty([tower, movedShop, hillyer], grid)?.buildings).toEqual([movedShop, hillyer]);
  const result = createRhodesHaverty([shop, tower, hillyer], grid)!;
  expect(result.buildings).toEqual([hillyer]);
  result.group.updateMatrixWorld(true);
  const height = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 155, z), new Vector3(0, -1, 0)).intersectObject(result.group)[0]?.point.y + 323.8;
  expect(height(322, -382)).toBeCloseTo(329.1, 1);
  const len = Math.hypot(17.34, 13.5);
  const local = (u: number, v: number) =>
    height(297.36 + (17.34 * u + 13.5 * v) / len, -372.48 + (-13.5 * u + 17.34 * v) / len);
  expect(local(14, 9)).toBeCloseTo(396.7, 1);
  expect(local(7, 9)).toBeCloseTo(392.1, 1);
  for (const [i, j] of [
    [3, 2],
    [1, 0],
    [0, 3],
  ]) {
    const [a, b] = [tower.rings[0][i], tower.rings[0][j]];
    expect(height((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)).toBeCloseTo(395.65, 1);
    expect(height(a[0] * 0.92 + b[0] * 0.08, a[1] * 0.92 + b[1] * 0.08)).toBeCloseTo(392.87, 1);
  }
});
