import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { Mesh, Raycaster, Vector3, type BufferGeometry } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createPiedmontHouse, piedmontHouseId } from './piedmont-house';

const context = (board: string): VBuilding[] => JSON.parse(readFileSync(new URL(
  `../../../pipeline/prototypes/square-board/${board}/context.json`, import.meta.url), 'utf8')).buildings;

/** Flat ground at 281 m NAVD88 by 12th Street and Piedmont Park. */
const grid = new GroundGrid({
  version: 1, rows: 2, cols: 2, stepM: 400,
  bounds: { minX: 800, maxX: 1200, minZ: -3500, maxZ: -3100 },
  encoding: 'signed int16 little-endian',
  vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
  scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
}, new Int16Array(4).fill(2810).buffer);

it('claims Piedmont House in both rows it crosses, within the landmark budget', () => {
  let total = 0;
  for (const board of ['midtown-central', 'midtown-upper']) {
    const buildings = context(board);
    const site = buildings.find(b => b.id === piedmontHouseId)!;
    const model = createPiedmontHouse(buildings, site, grid)!;
    expect(model, board).not.toBeNull();
    expect(model.buildings).not.toContain(site);
    total += model.group.children
      .map(child => ((child as Mesh).geometry as BufferGeometry).getAttribute('position').count / 3)
      .reduce((a, b) => a + b, 0);
  }
  expect(total).toBeLessThanOrEqual(2400);
});

it('stands at the lidar roof and penthouse, with the podium at its lidar height', () => {
  const buildings = context('midtown-upper');
  const model = createPiedmontHouse(buildings, buildings.find(b => b.id === piedmontHouseId)!, grid)!;
  model.group.updateMatrixWorld(true);
  const roof = (x: number, z: number) => {
    const hit = new Raycaster(new Vector3(x, 400, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0];
    return hit ? hit.point.y + 300 : null;
  };
  expect(roof(1045, -3320)).toBeCloseTo(358.2, 0); // north–south wing
  expect(roof(1036, -3346)).toBeCloseTo(360.2, 0); // central penthouse
  expect(roof(1020, -3320)).toBeCloseTo(302.5, 0); // west podium
  // The south face stands at z = -3295, past the board seam, drawn from midtown-upper.
  expect(roof(1045, -3297)).toBeCloseTo(358.2, 0);
  expect(roof(1045, -3293)).toBeNull();
});

it('claims the midtown-central sliver without drawing anything', () => {
  const buildings = context('midtown-central');
  const model = createPiedmontHouse(buildings, buildings.find(b => b.id === piedmontHouseId)!, grid)!;
  expect(model.group.children).toHaveLength(0);
});
