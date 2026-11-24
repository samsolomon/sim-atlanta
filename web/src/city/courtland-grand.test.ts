import { expect, it } from 'vitest';
import { Mesh, Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import { pointInRing } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { courtlandGrandId, createCourtlandGrand } from './courtland-grand';

const ring: [number, number][] = [[760.1, -616.5], [743.4, -616.5], [743.4, -598.2], [740.2, -588.7], [736.3, -582.4], [731.5, -577.6],
  [726.0, -575.2], [720.4, -573.7], [699.8, -573.7], [698.3, -514.5], [706.0, -514.5], [787.1, -513.2], [787.4, -526.9], [836.3, -526.0],
  [835.7, -590.6], [836.0, -608.3], [760.1, -609.5]];

it('raises the Courtland Grand to its lidar towers over the podium, all within the footprint plus balconies', () => {
  const site: VBuilding = { id: courtlandGrandId, h: 40.9, floors: null, rings: [ring] };
  const grid = new GroundGrid({ version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: 500, maxX: 1100, minZ: -900, maxZ: -300 }, encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 }, scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '' },
  new Int16Array(4).fill(3091).buffer);
  const model = createCourtlandGrand([site], grid)!;
  expect(model.buildings).toEqual([]);
  model.group.updateMatrixWorld(true);
  const top = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 300, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y + 300 - 309.1;
  expect(top(740, -525)).toBeCloseTo(31, 0); // south slab along Ellis
  expect(top(810, -600)).toBeCloseTo(29, 0); // north tower
  expect(top(760, -606)).toBeCloseTo(34, 0); // its taller section
  expect(top(800, -545)).toBeLessThan(14); // podium and courtyard roof
  // Nothing floats: every vertex sits within the footprint or at most 1.7 m beyond it (the balconies).
  const dist = (x: number, z: number) => pointInRing(x, z, ring) ? 0 : Math.min(...ring.map(([ax, az], k) => {
    const [bx, bz] = ring[(k + 1) % ring.length], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - ax - t * dx, z - az - t * dz);
  }));
  let worst = 0;
  const v = new Vector3();
  model.group.traverse(o => {
    if (!(o instanceof Mesh)) return;
    const p = o.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); worst = Math.max(worst, dist(v.x, v.z)); }
  });
  expect(worst).toBeLessThanOrEqual(1.7);
  const [body] = model.group.children as Mesh[];
  expect(body.geometry.getAttribute('position').count / 3).toBeLessThanOrEqual(2400);
  console.log('cg tris', body.geometry.getAttribute('position').count / 3, worst.toFixed(2));
});
