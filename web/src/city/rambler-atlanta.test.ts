import { BufferGeometry, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { createRambler, ramblerId } from './rambler-atlanta';

// The staged midtown-south footprint of osm:way:1300601309 (19 floors, no mapped height).
const site = {"id":"osm:way:1300601309","floors":19,"rings":[[[511.62,-2311],[626.76,-2302.07],[628.9,-2329.63],[513.75,-2338.55]]]} as VBuilding;
// Flat ground at 305.3 m NAVD88.
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -2500, maxZ: -1500 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3053).buffer,
);
const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

it('stands at the reported 19-floor height with a pale base and a dark shaft', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  const result = createRambler([other, site], site, grid)!;
  expect(site.id).toBe(ramblerId);
  expect(result.buildings).toEqual([other]);
  result.group.updateMatrixWorld(true);
  const top = new Raycaster(new Vector3(600, 250, -2320), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
  // Floor is the grade plus 0.35 below the shell base, i.e. the grade itself.
  expect(top - 305.3).toBeCloseTo(60.7, 0);
});

it('lights about a third of the rooms inside the budget (under 1,000 triangles)', () => {
  const result = createRambler([site], site, grid)!;
  expect(result.group.children).toHaveLength(2);
  expect(triangles(result.group)).toBeLessThan(1000);
  result.setNight(1);
  const lamps = result.group.children[1] as Mesh<BufferGeometry, MeshLambertMaterial>;
  expect(lamps.material.emissiveIntensity).toBeCloseTo(0.62);
  expect(lamps.geometry.attributes.position.count / 6).toBeGreaterThan(100);
});
