import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { Box3, Mesh, Raycaster, Vector3, type BufferGeometry } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createPiedmontHouse, piedmontHouseId } from './piedmont-house';
import { pointInRing, type P2 } from '../vignette/geom';

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

it('stands in for the midtown-central sliver, hidden inside the walls midtown-upper draws', () => {
  const buildings = context('midtown-central');
  const model = createPiedmontHouse(buildings, buildings.find(b => b.id === piedmontHouseId)!, grid)!;
  model.group.updateMatrixWorld(true);
  const box = new Box3().setFromObject(model.group);
  // South of the seam and north of the true south face at z = -3295.
  expect(box.min.z).toBeGreaterThan(-3300);
  expect(box.max.z).toBeLessThan(-3295);
  // The tower part reaches just under the 358.2 m roof; the podium just under 302.5 m.
  expect(box.max.y + 300).toBeCloseTo(357.7, 1);
  const down = (x: number) => new Raycaster(new Vector3(x, 400, -3297), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y + 300;
  expect(down(1041)).toBeCloseTo(357.7, 1);
  expect(down(1020)).toBeCloseTo(302, 1);
  // Closed to the north too, the side seen while midtown-upper is still on its way.
  const fromNorth = (x: number, y: number) => new Raycaster(new Vector3(x, y - 300, -3310), new Vector3(0, 0, 1))
    .intersectObject(model.group)[0].point.z;
  expect(fromNorth(1041, 330)).toBeCloseTo(-3299.7, 1);
  expect(fromNorth(1020, 290)).toBeCloseTo(-3299.7, 1);
  expect(fromNorth(1029.8, 290)).toBeCloseTo(-3299.7, 1); // no slot between the two blocks
  // Every vertex lies inside the walls midtown-upper draws, which move the seam out to z = -3295.
  const upper = context('midtown-upper').find(b => b.id === piedmontHouseId)!.rings[0]
    .map(([x, z]): P2 => [x, Math.abs(z + 3300) < 0.05 ? -3295 : z]);
  model.group.traverse(o => {
    if (!(o instanceof Mesh)) return;
    const p = (o.geometry as BufferGeometry).getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const v = new Vector3().fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
      expect(pointInRing(v.x, v.z, upper)).toBe(true);
    }
  });
});
