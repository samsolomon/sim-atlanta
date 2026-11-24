import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { Mesh, Raycaster, Vector3, type BufferGeometry } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { atlanticId, createAtlantic, extendAcrossSeam, mergeCollinear } from './the-atlantic';

const context = (board: string): VBuilding[] => JSON.parse(readFileSync(new URL(
  `../../../pipeline/prototypes/square-board/${board}/context.json`, import.meta.url), 'utf8')).buildings;

/** Flat ground at 272 m NAVD88 around Atlantic Station. */
const grid = new GroundGrid({
  version: 1, rows: 2, cols: 2, stepM: 400,
  bounds: { minX: -800, maxX: -400, minZ: -4300, maxZ: -3900 },
  encoding: 'signed int16 little-endian',
  vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
  scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
}, new Int16Array(4).fill(2720).buffer);

const triangles = (group: { children: unknown[] }) => group.children
  .map(child => ((child as Mesh).geometry as BufferGeometry).getAttribute('position').count / 3)
  .reduce((a, b) => a + b, 0);

it('claims the Atlantic in both rows it crosses, so neither keeps a generic box', () => {
  let total = 0;
  for (const board of ['brookwood-south', 'midtown-upper']) {
    const buildings = context(board);
    const site = buildings.find(b => b.id === atlanticId)!;
    const model = createAtlantic(buildings, site, grid)!;
    expect(model, board).not.toBeNull();
    expect(model.buildings).not.toContain(site);
    expect(model.buildings).toHaveLength(buildings.length - 1);
    total += triangles(model.group);
  }
  // Landmark ceiling for the low tier.
  expect(total).toBeLessThanOrEqual(2400);
});

it('carries the tower across the seam to its south face and steps the roof to the crown', () => {
  const buildings = context('brookwood-south');
  const model = createAtlantic(buildings, buildings.find(b => b.id === atlanticId)!, grid)!;
  model.group.updateMatrixWorld(true);
  const roof = (x: number, z: number) => {
    const hit = new Raycaster(new Vector3(x, 400, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0];
    return hit ? hit.point.y + 300 : null;
  };
  // The midtown-upper sliver: the tower's south face stands 3 m past the board seam.
  expect(roof(-547, -4098)).toBeCloseTo(431, 0);
  expect(roof(-547, -4095.5)).toBeNull();
  // Lidar: occupied roof 431, a lower penthouse inside the open crown screen, stepped corners.
  expect(roof(-547, -4112)).toBeCloseTo(434.5, 0);
  expect(roof(-577, -4125.5)).toBeCloseTo(398, 0);
});

it('merges collinear outline vertices and moves seam vertices', () => {
  expect(mergeCollinear([[0, 0], [5, 0], [10, 0], [10, 10], [0, 10]])).toEqual([[0, 0], [10, 0], [10, 10], [0, 10]]);
  expect(extendAcrossSeam([[0, -4100], [1, -4110]], -4100, -4097)).toEqual([[0, -4097], [1, -4110]]);
});
