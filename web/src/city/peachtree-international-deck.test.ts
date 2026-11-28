import { expect, it } from 'vitest';
import { type Mesh, Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import fixture from './fixtures/peachtree-international-deck.json';
import { createPeachtreeInternationalDeck, peachtreeInternationalDeckId } from './peachtree-international-deck';
import { detachedParts, footprintReport } from './skin-kit';

// Street grade about NAVD88 326.5.
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 200,
    bounds: { minX: 200, maxX: 400, minZ: -800, maxZ: -600 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3265).buffer,
);
const site = fixture as unknown as VBuilding;

it('replaces the mapped 38.9 m box with a six-level deck at the lidar top, and a low link under the unreturned strip', () => {
  expect(site.id).toBe(peachtreeInternationalDeckId);
  expect(site.h).toBeCloseTo(38.9, 1);
  const other: VBuilding = { id: 'x', h: 10, floors: 3, rings: [[[700, -500], [710, -500], [710, -490], [700, -490]]] };
  const model = createPeachtreeInternationalDeck([site, other], grid)!;
  expect(model.buildings).toEqual([other]);
  model.group.updateMatrixWorld(true);
  const top = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y + 323.8;
  // Lidar (2019): the deck's top at NAVD88 354-357; nothing rises above 357.
  expect(top(330, -665)).toBeGreaterThan(354.5);
  expect(top(330, -665)).toBeLessThan(357);
  // The strip against 230 Peachtree returned no lidar points: a low glass link at the base's height.
  expect(top(320, -677)).toBeLessThan(336);
  for (const g of model.group.children.map(c => (c as Mesh).geometry).filter(Boolean)) {
    g.computeBoundingBox();
    expect(g.boundingBox!.max.y).toBeLessThanOrEqual(357);
  }
  expect(createPeachtreeInternationalDeck([other], grid)).toBeNull();
});

it('stays inside the routine triangle budget and its own outline, with nothing loose', () => {
  const model = createPeachtreeInternationalDeck([site], grid)!;
  let tris = 0;
  model.group.traverse(o => {
    const g = (o as Mesh).geometry;
    if (g) tris += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
  });
  expect(tris).toBeLessThanOrEqual(600);
  const rings = site.rings.slice(0, 1);
  const r = footprintReport(model.group, rings, { bottom: 326.5 - 323.8 - 8 });
  expect(r.worst).toBeLessThanOrEqual(0.3);
  expect(r.vertical).toBe(0);
  expect(detachedParts(model.group, rings)).toEqual([]);
});

it('hangs the corner sign clear of the curved glass bay', () => {
  const model = createPeachtreeInternationalDeck([site], grid)!;
  model.group.updateMatrixWorld(true);
  // The sign's face: the lamps vertices 27 m east of the skin's origin.
  const face: Vector3[] = [];
  model.group.traverse(o => {
    const position = (o as Mesh).geometry?.getAttribute('position');
    if (!position) return;
    for (let i = 0; i < position.count; i++) {
      const v = new Vector3().fromBufferAttribute(position, i).applyMatrix4(o.matrixWorld);
      if (Math.abs(v.x - 360) < 0.01) face.push(v);
    }
  });
  expect(face.length).toBeGreaterThan(0);
  const ys = face.map(v => v.y), zs = face.map(v => v.z);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  for (const u of [0.02, 0.5, 0.98]) for (const t of [0.02, 0.5, 0.98]) {
    const y = lerp(Math.min(...ys), Math.max(...ys), u), z = lerp(Math.min(...zs), Math.max(...zs), t);
    // Seen straight on from Peachtree, nothing stands in front of it.
    const hit = new Raycaster(new Vector3(400, y, z), new Vector3(-1, 0, 0)).intersectObject(model.group)[0];
    expect(hit.point.x).toBeCloseTo(360, 1);
  }
});
