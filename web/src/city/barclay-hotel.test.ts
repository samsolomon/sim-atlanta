import { Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { barclayHotelId, createBarclayHotel } from './barclay-hotel';
import { detachedParts } from './skin-kit';

const ring: [number, number][] = [[230.2, -390.1], [217.0, -405.7], [193.7, -386.0], [206.9, -370.1]];
const site: VBuilding = { id: barclayHotelId, h: 42.5, floors: 11, rings: [ring] };
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -1000, maxZ: 0 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3210).buffer,
);

it('draws the brick tower at its lidar roof over the low Luckie Street block, nothing loose', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  expect(createBarclayHotel([other], grid)).toBeNull();
  for (const tier of ['low', 'high'] as const) {
    const result = createBarclayHotel([other, site], grid, tier)!;
    expect(result.buildings).toEqual([other]);
    result.group.updateMatrixWorld(true);
    const top = (x: number, z: number) =>
      new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
    expect(top(218, -392)).toBeCloseTo(321 + 36.4, 1); // tower
    expect(top(203, -377)).toBeCloseTo(321 + 12.9, 1); // front block
    expect(detachedParts(result.group, [ring])).toEqual([]);
  }
  const low = createBarclayHotel([site], grid, 'low')!;
  expect((low.group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0)).toBeLessThan(600);
});
