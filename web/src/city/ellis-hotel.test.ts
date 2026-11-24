import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createEllisHotel, ellisHotelId, ellisHotelRoof, ellisHotelTop } from './ellis-hotel';
import { detachedParts, footprintReport } from './skin-kit';

const hotel: VBuilding = {
  id: ellisHotelId, h: 60.7, floors: 15,
  rings: [[[357.26, -496.15], [335.83, -496.35], [335.65, -477.02], [357.08, -476.83]]],
};
const neighbor: VBuilding = { ...hotel, id: 'neighbor' };
const sceneZero = 323.8;
const grid = new GroundGrid({
  version: 1, rows: 2, cols: 2, stepM: 600,
  bounds: { minX: 0, maxX: 600, minZ: -600, maxZ: 0 },
  encoding: 'signed int16 little-endian',
  vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: sceneZero },
  scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
}, new Int16Array(4).fill(3260).buffer);

it.each(['low', 'high'] as const)('replaces the Ellis box with measured roof tiers at %s', (quality) => {
  expect(createEllisHotel([neighbor], grid, quality)).toBeNull();
  const result = createEllisHotel([hotel, neighbor], grid, quality)!;
  expect(result.buildings).toEqual([neighbor]);
  expect(footprintReport(result.group, hotel.rings, { top: ellisHotelTop - sceneZero + 0.01 }).count).toBe(0);
  expect(detachedParts(result.group, hotel.rings)).toEqual([]);
  const roofAt = (x: number, z: number) => new Raycaster(
    new Vector3(x, 80, z), new Vector3(0, -1, 0),
  ).intersectObject(result.group)[0]?.point.y;
  expect(roofAt(353, -488)).toBeCloseTo(ellisHotelRoof - sceneZero, 3);
  expect(roofAt(337, -492)).toBeCloseTo(379.8 - sceneZero, 3);
  expect(roofAt(347.5, -488)).toBeCloseTo(ellisHotelTop - sceneZero, 3);
});
