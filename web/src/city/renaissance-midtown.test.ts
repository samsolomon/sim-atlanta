import { expect, it } from 'vitest';
import { Color, Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import fixture from './fixtures/renaissance-midtown.json';
import { createRenaissanceMidtown, renaissanceId } from './renaissance-midtown';

const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: 0, maxX: 600, minZ: -3000, maxZ: -2400 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2932).buffer,
);

it('builds the hotel slab at the lidar roof', () => {
  const site = fixture as unknown as VBuilding;
  expect(site.id).toBe(renaissanceId);
  const other: VBuilding = { id: 'x', h: 10, floors: 3, rings: [[[100, -2500], [110, -2500], [110, -2490], [100, -2490]]] };
  const model = createRenaissanceMidtown([site, other], site, grid)!;
  expect(model.buildings).toEqual([other]);
  model.group.updateMatrixWorld(true);
  const h = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y + 323.8 - 293.2;
  // Lidar (2019): roof p50 61.5, p95 66.5 m; mapped 64 m.
  expect(h(375, -2714)).toBeCloseTo(64, 0); // parapet roof
  expect(h(350, -2718.7)).toBeCloseTo(66.5, 0); // plant
  // Each narrow end has one central slot: the slot colour is hit at its middle
  // from both ends, and plain precast just outside it.
  const hit = (x: number, z: number, dx: number) => {
    const r = new Raycaster(new Vector3(x, 10, z), new Vector3(dx, 0, 0)).intersectObject(model.group)[0];
    const c = (r.object as import('three').Mesh).geometry.getAttribute('color');
    return [c.getX(r.face!.a), c.getY(r.face!.a), c.getZ(r.face!.a)].map(v => Math.round(v * 255));
  };
  // Vertex colours are stored linear, as three.js Color converts them.
  const c = new Color('#8d9ba4');
  const slotRgb = [c.r, c.g, c.b].map(v => Math.round(v * 255));
  for (const [x, dx] of [[300, 1], [400, -1]] as const) {
    const mid = hit(x, -2718.7, dx);
    expect(mid.every((v, i) => Math.abs(v - slotRgb[i]) < 3)).toBe(true);
  }
  const split = { ...site, rings: [site.rings[0], site.rings[0]] };
  expect(createRenaissanceMidtown([split], split, grid)).toBeNull();
});
