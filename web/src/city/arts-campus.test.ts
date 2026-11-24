import { expect, it } from 'vitest';
import { Box3, BufferGeometry, Mesh, Raycaster, Vector3 } from 'three';
import { readFileSync } from 'node:fs';
import type { VBuilding } from '../vignette/world';
import { Builder, pointInRing } from '../vignette/geom';
import { createArtsCampusLandmark } from './arts-campus';
import { entryRamp, siflyPiazza, type RampSpec } from './midtown-culture-high';
import { loadingDock, precastWall } from './midtown-culture-woodruff';
import sites from './fixtures/arts-campus.json';

const archive = new URL('../../../pipeline/prototypes/square-board/midtown-upper/context.json', import.meta.url);
const buildings: VBuilding[] = JSON.parse(readFileSync(archive, 'utf8')).buildings;
const museum = buildings.find((b) => b.id === sites.museum.id)!;

const spec: RampSpec = {
  foot: [40, 0],
  head: [0, 0],
  stairTop: [0, 2.2],
  stairFoot: [12, 2.2],
  width: 2.6,
};

function bounds(b: Builder) {
  return new Box3().setFromObject(new Mesh(b.geometry() as BufferGeometry));
}

it('climbs from the sidewalk to the entry terrace and steps back down to the lawn', () => {
  const body = new Builder();
  // The lawn sits 6 m below the terrace, like the 3DEP reading at Peachtree.
  expect(entryRamp(body, spec, 2.3, () => -3.7)).toBe(true);
  const box = bounds(body);
  // Parapets reach below the sidewalk; rails stand about 1.1 m over the terrace.
  expect(box.min.y).toBeLessThan(-3.7);
  expect(box.max.y).toBeGreaterThan(2.3 + 1);
  expect(box.max.y).toBeLessThan(2.3 + 1.3);
});

it('skips the ramp, not the museum, when its ground is missing', () => {
  expect(entryRamp(new Builder(), spec, 2.3, () => null)).toBe(false);
  const full = createArtsCampusLandmark(buildings, museum, 290, () => 294.1)!;
  // Ground exists at the piazza entrance but not out at the Peachtree foot (x 625).
  const clipped = createArtsCampusLandmark(buildings, museum, 290, (x) => (x > 620 ? null : 294.1))!;
  expect(clipped).not.toBeNull();
  // The ramp is the only geometry east of the 588 m footprint edge.
  expect(new Box3().setFromObject(full.group.children[0], true).max.x).toBeGreaterThan(620);
  expect(new Box3().setFromObject(clipped.group.children[0], true).max.x).toBeLessThan(600);
});

it('keeps the mapped ramp outside the museum footprint, rising toward it from Peachtree', () => {
  const { foot, head } = sites.museum.ramp;
  const ring = museum.rings[0];
  for (let t = 0; t <= 1; t += 0.05)
    expect(pointInRing(foot[0] + (head[0] - foot[0]) * t, foot[1] + (head[1] - foot[1]) * t, ring)).toBe(false);
  // The foot is nearer Peachtree (east) than the head, and the run is about 48 m.
  expect(foot[0]).toBeGreaterThan(head[0]);
  expect(Math.hypot(foot[0] - head[0], foot[1] - head[1])).toBeCloseTo(48.4, 0);
});

const piazza = (lawn: [number, number][]) => ({
  plan: sites.museum.piazza.plan as [number, number][],
  lawn,
  stair: sites.museum.piazza.stair as [[number, number], [number, number]],
  tables: [],
  benches: [],
});
const count = (b: Builder) => (b.geometry() as BufferGeometry).getAttribute('position').count;

