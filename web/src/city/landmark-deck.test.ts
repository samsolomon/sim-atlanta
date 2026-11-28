import { expect, it } from 'vitest';
import { Color, type Mesh, Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import fixture from './fixtures/landmark-deck.json';
import tower from './fixtures/the-landmark.json';
import { createLandmarkDeck, landmarkDeckId } from './landmark-deck';
import { pointInRing } from '../vignette/geom';
import { footprintContains, yieldPlanes } from '../terrain/surface-build';

// Grade along x: Piedmont (west) at the lidar lot, falling 4.4 m toward the Connector (east).
const cols = [296.9, 296.9, 296.9, 292.5];
const grid = new GroundGrid(
  {
    version: 1, rows: 4, cols: 4, stepM: 50,
    bounds: { minX: 850, maxX: 1000, minZ: -800, maxZ: -650 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(Array.from({ length: 16 }, (_, i) => Math.round(cols[i % 4] * 10))).buffer,
);

const deck = fixture as unknown as VBuilding;
const landmark = tower as unknown as VBuilding;

it('replaces the 68 m extrusion with a one-level deck at the lidar lot height', () => {
  expect(deck.id).toBe(landmarkDeckId);
  expect(deck.h).toBeCloseTo(68.2, 1); // Overture's height, which is The Landmark's
  const model = createLandmarkDeck([deck, landmark], grid, [deck, landmark])!;
  expect(model.buildings).toEqual([landmark]);
  model.group.updateMatrixWorld(true);
  const top = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y + 323.8;
  // Lidar (2019): the lot is p50 3.0 m above the ring ground, NAVD88 296.9. Nothing rises above the parapet.
  const lot = top(950, -735);
  expect(lot).toBeGreaterThan(296.8);
  expect(lot).toBeLessThan(297.6);
  const box = model.group.children.map(c => (c as Mesh).geometry).filter(Boolean);
  for (const g of box) { g.computeBoundingBox(); expect(g.boundingBox!.max.y).toBeLessThan(lot + 1.5); }
  expect(createLandmarkDeck([landmark], grid, [landmark])).toBeNull();
});

it('leaves the walls it shares with The Landmark to the tower', () => {
  const model = createLandmarkDeck([deck, landmark], grid, [deck, landmark])!;
  model.group.updateMatrixWorld(true);
  // From inside the tower, looking south-east through the shared wall at (944, -705): only the deck's
  // own concrete prism wall, no bays, fence or parapet quads beyond it.
  const hits = new Raycaster(new Vector3(936, 295 - 323.8, -700), new Vector3(0.6, 0, -0.8).normalize(), 0, 12)
    .intersectObject(model.group);
  expect(hits.length).toBeLessThanOrEqual(1);
});

it('stays inside the routine triangle budget', () => {
  const model = createLandmarkDeck([deck, landmark], grid, [deck, landmark])!;
  let tris = 0;
  model.group.traverse(o => {
    const g = (o as Mesh).geometry;
    if (g) tris += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
  });
  expect(tris).toBeLessThanOrEqual(600);
});

it('keeps both skins inside their own outlines, with nothing loose (footprint and detachment audits)', async () => {
  const { footprintReport, detachedParts } = await import('./skin-kit');
  const { createTheLandmark } = await import('./the-landmark');
  const bottom = 292.5 - 323.8 - 8;
  for (const [model, site] of [[createLandmarkDeck([deck, landmark], grid, [deck, landmark])!, deck], [createTheLandmark([landmark, deck], grid)!, landmark]] as const) {
    const rings = site.rings.slice(0, 1);
    const r = footprintReport(model.group, rings, { bottom });
    expect(r.worst, site.id).toBeLessThanOrEqual(0.3);
    expect(r.vertical, site.id).toBe(0);
    expect(detachedParts(model.group, rings), site.id).toEqual([]);
  }
});

it('leaves the party walls plain as City builds it, after the tower skin has claimed its site', () => {
  const model = createLandmarkDeck([deck], grid, [deck, landmark])!;
  model.group.updateMatrixWorld(true);
  const hits = new Raycaster(new Vector3(936, 295 - 323.8, -700), new Vector3(0.6, 0, -0.8).normalize(), 0, 12)
    .intersectObject(model.group);
  expect(hits.length).toBeLessThanOrEqual(1);
});

it('keeps every painted stall line on the roof', () => {
  const model = createLandmarkDeck([deck, landmark], grid, [deck, landmark])!;
  model.group.updateMatrixWorld(true);
  const paint = new Color('#dcd8cc');
  const off: number[][] = [];
  let lines = 0;
  model.group.traverse(o => {
    const g = (o as Mesh).geometry;
    if (!g) return;
    const p = g.getAttribute('position'), c = g.getAttribute('color');
    for (let i = 0; i < p.count; i++) {
      if (Math.abs(c.getX(i) - paint.r) + Math.abs(c.getY(i) - paint.g) + Math.abs(c.getZ(i) - paint.b) > .002) continue;
      lines++;
      const v = new Vector3().fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
      if (!pointInRing(v.x, v.z, deck.rings[0])) off.push([v.x, v.z]);
    }
  });
  expect(lines).toBeGreaterThan(0);
  expect(off).toEqual([]);
});

it('hands the terrain a cut under its whole outline, below everything it draws there', () => {
  const model = createLandmarkDeck([deck, landmark], grid, [deck, landmark])!;
  model.group.updateMatrixWorld(true);
  const cuts = model.yields.map(q => ({ planes: yieldPlanes(q), floor: q.floor }));
  // Every metre inside the outline, including (937, -717) where drawn ground rose through the lot.
  const xs = deck.rings[0].map(p => p[0]), zs = deck.rings[0].map(p => p[1]);
  let checked = 0;
  for (let x = Math.ceil(Math.min(...xs)) + .3; x < Math.max(...xs); x++) for (let z = Math.ceil(Math.min(...zs)) + .3; z < Math.max(...zs); z++) {
    if (!pointInRing(x, z, deck.rings[0])) continue;
    const cut = cuts.find(q => footprintContains(q.planes, x, z, .03));
    expect(cut, `${x},${z}`).toBeDefined();
    const hit = new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0];
    expect(cut!.floor(x, z)).toBeLessThan(hit.point.y);
    checked++;
  }
  expect(checked).toBeGreaterThan(1500);
});

