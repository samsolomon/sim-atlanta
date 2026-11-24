import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createAmericanHotel } from './american-hotel';
import { detachedParts, footprintReport } from './skin-kit';

const hotel: VBuilding = {
  id: 'f546e179-3711-43b8-a9c8-44b423eb5d46',
  h: 14.788,
  floors: 9,
  rings: [[
    [153.01, -639.84], [101.22, -638.92], [100.84, -604.56], [105.37, -599.04],
    [135.62, -597.45], [138.62, -596.48], [140.01, -594.99], [140.36, -592.25],
    [140.46, -591.47], [122.98, -577.55], [135.24, -563.38], [172.13, -595.07],
    [176.49, -594.73], [181.88, -594.29], [182.69, -605.13], [176.17, -605.64],
    [173.76, -605.82], [170.57, -609.24], [175.07, -613.04], [164.81, -625.03],
  ]],
};

it('replaces the hotel alone and keeps the courtyard and drive below the measured guest wings', () => {
  const datum = 323.8;
  const grid = new GroundGrid({
    version: 1, rows: 2, cols: 2, stepM: 100,
    bounds: { minX: 90, maxX: 190, minZ: -650, maxZ: -550 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: datum },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  }, new Int16Array(4).fill(3170).buffer);
  const neighbour = { ...hotel, id: 'neighbour' };
  expect(createAmericanHotel([neighbour], grid)).toBeNull();

  const model = createAmericanHotel([hotel, neighbour], grid)!;
  expect(model.buildings).toEqual([neighbour]);
  expect(footprintReport(model.group, hotel.rings, { maxProjection: 0.3, top: 356.31 - datum }).count).toBe(0);
  expect(detachedParts(model.group, hotel.rings)).toEqual([]);

  function roofAt(x: number, z: number) {
    const ray = new Raycaster(new Vector3(x, 60, z), new Vector3(0, -1, 0));
    return ray.intersectObject(model.group)[0]!.point.y + datum;
  }
  expect(roofAt(132, -629)).toBeCloseTo(344.7, 1);
  expect(roofAt(110, -618)).toBeCloseTo(325.9, 1);
  expect(roofAt(180, -601)).toBeCloseTo(322, 1);
  expect(roofAt(170.55, -599.95)).toBeCloseTo(356.3, 1);
  const drive = new Raycaster(new Vector3(184, 319.8 - datum, -600), new Vector3(-1, 0, 0));
  expect(drive.intersectObject(model.group)[0]!.point.x).toBeLessThan(175);
});
