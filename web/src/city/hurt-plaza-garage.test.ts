import { BufferGeometry, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { createHurtPlazaGarage, hurtPlazaGarageId } from './hurt-plaza-garage';

// The staged downtown footprint.
const site = {"id":"8de7071d-aa01-4995-9acb-9387696c58ec","h":30.6,"floors":null,"cls":"parking","name":"Hurt Plaza Garage","rings":[[[394.67,-8.14],[323.31,-51.43],[307.53,-26.13],[340.09,-6.05],[338.29,-2.76],[366.74,14.17],[368.09,12.26],[377.45,17.95]]]} as VBuilding;
// Flat ground at 316.1 m NAVD88 (the lidar ground ring).
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -500, maxZ: 500 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3161).buffer,
);
const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

it('sets the top deck at the lidar 21.9 m, not the mapped 30.6 m, with the core above it', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  const result = createHurtPlazaGarage([other, site], grid)!;
  expect(site.id).toBe(hurtPlazaGarageId);
  expect(result.buildings).toEqual([other]);
  result.group.updateMatrixWorld(true);
  const top = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 250, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
  expect(top(345, -20)).toBeCloseTo(316.1 + 21.9, 1); // the open top deck
  expect(top(386, -9)).toBeCloseTo(316.1 + 28.3, 1); // the stair and elevator core
});

it('lights the deck fixtures at night and stays inside the landmark budget', () => {
  const result = createHurtPlazaGarage([site], grid)!;
  expect(result.group.children).toHaveLength(2);
  expect(triangles(result.group)).toBeLessThan(450); // 352 at the first build
  const lamps = result.group.children[1] as Mesh<BufferGeometry, MeshLambertMaterial>;
  result.setNight(1);
  expect(lamps.material.emissiveIntensity).toBeCloseTo(0.5);
});
