import { BufferGeometry, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { createOneGeorgiaCenter, oneGeorgiaCenterId } from './one-georgia-center';

// The staged midtown-south footprint of osm:way:30978402.
const site = {"id":"osm:way:30978402","h":113,"floors":28,"rings":[[[343.05,-1900.8],[321.68,-1901],[321.3,-1860.55],[332.19,-1860.45],[343.12,-1860.35],[360.84,-1860.18],[360.93,-1870.15],[361.22,-1900.64]]]} as VBuilding;
// Flat ground at 303.5 m NAVD88 (the lidar ground ring).
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -2500, maxZ: -1500 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3035).buffer,
);
const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

it('sets the roof and penthouse at their lidar heights', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  const result = createOneGeorgiaCenter([other, site], site, grid)!;
  expect(site.id).toBe(oneGeorgiaCenterId);
  expect(result.buildings).toEqual([other]);
  result.group.updateMatrixWorld(true);
  const top = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 250, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
  expect(top(354, -1895)).toBeCloseTo(303.5 + 109.5, 1); // roof outside the penthouse
  expect(top(339, -1881)).toBeCloseTo(303.5 + 113.2, 1); // central penthouse
});

it('lights a sparse set of offices and the floodlit marble grid, inside the routine budget', () => {
  const result = createOneGeorgiaCenter([site], site, grid)!;
  expect(result.group.children).toHaveLength(3);
  expect(triangles(result.group)).toBeLessThan(900);
  result.setNight(1);
  const [, lamps, wash] = result.group.children as Mesh<BufferGeometry, MeshLambertMaterial>[];
  expect(lamps.material.emissiveIntensity).toBeCloseTo(0.6);
  expect(wash.material.emissiveIntensity).toBeCloseTo(0.3);
  expect(wash.castShadow && wash.receiveShadow).toBe(true);
  result.setNight(0);
  expect(wash.material.emissiveIntensity).toBe(0);
});
