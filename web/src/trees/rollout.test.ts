import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lonLatToScene } from '../core/places';
import { MIX, crownKey, genericPlan, planRollout, tierPlan, type Crown } from './rollout';
import { treeMode } from './rollout-city';

const scene = new URL('../../public/data/scene/square-board/', import.meta.url);
const places = new URL('../../public/data/ga/neighborhoods.json', import.meta.url);
const staged = existsSync(new URL('brookwood-south/context.json', scene)) && existsSync(places);
const ROWS = ['midtown-south', 'midtown-central', 'midtown-upper', 'brookwood-south', 'brookwood-station', 'north-band', 'north-corner', 'south-band', 'south-corner'];

function ansley() {
  const nb = JSON.parse(readFileSync(places, 'utf8'));
  const ring: number[][] = nb.features.find((f: { properties: { name: string } }) => f.properties.name === 'Ansley Park').geometry.coordinates[0]
    .map(([lon, lat]: number[]) => lonLatToScene({ lon: -84.3916, lat: 33.7539 }, lon, lat));
  return (x: number, z: number) => {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
      if ((ring[i][1] > z) !== (ring[j][1] > z) && x < (ring[j][0] - ring[i][0]) * (z - ring[i][1]) / (ring[j][1] - ring[i][1]) + ring[i][0]) c = !c;
    return c;
  };
}
function plan(row: string, tier: 'high' | 'low', roundTwo = false) {
  const c = JSON.parse(readFileSync(new URL(`${row}/context.json`, scene), 'utf8'));
  const crowns: Crown[] = tier === 'high' ? c.trees : c.trees.slice(0, c.treeLowCount);
  // Planned once from the full list, then cut to the tier, as City does.
  const low: Crown[] = c.trees.slice(0, c.treeLowCount);
  const full = planRollout({ roundTwo: roundTwo ? { id: row, eligible: new Set(low.map(([x,z]) => crownKey(x,z))) } : undefined, crowns: c.trees, roads: c.roads, ground: c.ground, buildings: c.buildings.map((b: { rings: number[][][] }) => b.rings[0]), bounds: c.bounds, inAnsley: ansley() });
  return { crowns, p: tierPlan(full, crowns) };
}

