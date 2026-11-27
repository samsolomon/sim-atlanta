import { expect, it } from 'vitest';
import { type Mesh, Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import { pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import fixture from './fixtures/centergy-wing.json';
import { centergyWingId, createCentergyWing } from './centergy-wing';

// Flat ground at 293.4 m NAVD88; scene y = NAVD88 − 323.8.
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: -100, maxX: 500, minZ: -2900, maxZ: -2300 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2934).buffer,
);
const site = fixture.wing as unknown as VBuilding;
// osm:way:792229255, the 23 m block that shares the wing's south edge from x 210.93 to 248.66.
const south = fixture.south as unknown as VBuilding;
const ground = 293.4 - 323.8;

/** Distance from (x, z) to the nearest edge of a ring. */
function edgeDistance(ring: P2[], x: number, z: number) {
  let best = Infinity;
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz));
  });
  return best;
}

function vertices(group: Mesh['parent']) {
  group!.updateMatrixWorld(true);
  const out: Vector3[] = [];
  group!.traverse(o => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) out.push(new Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld));
  });
  return out;
}

it('builds the glass wing at the lidar roof', () => {
  expect(site.id).toBe(centergyWingId);
  const model = createCentergyWing([site, south], site, grid)!;
  expect(model.buildings).toEqual([south]);
  model.group.updateMatrixWorld(true);
  const h = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y - ground;
  expect(h(240, -2620)).toBeCloseTo(52.2, 0); // roof
  expect(h(229.8, -2631.8)).toBeCloseTo(57, 0); // plant
});

it('draws its facade on the mapped edges, clear of both neighbours', () => {
  const model = createCentergyWing([site, south], site, grid)!;
  const wing = site.rings[0] as P2[], block = south.rings[0] as P2[];
  // The party wall: nothing stands proud of the wing's west wall (x 202.59 here) at any height.
  model.group.updateMatrixWorld(true);
  for (const y of [3, 10, 30, 50]) {
    const hit = new Raycaster(new Vector3(195, ground + y, -2631.8), new Vector3(1, 0, 0)).intersectObject(model.group)[0];
    expect(hit.point.x).toBeGreaterThan(202.57);
  }
  const all = vertices(model.group);
  // Every layer hugs the real outline (bands stand 6 cm out), never the bounding box.
  for (const v of all) {
    const off = pointInRing(v.x, v.z, wing) ? 0 : edgeDistance(wing, v.x, v.z);
    expect(off).toBeLessThan(0.1);
  }
  // Below the south block's roof, no facade layer stands inside it.
  const inside = all.filter(v => v.y < ground + south.h! && pointInRing(v.x, v.z, block) && edgeDistance(block, v.x, v.z) > 0.01);
  expect(inside).toEqual([]);
  // Above its roof the shared south edge does get the facade: bands within 0.1 m of the wall.
  const shared = all.filter(v => v.y > ground + south.h! && v.x > 212 && v.x < 247 && Math.abs(v.z - -2612.85) < 0.1);
  expect(shared.length).toBeGreaterThan(0);
});

it('keeps the south bands above the neighbour on sloping ground', () => {
  // Ground rising about 7 m from the wing's north wall to the south block's far end, so that
  // block's roof stands two floors above the wing's lowest corner + 23 m.
  const slope = new GroundGrid(
    { ...grid.manifest, rows: 3, cols: 3, stepM: 60, bounds: { minX: 190, maxX: 310, minZ: -2660, maxZ: -2540 } },
    new Int16Array([2900, 2900, 2900, 2960, 2960, 2960, 2990, 2990, 2990]).buffer,
  );
  expect(slope.sample(220, -2650)! < slope.sample(220, -2570)! - 5).toBe(true);
  const model = createCentergyWing([site, south], site, slope)!;
  const block = south.rings[0] as P2[];
  // grid.sample is NAVD88; scene y = NAVD88 − 323.8.
  const roof = Math.max(...block.map(([x, z]) => slope.sample(x, z)!)) + south.h! - 323.8;
  const inside = vertices(model.group).filter(v => v.y < roof && pointInRing(v.x, v.z, block) && edgeDistance(block, v.x, v.z) > 0.01);
  expect(inside).toEqual([]);
  // The first band above it still stands on the shared edge.
  expect(vertices(model.group).some(v => v.y > roof && v.x > 212 && v.x < 247 && Math.abs(v.z - -2612.85) < 0.1)).toBe(true);
});
