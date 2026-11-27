import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { createGreystone, greystoneId } from './greystone';
import { piedmontLampPaths } from './piedmont-park';

const row = new URL('../../public/data/scene/square-board/midtown-upper/context.json', import.meta.url);
const staged = existsSync(row);
const site: VBuilding = { id: greystoneId, rings: [[[1591, -3583], [1623, -3583], [1623, -3501], [1591, -3501]]] } as VBuilding;

describe('Greystone', () => {
  it('replaces only its own footprint and stays within a modest triangle budget', () => {
    const other = { id: 'osm:way:1', rings: [[[0, 0], [1, 0], [1, 1]]] } as VBuilding;
    const g = createGreystone([site, other], site, null, () => -53)!;
    expect(g.buildings).toEqual([other]);
    expect(g.triangles).toBeGreaterThan(500);
    expect(g.triangles).toBeLessThan(6000);
    // A warm pool under each deck lamp, on the deck.
    expect(g.pools.length).toBeGreaterThan(6);
    for (const p of g.pools) expect(p.at[0]).toBeGreaterThan(1615);
  });

  it('builds nothing for another site, or without ground', () => {
    expect(createGreystone([], { ...site, id: 'osm:way:2' }, null, () => 0)).toBeNull();
    expect(createGreystone([site], site, null, () => null)).toBeNull();
  });
});

describe('Piedmont Park lamp paths', () => {
  it.skipIf(!staged)('picks the promenades and long footways inside the park', () => {
    const c = JSON.parse(readFileSync(row, 'utf8'));
    const paths = piedmontLampPaths(c);
    expect(paths.length).toBeGreaterThan(10);
    const len = (p: number[][]) => p.reduce((n, q, i) => i ? n + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0, 0);
    // Short footways (under 100 m) are left dark unless they are promenades.
    const pedestrian = new Set(c.roads.filter((r: { cls: string }) => r.cls === 'pedestrian').map((r: { pts: unknown }) => r.pts));
    for (const p of paths) if (!pedestrian.has(p)) expect(len(p)).toBeGreaterThanOrEqual(100);
    // No park, no lamps.
    expect(piedmontLampPaths({ ...c, ground: [] })).toEqual([]);
  });
});
