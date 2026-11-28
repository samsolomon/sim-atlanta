import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { gores, paintedSection, pushOf, ribbons, type Ribbon } from './connector-corridor';
import { roadLint } from './road-lint';

/** Every ground ribbon painted on one board that covers them all: the overlap the paint would show. */
function overlap(only?: (r: Ribbon) => boolean, drawn = true) {
  const strips = ribbons.filter(r => r.kind === 'ground' && (!only || only(r))).map(r => ({ r, rows: drawn ? r.rows.map(paintedSection) : r.rows }));
  const board = { id: 'all', bounds: { minX: -2000, maxX: 3000, minZ: -7000, maxZ: 2000 }, terrainAt: () => 0, terrain: [] };
  return roadLint(new THREE.Group(), [board], { painted: new Map([['all', strips]]) }).boards.all;
}

describe('one surface owner at merges and diverges (road kit, primitive 5)', () => {
  it('keeps sibling ribbons off each other beyond their joints', () => {
    // 5,238 m² before the rule, on the boards (docs/road-kit.md audit). What is left: one
    // hairpin loop and a few slivers between mainlines.
    expect(overlap().paintOverlapM2).toBeLessThan(200);
  });

  it('draws Sam’s A5 option lane once: the ramp starts at the mainline’s edge until the gore opens', () => {
    // 8 lanes in, 7 + 2 out: lane 6 feeds both branches (main's option-lane routing, kept).
    const pair = new Set([1450889003, 1450889004]);
    const ramp = ribbons.find(r => r.id === 1450889003)!;
    expect(overlap(r => pair.has(r.id), false).paintOverlapM2).toBeGreaterThan(20);
    expect(overlap(r => pair.has(r.id)).paintOverlapM2).toBeLessThan(5);
    expect(ramp.rows.some(row => (row.covered?.inner ?? row.covered?.outer ?? 0) > 1)).toBe(true);
  });

  it('moves the Sweet Auburn left-side ramp off the mainline it was drawn over, at (1214, −368)', () => {
    const pair = new Set([337901420, 1416661102]);
    expect(overlap(r => pair.has(r.id)).paintOverlapM2).toBeLessThan(5);
    // The mainline keeps its lanes and dashes the shared edge; the ramp draws none there.
    const main = ribbons.find(r => r.id === 337901420)!, ramp = ribbons.find(r => r.id === 1416661102)!;
    expect(main.rows.some(row => row.joined?.inner === 'dash')).toBe(true);
    expect(ramp.rows.some(row => row.joined?.outer === 'none')).toBe(true);
  });

  it('generates a gore at merges and diverges and keeps each wedge narrower than a lane', () => {
    expect(gores.length).toBeGreaterThan(50);
    for (const g of gores) {
      const half = g.ring.length / 2;
      for (let i = 0; i < half; i++) {
        const a = g.ring[i], b = g.ring[g.ring.length - 1 - i];
        expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeLessThan(3.7);
      }
    }
  });

  it('never moves a row at a real joint, and keeps chained pieces meeting exactly', () => {
    const key = (p: readonly number[]) => p.join(',');
    const ins = new Map<string, Ribbon[]>(), outs = new Map<string, Ribbon[]>();
    for (const r of ribbons) {
      ins.set(key(r.pts.at(-1)!), [...(ins.get(key(r.pts.at(-1)!)) ?? []), r]);
      outs.set(key(r.pts[0]), [...(outs.get(key(r.pts[0])) ?? []), r]);
    }
    let joints = 0, chains = 0;
    for (const [node, into] of ins) {
      const from = outs.get(node) ?? [];
      if (into.length === 1 && from.length === 1) {
        // A plain chain node: both pieces may move, but together. (Where OSM changes the lane
        // count at a chain node the sections differ already: lane steps, part 4.)
        const a = into[0].rows.at(-1)!, b = from[0].rows[0];
        if (pushOf(a) || pushOf(b)) {
          if (into[0].lanes === from[0].lanes)
            for (const k of ['inner', 'outer'] as const) expect(Math.hypot(a[k][0] - b[k][0], a[k][1] - b[k][1]), node).toBeLessThan(0.001);
          chains++;
        }
        continue;
      }
      for (const r of into) expect(pushOf(r.rows.at(-1)!), `${r.key} at ${node}`).toBe(0);
      for (const r of from) expect(pushOf(r.rows[0]), `${r.key} at ${node}`).toBe(0);
      joints++;
    }
    expect(joints).toBeGreaterThan(60);
    expect(chains).toBeGreaterThan(5);
  });

  it('never kinks an edge: a push changes by at most 0.35 m per metre along the way', () => {
    let moved = 0;
    for (const r of ribbons) {
      for (let i = 1; i < r.rows.length; i++) {
        const a = r.rows[i - 1], b = r.rows[i], ds = b.s - a.s;
        if (pushOf(b) || pushOf(a)) moved++;
        if (ds < 1) continue;
        expect(Math.abs(pushOf(b) - pushOf(a)) / ds, `${r.key} at s ${a.s.toFixed(1)}`).toBeLessThan(0.35);
      }
    }
    expect(moved).toBeGreaterThan(300);
  });
});
