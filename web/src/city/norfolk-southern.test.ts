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
  expect(ray(310, -2080)! + 300 - grade).toBeCloseTo(86, 0); // tall tower, north half
  expect(ray(372, -2160)! + 300 - grade).toBeCloseTo(58, 0); // short tower, east half
  expect(ray(365, -2185)! + 300 - grade).toBeCloseTo(56, 0); // its slot
  expect(ray(290, -2125)! + 300 - grade).toBeCloseTo(18, 0); // podium
  // No floating slab: a ray from inside the tall tower at mid-height hits its walls, not open air.
  const side = new Raycaster(new Vector3(200, 40 - 300 + grade, -2088), new Vector3(1, 0, 0)).intersectObject(model.group)[0];
  expect(side.point.x).toBeLessThan(280);
});

it('knows every tall mapped part, and falls back to the generic renderer if one is re-mapped', () => {
  const site = buildings.find(b => b.id === norfolkSouthernId)!;
  for (const id of Object.keys(roles)) expect(site.parts!.some(p => p.id === id), id).toBe(true);
  const renumbered = { ...site, parts: site.parts!.map(p => p.id === 'osm:way:1344630135' ? { ...p, id: 'osm:way:1' } : p) };
  expect(createNorfolkSouthern(buildings, renumbered, grid)).toBeNull();
});
