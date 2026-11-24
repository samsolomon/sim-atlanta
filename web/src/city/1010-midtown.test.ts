import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { Mesh, Raycaster, Vector3, type BufferGeometry } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { create1010Midtown, midtown1010Id, simplifyRing } from './1010-midtown';

const context = (board: string): VBuilding[] => JSON.parse(readFileSync(new URL(
  `../../../pipeline/prototypes/square-board/${board}/context.json`, import.meta.url), 'utf8')).buildings;

/** Flat ground at 300 m NAVD88 around Peachtree and 12th. */
const grid = new GroundGrid({
  version: 1, rows: 2, cols: 2, stepM: 400,
  bounds: { minX: 500, maxX: 900, minZ: -3500, maxZ: -3100 },
  encoding: 'signed int16 little-endian',
  vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
  scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
}, new Int16Array(4).fill(3000).buffer);

const triangles = (group: { children: unknown[] }) => group.children
  .map(child => ((child as Mesh).geometry as BufferGeometry).getAttribute('position').count / 3)
  .reduce((a, b) => a + b, 0);

it('claims 1010 Midtown in both rows it crosses, within the landmark budget', () => {
  let total = 0;
  for (const board of ['midtown-central', 'midtown-upper']) {
    const buildings = context(board);
    const site = buildings.find(b => b.id === midtown1010Id)!;
    const model = create1010Midtown(buildings, site, grid)!;
    expect(model, board).not.toBeNull();
    expect(model.buildings).not.toContain(site);
    total += triangles(model.group);
  }
  expect(total).toBeLessThanOrEqual(2400);
});

it('tops the tower at the lidar roof with plant above and the podium below', () => {
  const buildings = context('midtown-upper');
  const model = create1010Midtown(buildings, buildings.find(b => b.id === midtown1010Id)!, grid)!;
  model.group.updateMatrixWorld(true);
  const roof = (x: number, z: number) => {
    const hit = new Raycaster(new Vector3(x, 400, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0];
    return hit ? hit.point.y + 300 : null;
  };
  expect(roof(740, -3345)).toBeCloseTo(413.9, 0); // east side of the slab, clear of the plant
  expect(roof(722, -3335)).toBeCloseTo(419.5, 0); // roof plant on the spine
  expect(roof(670, -3340)).toBeCloseTo(321.5, 0); // stone podium toward Crescent Avenue
  expect(roof(705, -3373)).toBeCloseTo(303.3, 0); // the 3.3 m strip on 12th Street keeps its mapped height
});

it('simplifies a dense curve but keeps its corners', () => {
  const arc = Array.from({ length: 33 }, (_, i): [number, number] => [Math.cos(i * Math.PI / 32) * 20, Math.sin(i * Math.PI / 32) * 20]);
  const ring = simplifyRing([...arc, [-20, -10], [20, -10]], 0.35);
  expect(ring.length).toBeLessThanOrEqual(18); // from 35
  expect(ring).toContainEqual([-20, -10]);
  expect(ring).toContainEqual([20, -10]);
});
