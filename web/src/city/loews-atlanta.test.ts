import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { Mesh, Raycaster, Vector3, type BufferGeometry } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createLoews, loewsId } from './loews-atlanta';

const buildings: VBuilding[] = JSON.parse(readFileSync(new URL(
  '../../../pipeline/prototypes/square-board/midtown-central/context.json', import.meta.url), 'utf8')).buildings;

/** Flat ground at 295 m NAVD88 around Peachtree and 11th. */
const grid = new GroundGrid({
  version: 1, rows: 2, cols: 2, stepM: 400,
  bounds: { minX: 500, maxX: 900, minZ: -3500, maxZ: -3100 },
  encoding: 'signed int16 little-endian',
  vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
  scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
}, new Int16Array(4).fill(2950).buffer);

it('replaces the Loews site within the landmark budget and steps the tower as the lidar does', () => {
  const site = buildings.find(b => b.id === loewsId)!;
  const model = createLoews(buildings, site, grid)!;
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
  expect(roof(756, -3282)).toBeCloseTo(411.5, 0); // north-west block on the Peachtree side
  expect(roof(784, -3266)).toBeCloseTo(405, 0); // east block
  expect(roof(740, -3266)).toBeCloseTo(369, 0); // west wing
});
