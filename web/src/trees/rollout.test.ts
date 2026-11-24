import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lonLatToScene } from '../core/places';
import { MIX, crownKey, planRollout, tierPlan, type Crown } from './rollout';

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
        expect(island[0]).toMatchObject({ species: 'american-elm', size: 'specimen' });
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