/** Whether a slab triangle at height y covers local (u, v). */
function covers(b: Builder, u: number, v: number, y: number) {
  const pos = (b.geometry() as BufferGeometry).getAttribute('position');
  for (let i = 0; i < pos.count; i += 3) {
    const t = [0, 1, 2].map((k) => [pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k)]);
    if (t.some((p) => Math.abs(p[1] - y) > 0.005)) continue;
    const d = (a: number[], c: number[]) => (u - c[0]) * (a[2] - c[2]) - (a[0] - c[0]) * (v - c[2]);
    const [d1, d2, d3] = [d(t[0], t[1]), d(t[1], t[2]), d(t[2], t[0])];
    if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) return true;
  }
  return false;
}

it('paves up to the mapped lawn curb but not across the lawn', () => {
  const b = new Builder();
  siflyPiazza(b, piazza(sites.museum.piazza.lawn as [number, number][]), () => 0);
  // Inside the lawn: no slab. Just outside each curb: slab, with no bare strip.
  for (const [u, v] of [
    [0, 5],
    [5, 20],
    [-5, 12],
  ])
    expect(covers(b, u, v, 0.06)).toBe(false);
  for (const [u, v] of [
    [-10.4, 5],
    [0, -4.4],
    [-1.4, 18],
    [5, 23],
  ])
    expect(covers(b, u, v, 0.06)).toBe(true);
});

it('draws the north stair only where the ground falls', () => {
  const flat = new Builder(),
    falling = new Builder();
  siflyPiazza(flat, piazza(sites.museum.piazza.lawn as [number, number][]), () => 0);
  // 3DEP falls about 3 m down the passage north of the piazza (v < -9).
  siflyPiazza(falling, piazza(sites.museum.piazza.lawn as [number, number][]), (_u, v) => (v < -15 ? -3 : 0));
  expect(count(falling)).toBeGreaterThan(count(flat));
});

it('gives the Memorial rear volumes a precast skin, and keeps the fly tower plain above the hall', () => {
  const finned = new Builder(),
    plain = new Builder(),
    lit = new Builder();
  precastWall(finned, lit, [0, 0], [42, 0], [0, -1], 1.5, 20);
  precastWall(plain, lit, [0, 0], [42, 0], [0, -1], 1.5, 20, { fins: false });
  // Ten 4.2 m bays: nine fins of three faces replace nine single joints (12 more quads).
  expect(count(finned) - count(plain)).toBe(9 * 2 * 6);
  // A zero-length wall or zero joint spacing draws nothing and does not hang.
  const none = new Builder();
  precastWall(none, lit, [0, 0], [0, 0], [0, -1], 0, 10);
  precastWall(none, lit, [0, 0], [5, 0], [0, -1], 0, 10, { joints: 0, fins: false, slots: false });
  expect(count(none)).toBe(18);
  // One lit slot window per three slot bays.
  expect(count(lit)).toBeGreaterThan(0);
  const memorial = buildings.find((b) => b.id === sites.memorial.id)!;
  expect(createArtsCampusLandmark(buildings, memorial, 290, () => 294.1)).not.toBeNull();
});

it('decks the entry notch at the ramp head at the 2.3 m entry level', () => {
  const model = createArtsCampusLandmark(buildings, museum, 290, () => 287)!;
  model.group.updateMatrixWorld(true);
  // The ramp head's notch, between the atrium drum and the two entry volumes.
  const c = 0.878,
    s = -0.479,
    u = 30,
    v = -13;
  const x = 550 + u * c - v * s,
    z = -3990 + u * s + v * c;
  const ray = new Raycaster(new Vector3(x, 400, z), new Vector3(0, -1, 0));
  const hit = ray.intersectObject(model.group, true)[0];
  // Entry grade is 287 here, so the deck should sit 2.36 m above it.
  expect(hit.point.y).toBeCloseTo(287 + 2.36, 1);
});

