import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import register from '../../../pipeline/prototypes/connector-footprint/ramp-register.json';
import survey from '../../../pipeline/prototypes/connector-footprint/ramp-decks.json';
import { auburnGround, auburnTransport } from '../city/sweet-auburn-transport';
import type { P2 } from '../vignette/geom';
import { GroundGrid } from './grid';
import { applyRampDecks } from './ramp-decks';
import { GroundSurface } from './surface';
import { bridgeApproaches } from './bridge-approaches';
import { streetPortals } from './street-bridges';
import { createSurfaceTransport } from './transport';
import type { TerrainCity, TransportRun } from './transport-data';

const board = new URL('../../../pipeline/prototypes/square-board/north-corner/', import.meta.url);
const context = (): TerrainCity => JSON.parse(readFileSync(new URL('context.json', board), 'utf8'));
const way = (id: number) => survey.ways.find(w => w.way === id)!;
const same = (a: P2, b: number[]) => a[0] === b[0] && a[1] === b[1];
const decksOn = (runs: TransportRun[], id: number) => {
  const pts = way(id).pts;
  return runs.filter(r => r.deckNavd88M && r.pts.every(p => pts.some((q, k) => k && segment(p, pts[k-1], q) < .05)));
};
function segment(p: P2, a: number[], b: number[]) {
  const dx = b[0]-a[0], dz = b[1]-a[1], t = Math.max(0, Math.min(1, ((p[0]-a[0])*dx + (p[1]-a[1])*dz) / (dx*dx + dz*dz)));
  return Math.hypot(p[0]-a[0]-t*dx, p[1]-a[1]-t*dz);
}
const heightAt = (runs: TransportRun[], p: number[]) => runs.flatMap(r => r.pts.flatMap((q, k) => same(q, p) ? [r.deckNavd88M![k]] : []));

it('profiles the Baker flyovers on north-corner and joins them flush', () => {
  const runs = auburnTransport(context()).terrainTransport!.roads;
  for (const id of [38974028, 38974034, 1450884828, 1450884829, 38974031, 39169033]) {
    const decks = decksOn(runs, id);
    expect(decks.length, `way ${id}`).toBeGreaterThan(0);
    for (const d of decks) {
      // No sliver pieces: a centimetre-rounded span end on a vertex is that vertex.
      for (let k = 1; k < d.pts.length; k++) expect(Math.hypot(d.pts[k][0]-d.pts[k-1][0], d.pts[k][1]-d.pts[k-1][1])).toBeGreaterThan(.05);
    }
  }
  // The phase-1 step: 38974034 into 1450884828 met 0.29-0.31 m apart. Every shared
  // vertex of the Baker chain now carries one height.
  for (const p of [[1041.09, -773.05], [1048.08, -766.59], [1053.98, -773.57], [1047.01, -780.13]]) {
    const h = heightAt(runs, p);
    expect(h.length, `${p}`).toBeGreaterThan(1);
    expect(Math.max(...h) - Math.min(...h)).toBeLessThan(.002);
  }
  // The SB and NB ends tie to the terrain: deck weight 0 at the tie vertex only.
  const tie = decksOn(runs, 38974031).find(r => r.deckWeight)!;
  expect(tie.deckWeight!.at(-1)).toBe(0);
  expect(tie.deckWeight!.slice(0, -1).every(w => w === 1)).toBe(true);
});

it('meets the downtown half of 38974028 at the x = 1000 seam at one height', () => {
  const north = auburnTransport(context()).terrainTransport!.roads;
  // Downtown's baked run starts where north-corner clips the way.
  const seam: P2 = [1000, -802.35];
  const pts = way(38974028).pts.filter(([x]) => x < 1000) as P2[];
  const downtown = { roads: [], terrainTransport: { version: 1, rail: [], roads: [{ kind: 'bridge', cls: 'motorway', pts: [seam, ...pts] }] } } as unknown as TerrainCity;
  applyRampDecks(downtown);
  const south = downtown.terrainTransport!.roads;
  expect(same(south[0].pts[0], seam) && same(south.at(-1)!.pts.at(-1)!, pts.at(-1)!)).toBe(true);
  const [a] = heightAt(north, seam), [b] = heightAt(south, seam);
  expect(Math.abs(a - b)).toBeLessThan(.002);
  // Already-surveyed runs keep their own profile.
  const surveyed = { roads: [], terrainTransport: { version: 1, rail: [], roads: [{ ...south[0], deckNavd88M: south[0].pts.map(() => 1) }] } } as unknown as TerrainCity;
  expect(applyRampDecks(surveyed).terrainTransport!.roads[0].deckNavd88M!.every(h => h === 1)).toBe(true);
});