describe('tree rollout plan', () => {
  it('only uses the four rolled-out species, and the street mix only crape myrtle', () => {
    expect(Object.keys(MIX.street)).toEqual(['crape-myrtle']);
    expect(Object.keys(MIX.park).sort()).toEqual(['loblolly-pine', 'sweetgum']);
  });

  it.skipIf(!staged)('shares at most 300 round-two trees including the Beverly specimen between tiers', () => {
    const counts = new Map<string, number>();
    const first = new Set(['crape-myrtle', 'japanese-maple', 'sweetgum', 'loblolly-pine']);
    for (const row of ROWS) {
      const low = plan(row, 'low', true).p.species.filter(s => !first.has(s.species));
      const highPlan = plan(row, 'high', true).p;
      const high = highPlan.species.filter(s => !first.has(s.species));
      for (const tree of high) expect(highPlan.enlarged.has(crownKey(tree.x, tree.z))).toBe(false);
      expect(low).toEqual(high);
      for (const s of low) counts.set(s.species, (counts.get(s.species) ?? 0) + 1);
      if (row === 'brookwood-south') {
        const island = low.filter(s => Math.hypot(s.x - 1306, s.z + 4827) < 4);
        expect(island).toHaveLength(1);
        expect(island[0]).toMatchObject({ species: 'american-elm', size: 'specimen', carpet: false });
      }
    }
    expect(counts.size).toBe(6);
    expect([...counts.values()].reduce((a,b) => a+b, 0)).toBeLessThanOrEqual(300);
  });

  it.skipIf(!staged)('gives a crown the same species at both tiers', () => {
    for (const row of ROWS) {
      const hi = new Map(plan(row, 'high').p.species.map(s => [crownKey(s.x, s.z), s.species]));
      for (const s of plan(row, 'low').p.species) if (hi.has(crownKey(s.x, s.z))) expect(hi.get(crownKey(s.x, s.z))).toBe(s.species);
    }
  });

  it.skipIf(!staged)('never puts a loblolly, sweetgum or Japanese maple on a street strip', () => {
    for (const row of ROWS) {
      const { p } = plan(row, 'high');
      for (const s of p.species) {
        const ctx = p.context.get(crownKey(s.x, s.z));
        if (ctx === undefined) continue; // an island planting
        if (ctx === 'street') expect(s.species).toBe('crape-myrtle');
      }
    }
  });

  it.skipIf(!staged)('keeps each species within the crown sizes it can take, and close to its share', () => {
    let yard = 0, maples = 0;
    for (const row of ROWS) {
      const { p } = plan(row, 'high');
      for (const s of p.species) {
        if (s.species === 'crape-myrtle') expect(s.heightM).toBeLessThanOrEqual(10);
        if (s.species === 'japanese-maple') expect(s.heightM).toBeLessThanOrEqual(9);
        if (s.species === 'loblolly-pine' && p.context.has(crownKey(s.x, s.z))) expect(s.heightM).toBeGreaterThanOrEqual(9);
      }
      for (const [k, c] of p.context) if (c === 'yard') { yard++; if (p.species.some(s => crownKey(s.x, s.z) === k && s.species === 'japanese-maple')) maples++; }
    }
    // At most the mix share (4% in Midtown, 8% in Ansley), less where crowns are too big for a maple.
    expect(maples / yard).toBeGreaterThan(0.01);
    expect(maples / yard).toBeLessThan(0.08);
  });

  it.skipIf(!staged)('sizes up and pairs generic crowns only inside Ansley Park', () => {
    const inA = ansley();
    let enlarged = 0, pairs = 0;
    for (const row of ROWS) {
      const { p } = plan(row, 'high');
      for (const k of p.enlarged.keys()) { const [x, z] = k.split(',').map(n => Number(n) / 10); expect(inA(x, z)).toBe(true); enlarged++; }
      for (const { crown: [x, z, h], from } of p.added) { expect(inA(x, z)).toBe(true); expect(h).toBeGreaterThan(0); if (from) pairs++; }
    }
    expect(enlarged).toBeGreaterThan(500);
    expect(pairs).toBeGreaterThan(20);
  });

  it.skipIf(!staged)('plants the round Beverly Road island with one large hardwood at its centre', () => {
    const { p } = plan('brookwood-south', 'high');
    const centre = p.added.filter(({ crown: [x, z] }) => Math.hypot(x - 1306, z + 4827) < 4);
    expect(centre).toHaveLength(1);
    expect(centre[0].crown[2]).toBeGreaterThanOrEqual(20);
    expect(p.enlarged.get(crownKey(centre[0].crown[0], centre[0].crown[1]))).toBeTruthy();
  });

  it.skipIf(!staged)('plants the smaller Ansley islands with Japanese maples and crape myrtles', () => {
    const { p } = plan('midtown-upper', 'high');
    const island = p.species.filter(s => !p.context.has(crownKey(s.x, s.z)));
    expect(island.length).toBeGreaterThanOrEqual(3);
    for (const s of island) expect(['japanese-maple', 'crape-myrtle']).toContain(s.species);
  });

  it.skipIf(!staged)('adds a facing pair at low detail only where its source crown is drawn there too', () => {
    for (const row of ['midtown-upper', 'brookwood-south', 'brookwood-station']) {
      const lo = plan(row, 'low'), hi = plan(row, 'high');
      const loKeys = new Set(lo.crowns.map(([x, z]) => crownKey(x, z)));
      const hiAdded = new Set(hi.p.added.map(a => crownKey(a.crown[0], a.crown[1])));
      for (const a of lo.p.added) {
        expect(hiAdded.has(crownKey(a.crown[0], a.crown[1]))).toBe(true);
        if (a.from) expect(loKeys.has(a.from)).toBe(true);
      }
    }
  });

  it('never takes a grass verge along one street for an island', () => {
    const road = { cls: 'residential', name: 'Verge St', bridge: false, tunnel: false, pts: [[0, 0], [200, 0]] as [number, number][] };
    const verge = { kind: 'grass', sub: null, name: null, rings: [[[20, 6], [80, 6], [80, 10], [20, 10]] as [number, number][]] };
    const crowns: Crown[] = [[50, 8, 12, 4]];
    const p = planRollout({ crowns, roads: [road], ground: [verge], bounds: { minX: -50, maxX: 250, minZ: -50, maxZ: 50 }, inAnsley: () => true });
    expect(p.cleared.size).toBe(0);
  });

  it('is deterministic for a synthetic board', () => {
    const crowns: Crown[] = Array.from({ length: 200 }, (_, i) => [i * 7, (i % 13) * 9, 6 + (i % 20), 2 + (i % 8)]);
    const input = { crowns, roads: [], bounds: { minX: -10, maxX: 2000, minZ: -10, maxZ: 200 } };
    expect(JSON.stringify(planRollout(input).species)).toBe(JSON.stringify(planRollout(input).species));
  });
});

