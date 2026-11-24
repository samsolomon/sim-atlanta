import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { Mesh, Raycaster, Vector3, type BufferGeometry } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createVireo, vireoId } from './vireo';

const buildings: VBuilding[] = JSON.parse(readFileSync(new URL(
  '../../../pipeline/prototypes/square-board/midtown-upper/context.json', import.meta.url), 'utf8')).buildings;

/** Flat ground at 287 m NAVD88 by 13th Street and Piedmont Park. */
const grid = new GroundGrid({
  version: 1, rows: 2, cols: 2, stepM: 400,
  bounds: { minX: 800, maxX: 1200, minZ: -3700, maxZ: -3300 },
  encoding: 'signed int16 little-endian',
  vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
  scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
}, new Int16Array(4).fill(2870).buffer);

it('replaces Vireo within the landmark budget at the lidar heights, not the mapped 105 m', () => {
  const site = buildings.find(b => b.id === vireoId)!;
  const model = createVireo(buildings, site, grid)!;
  expect(model.buildings).toHaveLength(buildings.length - 1);
  const triangles = model.group.children
    .map(child => ((child as Mesh).geometry as BufferGeometry).getAttribute('position').count / 3)
    .reduce((a, b) => a + b, 0);
  expect(triangles).toBeLessThanOrEqual(2400);
  model.group.updateMatrixWorld(true);
  const roof = (x: number, z: number) => {
    const hit = new Raycaster(new Vector3(x, 400, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0];
    return hit ? hit.point.y + 300 : null;
  };
  expect(roof(985, -3485)).toBeCloseTo(375.8, 0); // amenity floor, north half
  expect(roof(1000, -3470)).toBeCloseTo(373.5, 0); // lounge
  expect(roof(970, -3468)).toBeCloseTo(368.4, 0); // pool deck on the occupied roof
  expect(roof(985, -3452)).toBeCloseTo(316.5, 0); // garage podium, nothing floating above it
  expect(roof(1010, -3492.4)).toBeLessThan(370); // the amenity block stays inside the north wall
});
