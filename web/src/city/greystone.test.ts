import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { pointInRing, segDist, type P2 } from '../vignette/geom';
import type { TerrainCity } from '../terrain/transport-data';
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
  // A square park, x and z from 0 to 200.
  const square: P2[] = [[0, 0], [200, 0], [200, 200], [0, 200]];
  const lit = (...roads: { cls: string; pts: P2[] }[]) => piedmontLampPaths({ roads: roads.map(r => ({ ...r, bridge: false, tunnel: false })),
    ground: [{ name: 'Piedmont Park', kind: 'park', rings: [square] }] } as unknown as TerrainCity);
  const key = (paths: P2[][]) => paths.map(p => p.map(q => q.map(Math.round).join(',')).sort().join(' ')).sort();

  it('lights only the stretches inside the park, whichever way the path runs', () => {
    // Leaves through the east edge and comes back; the middle vertex is outside.
    const pts: P2[] = [[20, 50], [150, 50], [260, 50], [260, 120], [150, 120], [60, 120]];
    const paths = lit({ cls: 'pedestrian', pts });
    expect(key(paths)).toEqual(key([[[20, 50], [150, 50], [200, 50]], [[200, 120], [150, 120], [60, 120]]]));
    expect(key(lit({ cls: 'pedestrian', pts: [...pts].reverse() }))).toEqual(key(paths));
    // A two-point path entering the park is lit from the edge only.
    for (const crossing of [[[-300, 80], [150, 80]], [[150, 80], [-300, 80]]] as P2[][])
      expect(key(lit({ cls: 'footway', pts: crossing }))).toEqual(key([[[0, 80], [150, 80]]]));
  });

  it('keeps a path that runs along any side of the park', () => {
    for (const pts of [[[20, 0], [180, 0]], [[20, 200], [180, 200]], [[0, 20], [0, 180]], [[200, 20], [200, 180]]] as P2[][])
      expect(key(lit({ cls: 'footway', pts }))).toEqual(key([pts]));
  });

  it('counts a footway\'s length inside the park against the 100 m floor', () => {
    expect(lit({ cls: 'footway', pts: [[-300, 80], [90, 80]] })).toEqual([]);
    expect(lit({ cls: 'pedestrian', pts: [[-300, 80], [90, 80]] })).toHaveLength(1);
    // Two inside stretches of 70 m each count together.
    expect(lit({ cls: 'footway', pts: [[130, 40], [250, 40], [250, 60], [130, 60]] })).toHaveLength(2);
  });

  it.skipIf(!staged)('picks the promenades and long footways inside the park', () => {
    const c = JSON.parse(readFileSync(row, 'utf8'));
    const paths = piedmontLampPaths(c);
    expect(paths.length).toBeGreaterThan(10);
    // Every stretch stays inside the park or runs along its edge, measured at its midpoints.
    const park = c.ground.find((g: { name?: string; kind: string }) => g.name === 'Piedmont Park' && g.kind === 'park').rings[0];
    for (const p of paths) for (let i = 1; i < p.length; i++)
    {
      const x = (p[i - 1][0] + p[i][0]) / 2, z = (p[i - 1][1] + p[i][1]) / 2;
      const along = park.some((a: P2, j: number) => segDist(x, z, a, park[(j + 1) % park.length]) < .05);
      expect(pointInRing(x, z, park) || along).toBe(true);
    }
    // No park, no lamps.
    expect(piedmontLampPaths({ ...c, ground: [] })).toEqual([]);
  });
});
