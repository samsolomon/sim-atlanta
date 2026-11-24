import { expect, it } from 'vitest';
import { type Mesh, Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import fixture from './fixtures/international-garage.json';
import { createInternationalGarage, internationalGarageId } from './international-garage';
import { detachedParts, footprintReport } from './skin-kit';

// Flat street grade at the lidar ring ground (NAVD88 319.1).
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 200,
    bounds: { minX: 400, maxX: 600, minZ: -700, maxZ: -500 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3191).buffer,
);
const site = fixture as unknown as VBuilding;

it('replaces the mapped 22.5 m box with a five-level deck over shops at the lidar height', () => {
  expect(site.id).toBe(internationalGarageId);
  const other: VBuilding = { id: 'x', h: 10, floors: 3, rings: [[[700, -500], [710, -500], [710, -490], [700, -490]]] };
  const model = createInternationalGarage([site, other], grid)!;
  expect(model.buildings).toEqual([other]);
  model.group.updateMatrixWorld(true);
  const top = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y + 323.8;
  // Lidar (2019): the top deck at NAVD88 337-339 (p50 19.0 m above the ring ground), the lift core 341.
  expect(top(490, -600)).toBeGreaterThan(337.5);
  expect(top(490, -600)).toBeLessThan(339.5);
  expect(top(443, -628)).toBeCloseTo(341.4, 1);
  expect(createInternationalGarage([other], grid)).toBeNull();
});

it('stays inside the routine triangle budget and its own outline, with nothing loose', () => {
  const model = createInternationalGarage([site], grid)!;
  let tris = 0;
  model.group.traverse(o => {
    const g = (o as Mesh).geometry;
    if (g) tris += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
  });
  expect(tris).toBeLessThanOrEqual(600);
  const rings = site.rings.slice(0, 1);
  const r = footprintReport(model.group, rings, { bottom: 319.1 - 323.8 - 8 });
  expect(r.worst).toBeLessThanOrEqual(0.3);
  expect(r.vertical).toBe(0);
  expect(detachedParts(model.group, rings)).toEqual([]);
});
