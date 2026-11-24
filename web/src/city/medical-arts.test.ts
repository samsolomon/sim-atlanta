import { Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { createMedicalArts, medicalArtsId } from './medical-arts';

// The staged downtown footprint: 60 ft on Peachtree, 140 ft deep.
const site = {"id":"51e690cd-e135-46db-9935-e4588b6b2e1f","h":57.3,"floors":12,"rings":[[[543.58,-1235.12],[503.12,-1249.17],[497.27,-1232.3],[537.73,-1218.25]]]} as VBuilding;
// Flat ground at 311.4 m NAVD88 (the Peachtree sidewalk) with the downtown scene zero.
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -2000, maxZ: -1000 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3114).buffer,
);
const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

it('sets the roof, penthouse and stair head at their lidar heights', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  const result = createMedicalArts([other, site], grid)!;
  expect(site.id).toBe(medicalArtsId);
  expect(result.buildings).toEqual([other]);
  result.group.updateMatrixWorld(true);
  const top = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
  expect(top(530, -1230)).toBeCloseTo(352, 1); // main roof, east of the penthouse
  expect(top(512, -1243)).toBeCloseTo(357.4, 1); // elevator penthouse
  expect(top(522, -1234)).toBeCloseTo(361.6, 1); // stair head
  // Nothing on the roof overhangs the walls: just outside them, a ray meets only ground or cornice.
  const miss = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(result.group, true).length;
  expect(miss(524, -1245.5)).toBe(0); // north of the north wall
  expect(miss(499, -1239)).toBe(0); // west of the west wall
});

it('is a vacant building: one body mesh, no lit windows, inside the routine budget', () => {
  const result = createMedicalArts([site], grid)!;
  expect(result.group.children).toHaveLength(1);
  expect(triangles(result.group)).toBeLessThan(600);
});
