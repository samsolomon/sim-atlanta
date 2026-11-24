import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { Mesh, Raycaster, Vector3, type BufferGeometry } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createNorfolkSouthern, inferred, norfolkSouthernId, roles } from './norfolk-southern';

const buildings: VBuilding[] = JSON.parse(readFileSync(new URL(
  '../../../pipeline/prototypes/square-board/midtown-south/context.json', import.meta.url), 'utf8')).buildings;

/** Flat ground at 295 m NAVD88 around West Peachtree and Ponce. */
const grid = new GroundGrid({
  version: 1, rows: 2, cols: 2, stepM: 400,
  bounds: { minX: 100, maxX: 500, minZ: -2400, maxZ: -2000 },
  encoding: 'signed int16 little-endian',
  vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
  scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
}, new Int16Array(4).fill(2950).buffer);

it('maps OSM levels 20 and 13 to HOK’s 22 and 15 floors over the 18 m podium', () => {
  expect(inferred(72)).toBeCloseTo(86, 5); // 5 podium levels + 17 office floors
  expect(inferred(46.8)).toBeCloseTo(58, 5); // 5 + 10
  expect(inferred(18)).toBeCloseTo(26, 5); // only tower parts go through this mapping
});

it('fills the towers from grade to their inferred roofs within the landmark budget', () => {
  const site = buildings.find(b => b.id === norfolkSouthernId)!;
  const model = createNorfolkSouthern(buildings, site, grid)!;
  expect(model.buildings).toHaveLength(buildings.length - 1);
  const triangles = model.group.children
    .map(child => ((child as Mesh).geometry as BufferGeometry).getAttribute('position').count / 3)
    .reduce((a, b) => a + b, 0);
  expect(triangles).toBeLessThanOrEqual(2400);
  model.group.updateMatrixWorld(true);
  const ray = (x: number, z: number, y = 400) =>
    new Raycaster(new Vector3(x, y - 300, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0]?.point.y;
  const grade = 295;
  // Tall tower, north half: the sail rakes from the inferred 86 m up to 92 m at the slot.
  const tall = ray(310, -2080)! + 300 - grade;
  expect(tall).toBeGreaterThan(86 - 0.5);
  expect(tall).toBeLessThan(92 + 0.5);
  expect(ray(305, -2096)! + 300 - grade).toBeGreaterThan(ray(300, -2072)! + 300 - grade); // rising toward the slot
  const short = ray(372, -2160)! + 300 - grade; // short tower, east half (sail 58 -> 64 m)
  expect(short).toBeGreaterThan(58 - 0.5);
  expect(short).toBeLessThan(64 + 0.5);
  // Both towers' halves rise toward their slots and peak at about inferred height + 6 m.
  const shortEdge = ray(368, -2160)! + 300 - grade, shortFar = ray(376, -2160)! + 300 - grade;
  expect(shortEdge).toBeGreaterThan(shortFar + 2);
  // The short tower's peak, along the slot edge, reaches inferred height + 6 m.
  const peak = Math.max(...[340, 344, 348, 352, 356, 360, 364, 368].flatMap(x => [-2195, -2185, -2175, -2165].map(z => (ray(x, z) ?? -300) + 300 - grade)));
  expect(peak).toBeCloseTo(64, 0);
  expect(ray(365, -2185)! + 300 - grade).toBeCloseTo(56, 0); // its slot
  expect(ray(290, -2125)! + 300 - grade).toBeCloseTo(18, 0); // podium
  // No floating slab: a ray from inside the tall tower at mid-height hits its walls, not open air.
  const side = new Raycaster(new Vector3(200, 40 - 300 + grade, -2088), new Vector3(1, 0, 0)).intersectObject(model.group)[0];
  expect(side.point.x).toBeLessThan(280);
});

it('falls back to the generic renderer when the slots are missing', () => {
  const site = buildings.find(b => b.id === norfolkSouthernId)!;
  const noSlots = { ...site, parts: site.parts!.filter(p => p.id !== 'osm:way:1344630134' && p.id !== 'osm:way:1344630131') };
  expect(createNorfolkSouthern(buildings, noSlots, grid)).toBeNull();
});

it('knows every tall mapped part, and falls back to the generic renderer if one is re-mapped', () => {
  const site = buildings.find(b => b.id === norfolkSouthernId)!;
  for (const id of Object.keys(roles)) expect(site.parts!.some(p => p.id === id), id).toBe(true);
  const renumbered = { ...site, parts: site.parts!.map(p => p.id === 'osm:way:1344630135' ? { ...p, id: 'osm:way:1' } : p) };
  expect(createNorfolkSouthern(buildings, renumbered, grid)).toBeNull();
});