it('lays the Peachtree lawn beside the museum, low within the ginkgo crown', () => {
  const model = createArtsCampusLandmark(buildings, museum, 290, () => -32)!;
  const lawn = model.group.children.find((o) => o.name === 'landscape') as Mesh;
  expect(lawn).toBeDefined();
  const pos = (lawn.geometry as BufferGeometry).getAttribute('position');
  const [tx, tz] = sites.museum.lawn.ginkgo;
  let near = 0;
  for (let i = 0; i < pos.count; i++) {
    if (Math.hypot(pos.getX(i) - tx, pos.getZ(i) - tz) > 9) continue;
    near++;
    // Under the 9 m crown nothing stands more than 1.5 m above the lawn.
    expect(pos.getY(i)).toBeLessThan(-32 + 1.5);
  }
  expect(near).toBeGreaterThan(0);
  // The granite steps reach out to the Peachtree sidewalk.
  expect(new Box3().setFromObject(lawn, true).max.x).toBeGreaterThan(632);
});

it('turfs the mapped Peachtree lawn but not the ginkgo mound, the steps or the Rodin pad', () => {
  const model = createArtsCampusLandmark(buildings, museum, 290, () => -32)!;
  model.group.updateMatrixWorld(true);
  const turf = model.group.children[2] as Mesh;
  const hit = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 100, z), new Vector3(0, -1, 0)).intersectObject(turf, false).length > 0;
  expect(hit(595, -3990)).toBe(true); // open lawn west of the mound
  expect(hit(620, -4004)).toBe(true); // lawn between the mound and Peachtree
  expect(hit(612.5, -4001.2)).toBe(false); // ginkgo mound
  expect(hit(626.5, -3991.7)).toBe(false); // Peachtree steps
  expect(hit(604.8, -3999.7)).toBe(false); // Rodin pad, the lawn's own notch
});

it('draws the Arts Center Way loading dock up to the podium top, with dark bays and lamps over them', () => {
  const body = new Builder(),
    lit = new Builder();
  // A street 5 m below the shell datum, as at Arts Center Way, and a 2.4 m podium top.
  loadingDock(
    body,
    lit,
    [0, 0],
    [42, 0],
    [0, -1],
    () => -5,
    [
      [12, 5],
      [18.4, 5],
    ],
    6.2,
    2.4,
  );
  const box = new Box3().setFromObject(new Mesh(body.geometry() as BufferGeometry), true);
  expect(box.max.y).toBeCloseTo(2.4, 5);
  expect(box.min.y).toBeCloseTo(-5.1, 5);
  // Only the two lamps glow; the bays stay dark at night.
  expect(count(lit)).toBe(2 * 6);
});

it('gives the 15th Street face a ground loggia and balconied windows', () => {
  const plain = new Builder(),
    rich = new Builder(),
    lit = new Builder();
  const opts = { bay: 1.4, finWidth: 0.35, finDepth: 0.3, slots: false };
  precastWall(plain, lit, [0, 0], [65, 0], [0, 1], 1.5, 20, opts);
  precastWall(rich, lit, [0, 0], [65, 0], [0, 1], 1.5, 20, { ...opts, loggia: 4.5, balconies: 12.5 });
  expect(count(rich)).toBeGreaterThan(count(plain) + 20 * 6);
});

it('rings the café tables with grove trees clear of the tables and inside the aerial canopy', async () => {
  const { SIFLY_GROVE, siflyGrove } = await import('./arts-campus');
  const tables = sites.museum.piazza.tables as [number, number][];
  for (const [u, v] of SIFLY_GROVE) {
    expect(Math.min(...tables.map(([tu, tv]) => Math.hypot(u - tu, v - tv)))).toBeGreaterThanOrEqual(2.5);
    expect(u).toBeGreaterThanOrEqual(-51);
    expect(u).toBeLessThanOrEqual(-28);
    expect(v).toBeGreaterThanOrEqual(16);
    expect(v).toBeLessThanOrEqual(30);
  }
  const spots = siflyGrove(() => 290);
  expect(spots).toHaveLength(SIFLY_GROVE.length);
  for (const s of spots) expect(s).toMatchObject({ y: 290, heightM: 8, spreadM: 5 });
  // Off the board, no tree.
  expect(siflyGrove(() => null)).toEqual([]);
});
