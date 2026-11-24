import { BufferGeometry, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { create271Seventeenth, seventeenth271Id } from './271-seventeenth';

// The staged brookwood-south footprint of osm:way:269542282.
const site = {"id":"osm:way:269542282","h":113,"floors":25,"rings":[[[-410.12,-4186.49],[-412.35,-4169.65],[-341.92,-4168.39],[-341.56,-4188.51],[-339.35,-4205.79],[-357.4,-4206.08],[-409.8,-4206.91]]],"parts":[{"id":"osm:way:1562299302","rings":[[[-345.2,-4170.85],[-339.35,-4205.79],[-406.42,-4204.79],[-412.35,-4169.65]]],"h":113,"tier":"reported"},{"id":"osm:way:1562299300","rings":[[[-357.4,-4206.08],[-409.8,-4206.91],[-410.12,-4186.49],[-412.35,-4169.65],[-406.42,-4204.79],[-339.35,-4205.79]]],"h":103,"tier":"reported"},{"id":"osm:way:1562299301","rings":[[[-341.92,-4168.39],[-341.56,-4188.51],[-339.35,-4205.79],[-345.2,-4170.85],[-412.35,-4169.65]]],"h":103,"tier":"reported"}]} as VBuilding;
// Flat ground at 276.2 m NAVD88 (the lidar ground ring) with a Midtown-like scene zero.
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: -1000, maxX: 0, minZ: -5000, maxZ: -4000 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2762).buffer,
);
const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

it('sets the roof, parapet and penthouse at their lidar heights', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  const result = create271Seventeenth([other, site], site, grid)!;
  expect(site.id).toBe(seventeenth271Id);
  expect(result.buildings).toEqual([other]);
  result.group.updateMatrixWorld(true);
  const top = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 250, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
  expect(top(-400, -4178)).toBeCloseTo(276.2 + 107, 1); // roof inside the glass parapet
  expect(top(-375, -4187)).toBeCloseTo(276.2 + 113, 1); // penthouse
  // From the north, the first thing a level ray meets above the roof is the parapet glass.
  const hit = new Raycaster(new Vector3(-375, 276.2 + 110 - 300, -4300), new Vector3(0, 0, 1)).intersectObject(result.group, true)[0];
  expect(hit.point.z).toBeLessThan(-4200);
});

it('stays within the routine skin budget and lights a sparse set of panes', () => {
  const result = create271Seventeenth([site], site, grid)!;
  expect(result.group.children).toHaveLength(2);
  expect(triangles(result.group)).toBeLessThan(600);
  result.setNight(1);
  const lamps = result.group.children[1] as Mesh<BufferGeometry, MeshLambertMaterial>;
  expect(lamps.material.emissiveIntensity).toBeCloseTo(0.6);
  expect(lamps.geometry.attributes.position.count / 6).toBeLessThan(60);
});