describe('all-species preview (?trees=all-species)', () => {
  const drawn = () => true;
  function both(row: string) {
    const c = JSON.parse(readFileSync(new URL(`${row}/context.json`, scene), 'utf8'));
    const low: Crown[] = c.trees.slice(0, c.treeLowCount);
    const input = { roundTwo: { id: row, eligible: new Set(low.map(([x, z]) => crownKey(x, z))) }, crowns: c.trees as Crown[], roads: c.roads, ground: c.ground,
      buildings: c.buildings.map((b: { rings: number[][][] }) => b.rings[0]), bounds: c.bounds, inAnsley: ansley() };
    const off = planRollout(input), on = planRollout({ ...input, preview: { drawn } });
    return { c, low, off, on };
  }

  it.skipIf(!staged)('keeps every ordinary placement and converts the rest, the same at both tiers', () => {
    for (const row of ROWS) {
      const { c, low, off, on } = both(row);
      expect(off.preview).toBeUndefined();
      // Ordinary placements come first, unchanged.
      expect(on.species.slice(0, off.species.length)).toEqual(off.species);
      expect(on.enlarged).toEqual(off.enlarged);
      expect(on.added).toEqual(off.added);
      for (const k of off.replaced) expect(on.replaced.has(k)).toBe(true);
      // Every drawn crown is now a species, cleared, or counted as one no wired species fits.
      const generic = Object.values(on.preview!.generic).reduce((a, b) => a + b, 0);
      const left = (c.trees as Crown[]).filter(([x, z]) => !on.replaced.has(crownKey(x, z)) && !on.cleared.has(crownKey(x, z))).length
        + on.added.filter(({ crown: [x, z] }) => !on.replaced.has(crownKey(x, z))).length;
      expect(left).toBe(generic);
      // Tier identity: low is a subset of high with the same species, size class aside.
      const hi = new Map(tierPlan(on, c.trees).species.map(s => [crownKey(s.x, s.z), s.species]));
      const lo = tierPlan(on, low);
      for (const s of lo.species) expect(hi.get(crownKey(s.x, s.z))).toBe(s.species);
      // A planted pair's species appears only where its source crown is in the tier.
      const kept = new Set(lo.added.map(a => crownKey(a.crown[0], a.crown[1])));
      for (const { crown: [x, z] } of on.added) if (!kept.has(crownKey(x, z)))
        expect(lo.species.some(s => crownKey(s.x, s.z) === crownKey(x, z))).toBe(false);
    }
  });

  it.skipIf(!staged)('keeps zero weights at zero and leaves managed crowns alone', () => {
    for (const row of ROWS) {
      const { on } = both(row);
      for (const s of on.species.slice(-50)) {
        const ctx = on.context.get(crownKey(s.x, s.z)) ?? 'street';
        if (ctx === 'street') expect(['loblolly-pine', 'sweetgum', 'japanese-maple']).not.toContain(s.species);
      }
    }
    const { c, off } = both('brookwood-south');
    const [x, z] = (c.trees as Crown[]).find(([x, z]) => !off.replaced.has(crownKey(x, z)))!;
    const managed = planRollout({ crowns: c.trees, roads: c.roads, ground: c.ground, bounds: c.bounds, inAnsley: ansley(),
      preview: { drawn, managed: (mx, mz) => mx === x && mz === z } });
    expect(managed.replaced.has(crownKey(x, z))).toBe(false);
  });
});

describe('generic default (Sam, 24 November)', () => {
  it('reads the tree switch: generic unless species or all-species is asked for', () => {
    expect(treeMode('')).toBe('generic');
    expect(treeMode('?view=city&trees=bogus')).toBe('generic');
    expect(treeMode('?trees=species')).toBe('species');
    expect(treeMode('?view=city&trees=all-species')).toBe('all-species');
  });

  it.skipIf(!staged)('puts a generic crown wherever a species tree stood, at its size, at both tiers', () => {
    let total = 0;
    for (const row of ROWS) for (const tier of ['high', 'low'] as const) {
      const { crowns, p } = plan(row, tier, true);
      const g = genericPlan(p);
      expect(g.species).toEqual([]);
      // Canopy crowns go back to the World: nothing a species replaced stays replaced.
      for (const s of p.species) expect(g.replaced.has(crownKey(s.x, s.z))).toBe(false);
      // Drawn generic crowns: the tier's own (less cleared and still replaced) plus planted ones.
      const drawn = (q: typeof p) => crowns.filter(([x, z]) => !q.replaced.has(crownKey(x, z)) && !q.cleared.has(crownKey(x, z))).length + q.added.length;
      expect(drawn(g)).toBe(drawn(p) + p.species.length);
      // A planted species becomes a planted generic broadleaf at its own height and spread.
      for (const s of p.species.filter(s => !p.context.has(crownKey(s.x, s.z)))) {
        expect(g.added.some(a => a.crown[0] === s.x && a.crown[1] === s.z && a.crown[2] === s.heightM && a.crown[3] === s.spreadM / 2)).toBe(true);
        expect(g.enlarged.get(crownKey(s.x, s.z))).toEqual({ h: s.heightM, r: s.spreadM / 2 });
      }
      // The ordinary generic plan (Ansley sizing, pairs, islands) is otherwise unchanged.
      expect(g.cleared).toBe(p.cleared);
      for (const [k, v] of p.enlarged) expect(g.enlarged.get(k)).toEqual(v);
      total += p.species.length;
    }
    expect(total).toBeGreaterThan(2000);
  });
});