it.each(['low', 'high'] as const)('draws the Baker flyover treads on their own measured surface on %s', quality => {
  const manifest = JSON.parse(readFileSync(new URL('ground.json', board), 'utf8'));
  const grid = new GroundGrid(manifest, Uint8Array.from(readFileSync(new URL('ground.i16', board))).buffer);
  const ground = new GroundSurface(grid, quality);
  const city = auburnTransport(context());
  const decks = createSurfaceTransport(city, grid, ground.sampleScene.bind(ground));
  const zero = manifest.vertical.sceneZeroNavd88M;
  const runs = city.terrainTransport!.roads;
  try {
    let checked = 0;
    for (const id of [38974028, 38974034, 1450884828, 1450884829]) {
      const pts = way(id).pts;
      const own = register.ways.find(w => w.way === id)!.stations;
      for (const station of own) {
        if (station.own == null) continue;
        // The register's stations are metres along the full way.
        let run = 0, at: P2 | null = null;
        for (let k = 1; k < pts.length && !at; k++) {
          const l = Math.hypot(pts[k][0]-pts[k-1][0], pts[k][1]-pts[k-1][1]);
          if (station.s <= run + l) { const t = (station.s - run) / l; at = [pts[k-1][0] + t*(pts[k][0]-pts[k-1][0]), pts[k-1][1] + t*(pts[k][1]-pts[k-1][1])]; }
          run += l;
        }
        if (!at || at[0] < 1000) continue;
        const hits = decksOn(runs, id).map(r => decks.deckAt(at![0], at![1], r)).filter((h): h is number => h !== null);
        if (!hits.length) continue;
        // Tread is the profile plus the deck lift; within 0.3 m of the measured own level.
        expect(Math.abs(Math.max(...hits) + zero - .12 - station.own), `${id} at ${station.s}`).toBeLessThan(.3);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(20);
    // Both carriageways cross the x = 1000 seam obliquely. Their end rows lie on
    // the seam, so the tread reaches it across the slab: a perpendicular end row
    // clamped to the board left a 0.3 m wedge on this side.
    for (const [id, z] of [[38974028, -802.35], [38974034, -793.96]] as const) {
      for (const dz of [-1.2, 0, 1.2]) {
        const hits = decksOn(runs, id).map(r => decks.deckAt(1000.05, z + dz, r)).filter(h => h !== null);
        expect(hits.length, `${id} at z ${z + dz}`).toBeGreaterThan(0);
      }
    }
  } finally { decks.dispose(); ground.geometry.dispose(); }
});

it('keeps the Baker exit off the junction deck', () => {
  // From about 75 m the Baker junction deck (junction-decks.json) draws 38974051's
  // own approach; a ramp span there doubled it 1-12 cm under its surface.
  expect(way(38974051).spans.every(sp => sp.at(-1)![0] < 80)).toBe(true);
});

it('stacks 38974058 under 38970413 with clearance, and meets Sweet Auburn at z = -520', () => {
  const runs = auburnTransport(context()).terrainTransport!.roads;
  // The climb's joints: 9235707 into 38974058, 38974058 onto 38974043's fill.
  for (const p of [[1055.72, -604.16], [1229.87, -653.3]]) {
    const h = heightAt(runs, p);
    expect(h.length, `${p}`).toBeGreaterThan(1);
    expect(Math.max(...h) - Math.min(...h)).toBeLessThan(.002);
  }
  // 38970413's north-corner half ends on the seam at the height Sweet Auburn surveyed.
  const [seam] = heightAt(runs, [1111.89, -520]);
  expect(Math.abs(seam - 314.9)).toBeLessThan(.002);
});

it.each(['low', 'high'] as const)('clears the three-level stack on %s', quality => {
  const manifest = JSON.parse(readFileSync(new URL('ground.json', board), 'utf8'));
  const grid = new GroundGrid(manifest, Uint8Array.from(readFileSync(new URL('ground.i16', board))).buffer);
  const ground = new GroundSurface(grid, quality);
  const city = auburnTransport(context());
  const decks = createSurfaceTransport(city, grid, ground.sampleScene.bind(ground));
  const runs = city.terrainTransport!.roads;
  const top = (id: number, x: number, z: number) => Math.max(...decksOn(runs, id).map(r => decks.deckAt(x, z, r)).filter((h): h is number => h !== null));
  try {
    // At (1115.8, -591.0) the 38970413 flyover drew 7.6 m low, 1.0 m over 38974058
    // once that climbed to its measured level. Tread to tread less the 0.95 m slab
    // leaves at least 4.5 m; the mainline passes about 10 m under 38974058.
    expect(top(38970413, 1115.8, -591) - top(38974058, 1115.8, -591) - .95).toBeGreaterThan(4.5);
  } finally { decks.dispose(); ground.geometry.dispose(); }
});

it('draws the MLK SB ramp tree as one deck across its ways, onto the MLK west approach', () => {
  const ways = JSON.parse(readFileSync(new URL('../../../pipeline/prototypes/connector-footprint/ways.json', import.meta.url), 'utf8'));
  const pts = (...ids: number[]) => ids.flatMap((id, k) => (k ? ways[id].pts.slice(1) : ways[id].pts)) as P2[];
  // Downtown merges 9236952, 436808889 and 755543582 into one ground road with
  // no baked run; the bridge-tagged link's ground run spans 755543580 and 755543583.
  const climb = { cls: 'motorway', sub: 'link', bridge: false, pts: pts(9236952, 436808889, 755543582) };
  const link = { kind: 'ground', cls: 'motorway', sub: 'link', pts: pts(755543580, 755543583) };
  const city = { roads: [climb], terrainTransport: { version: 1, rail: [], roads: [link] } } as unknown as TerrainCity;
  applyRampDecks(city);
  // The spanned pieces become structure; 9236952 before the tie stays a board road.
  expect(city.roads.some(r => r.bridge)).toBe(true);
  expect(city.roads[0].bridge).toBe(false);
  const runs = city.terrainTransport!.roads;
  // One deck from the 436808889 tie through the 755543582 joint: no break there.
  const joint = [593.93, 576.07];
  const climbing = runs.filter(r => r.deckNavd88M && r.pts.some(p => same(p, joint)));
  expect(climbing.length).toBe(1);
  expect(climbing[0].deckWeight![0]).toBe(0);
  // 755543580 eases onto the approach and runs 2.5 m under it: tread 313.07 m,
  // under the approach's lowest point across the ramp (313.111 m).
  const top = runs.find(r => r.deckNavd88M && same(r.pts[0], [561.1, 584.44]))!;
  expect(Math.abs(top.deckNavd88M!.at(-1)! + .12 - 313.07)).toBeLessThan(.02);
  // Past 2.5 m along 755543583 the approach owns the pavement: the rest stays a plain run.
  const end = runs.find(r => same(r.pts.at(-1)!, [551.31, 601.54]))!;
  expect(end.deckNavd88M).toBeUndefined();
});

it.each(['low', 'high'] as const)('carries 38974038 from 9239459\'s fill on %s, across its full width', quality => {
  // Phase 1: 38974038 started 6.86 m in the air because 1450884836 before it was
  // drawn on the ground. OSM adds 38974038's second lane at the joint, so the new
  // deck widens to it rather than leaving that lane's slab end over open air.
  const auburn = new URL('../../../pipeline/prototypes/sweet-auburn/', import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL('ground/ground.json', auburn), 'utf8'));
  const grid = auburnGround(manifest, Uint8Array.from(readFileSync(new URL('ground/ground.i16', auburn))).buffer);
  const ground = new GroundSurface(grid, quality);
  const city = auburnTransport(JSON.parse(readFileSync(new URL('context.json', auburn), 'utf8')));
  const decks = createSurfaceTransport(city, grid, ground.sampleScene.bind(ground));
  const runs = city.terrainTransport!.roads, zero = manifest.vertical.sceneZeroNavd88M;
  try {
    const joint: P2 = [1045.81, -497.53];
    const ramp = runs.find(r => r.deckNavd88M && same(r.pts.at(-1)!, joint))!;
    const flyover = runs.find(r => r.deckNavd88M && same(r.pts[0], joint))!;
    expect(ramp.widenInto).toBeDefined();
    expect(Math.abs(ramp.deckNavd88M!.at(-1)! - flyover.deckNavd88M![0])).toBeLessThan(.002);
    const [a, b] = [ramp.pts.at(-2)!, joint], l = Math.hypot(b[0]-a[0], b[1]-a[1]);
    const [tx, tz] = [(b[0]-a[0])/l, (b[1]-a[1])/l];
    for (const off of [-3, -1.5, 0, 1.5, 3]) {
      const before = decks.deckAt(joint[0] - .2*tx - off*tz, joint[1] - .2*tz + off*tx, ramp);
      const after = decks.deckAt(joint[0] + .2*tx - off*tz, joint[1] + .2*tz + off*tx, flyover);
      expect(before, `ramp at ${off} m`).not.toBeNull();
      expect(after, `flyover at ${off} m`).not.toBeNull();
      expect(Math.abs(before! - after!), `step at ${off} m`).toBeLessThan(.01);
    }
    // The start ties to the fill: tread on the drawn terrain plus the deck lift.
    expect(Math.abs(ramp.deckNavd88M![0] - zero - ground.sampleScene(...ramp.pts[0])!)).toBeLessThan(.25);
  } finally { decks.dispose(); ground.geometry.dispose(); }
});

it('keeps the MLK ramp under the MLK west approach across its whole width', () => {
  // The approach falls across its width, so a ramp pinned under it on the
  // centreline still cut its lower edge by up to 8 cm (Grok, step 3). Sample the
  // ramp's footprint where it runs under the approach. Built from committed
  // sources only (the downtown grid, ways.json, street-bridges.json), so it runs
  // in a fresh checkout without pnpm data.
  const downtown = new URL('../../../pipeline/prototypes/downtown-ground/', import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL('ground.json', downtown), 'utf8'));
  const grid = new GroundGrid(manifest, Uint8Array.from(readFileSync(new URL('ground.i16', downtown))).buffer);
  const ways = JSON.parse(readFileSync(new URL('../../../pipeline/prototypes/connector-footprint/ways.json', import.meta.url), 'utf8'));
  const bridges = JSON.parse(readFileSync(new URL('../../../pipeline/prototypes/connector-footprint/street-bridges.json', import.meta.url), 'utf8'));
  const mlk = bridges.find((d: { outline: number }) => d.outline === 1278959968);
  const pts = (...ids: number[]) => ids.flatMap((id, k) => (k ? ways[id].pts.slice(1) : ways[id].pts)) as P2[];
  const { minX, maxX, minZ, maxZ } = manifest.bounds;
  const city = applyRampDecks({
    bounds: { minX, maxX, minZ, maxZ }, buildings: [],
    roads: [
      { cls: 'motorway', sub: 'link', bridge: false, pts: pts(9236952, 436808889, 755543582) },
      { cls: 'motorway', sub: 'link', bridge: true, pts: [...pts(755543580, 755543583), [549.77, 605.77]] },
    ],
    terrainTransport: { version: 1, rail: [], roads: [
      { kind: 'ground', cls: 'motorway', sub: 'link', pts: pts(755543580, 755543583) },
      ...mlk.roads.map((r: P2[]) => ({ kind: 'bridge', cls: 'secondary', name: mlk.name, pts: r })),
    ] },
  } as unknown as TerrainCity);
  const ground = new GroundSurface(grid, 'high');
  const bare = (x: number, z: number) => ground.sampleScene(x, z);
  const approaches = bridgeApproaches(streetPortals(city), manifest.vertical.sceneZeroNavd88M, bare, city.bounds, city.roads)!;
  const decks = createSurfaceTransport(city, grid, (x, z, r) => approaches.groundAt(x, z, r as never));
  const ramp = city.terrainTransport!.roads.filter(r => r.deckNavd88M && r.pts.some(p => Math.hypot(p[0] - 554.34, p[1] - 593.76) < 3.5));
  try {
    expect(ramp.length).toBeGreaterThan(0);
    const [a, joint, e] = [[561.1, 584.44], [554.34, 593.76], [551.31, 601.54]];
    let covered = 0;
    for (let s = -3; s <= 2.6; s += .2) {
      const [p, q] = s < 0 ? [a, joint] : [joint, e], l = Math.hypot(q[0]-p[0], q[1]-p[1]);
      const [tx, tz] = [(q[0]-p[0])/l, (q[1]-p[1])/l];
      for (let off = -2.6; off <= 2.6; off += .2) {
        const x = joint[0] + s*tx - off*tz, z = joint[1] + s*tz + off*tx;
        const h = approaches.groundAt(x, z), b = bare(x, z);
        if (h == null || b == null || h < b + .5) continue;
        const treads = ramp.map(r => decks.deckAt(x, z, r)).filter((v): v is number => v != null);
        if (!treads.length) continue;
        covered++;
        expect(Math.max(...treads) - h, `tread over the approach at ${x.toFixed(2)}, ${z.toFixed(2)}`).toBeLessThan(-.02);
      }
    }
    expect(covered).toBeGreaterThan(40);
  } finally { decks.dispose(); ground.geometry.dispose(); }
});

it('keeps the unspanned part of a sliced board ramp on the board (release 18 ellis-high)', () => {
  // 39169033 runs from the z = -520 seam down to the Baker flyovers; only its south end
  // is a surveyed span. The rest drew as its own run on bare ground, 2-5 m over the
  // drawn cut, and ended under the flyover in mid-air.
  const city = auburnTransport(context());
  const runs = city.terrainTransport!.roads;
  const onRamp = (pts: P2[]) => pts.every(p => way(39169033).pts.some((q, k) => k && segment(p, way(39169033).pts[k-1], q) < .05));
  expect(runs.filter(r => r.kind === 'ground' && r.cls === 'motorway' && onRamp(r.pts as P2[]))).toEqual([]);
  // The piece through (1125, -686), under the flyover, stays an ordinary board road; the
  // spanned south end at the Baker flyovers is structure.
  const through = (p: P2) => city.roads.filter(r => r.cls === 'motorway' && r.pts.some((q, k) => k && segment(p, r.pts[k-1], q) < 5));
  expect(through([1125, -686]).map(r => r.bridge)).toEqual([false]);
  expect(through([1065, -760]).some(r => r.bridge)).toBe(true);
});
