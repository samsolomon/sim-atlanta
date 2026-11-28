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
  // The identifiers from LoewsMidtown.jpg are actually built: the dark recess band on the
  // south-west face, and the sawtooth wedges standing proud of the narrow west face.
  const colours = new Set<string>();
  for (const child of model.group.children) {
    const c = ((child as Mesh).geometry as BufferGeometry).getAttribute('color');
    for (let i = 0; i < c.count; i += 3) colours.add([c.getX(i), c.getY(i), c.getZ(i)].map(v => v.toFixed(3)).join());
  }
  const hex = (h: string) => { const v = parseInt(h.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255].map(n => Math.pow(n / 255, 2.2)); };
  expect([...colours].some(k => k.split(',').every((v, i) => Math.abs(+v - hex('#3c4347')[i]) < 0.01))).toBe(true);
  // The sawtooth face runs from (744.37, -3286.28) north to (750.47, -3295.86); cast at it square
  // on, `t` of the way along, at height `y` NAVD88.
  const from = [744.37, -3286.28], to = [750.47, -3295.86];
  const run = [to[0] - from[0], to[1] - from[1]], len = Math.hypot(run[0], run[1]);
  const n = [run[1] / len, -run[0] / len];
  const square = (t: number, y: number) => new Raycaster(
    new Vector3(from[0] + t * run[0] + 10 * n[0], y - 300, from[1] + t * run[1] + 10 * n[1]),
    new Vector3(-n[0], 0, -n[1]),
  ).intersectObject(model.group)[0];
  const mid = (bay: number) => 310 + bay * 6.6 + 3.3;
  // The two-storey wedges stand proud of that wall, alternately 0.9 and 1.6 m at their points.
  expect(10 - square(0.2, mid(4)).distance).toBeCloseTo(0.9 * 0.8 / 0.85, 1);
  expect(10 - square(0.2, mid(5)).distance).toBeCloseTo(1.6 * 0.8 / 0.85, 1);
  // A lit bay's pane shows across its whole width, in front of the slanted glass.
  const lamps = model.group.children[1];
  for (const t of [0.25, 0.45, 0.65]) expect(square(t, mid(10)).object, `t=${t}`).toBe(lamps);
});
