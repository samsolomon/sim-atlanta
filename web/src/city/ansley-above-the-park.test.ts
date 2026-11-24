import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { Mesh, Raycaster, Vector3, type BufferGeometry } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { ansleyId, createAnsley } from './ansley-above-the-park';

const buildings: VBuilding[] = JSON.parse(readFileSync(new URL(
  '../../../pipeline/prototypes/square-board/midtown-upper/context.json', import.meta.url), 'utf8')).buildings;

/** Flat ground at 279 m NAVD88 at 13th Street and Piedmont Avenue. */
const grid = new GroundGrid({
  version: 1, rows: 2, cols: 2, stepM: 400,
  bounds: { minX: 1000, maxX: 1400, minZ: -3700, maxZ: -3300 },
  encoding: 'signed int16 little-endian',
  vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
  scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
}, new Int16Array(4).fill(2790).buffer);

it('replaces Ansley Above the Park within the landmark budget at the lidar heights', () => {
  const site = buildings.find(b => b.id === ansleyId)!;
  const model = createAnsley(buildings, site, grid)!;
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
  expect(roof(1145, -3535)).toBeCloseTo(322, 0); // main slab, not the estimated 52.8 m
  expect(roof(1174, -3530)).toBeCloseTo(327.5, 0); // elevator strip above the roof
  expect(roof(1208, -3534)).toBeCloseTo(306.5, 0); // Piedmont Avenue wing
  expect(roof(1174, -3516)).toBeCloseTo(285.4, 0); // porte-cochère roof
  // The porte-cochère is open beneath: a ray at head height under it meets no wall.
  const under = new Raycaster(new Vector3(1174, 281.5 - 300, -3505), new Vector3(0, 0, -1), 0, 8).intersectObject(model.group);
  expect(under.length).toBe(0);
});

