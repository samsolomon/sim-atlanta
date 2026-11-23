import { Raycaster, Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createCandler } from './candler';

afterEach(() => vi.unstubAllGlobals());
it('restores the low Peachtree shop independently of the taller hotel and its light court', () => {
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({ fillRect() {}, fillText() {} }) }) });
  const hotel: VBuilding = {
    id: '19774120-7c53-451e-abc4-538e31fdf018',
    h: 73.2,
    floors: 17,
    rings: [
      [
        [350.24, -305.99],
        [361.94, -307.6],
        [363.11, -354.2],
        [339.82, -354.68],
        [321.04, -315.46],
        [322.04, -315.29],
        [335.71, -310.98],
        [342.35, -323.57],
        [347.06, -322.69],
        [346.61, -306.38],
      ],
    ],
  };
  const shop: VBuilding = {
    id: '34e844fe-1076-4a70-b533-650c8f36085d',
    h: 65.4,
    floors: 2,
    rings: [
      [
        [346, -308.1],
        [340.54, -294.5],
        [315.05, -300.6],
        [322.04, -315.29],
        [335.71, -310.98],
      ],
    ],
  };
  const grid = new GroundGrid(
    {
      version: 1,
      rows: 2,
      cols: 2,
      stepM: 100,
      bounds: { minX: 290, maxX: 390, minZ: -375, maxZ: -275 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3232).buffer
  );
  const other = { ...hotel, id: 'neighbor' };
  const both = createCandler([hotel, other, shop], grid)!;
  expect(both.buildings).toEqual([other]);
  both.group.updateMatrixWorld(true);
  const top = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 150, z), new Vector3(0, -1, 0)).intersectObject(both.group)[0]?.point.y;
  expect(top(324, -305)! + 323.8).toBeCloseTo(333.2);
  expect(top(349.7, -343)! + 323.8).toBeCloseTo(393.2);
  expect(top(337.5, -313.6)! + 323.8).toBeCloseTo(378.04);
  expect(top(344, -316)).toBeUndefined();
  const splitHotel = { ...hotel, rings: [hotel.rings[0].slice(1)] };
  expect(createCandler([splitHotel, shop], grid)!.buildings).toEqual([splitHotel]);
  expect(createCandler([hotel, other], grid)!.buildings).toEqual([other]);
  expect(createCandler([other], grid)).toBeNull();
});
