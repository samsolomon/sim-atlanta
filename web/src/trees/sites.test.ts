import { describe, expect, it } from 'vitest';
import { World } from '../vignette/world';
import { TREE_SITES, replacedBy, treeSitesIn } from './sites';

const BOARD = { minX: -1000, maxX: 1800, minZ: -5700, maxZ: 1100 };

describe('named tree sites', () => {
  it('stand on the board with a tier per attribute and a source', () => {
    for (const s of TREE_SITES) {
      expect(s.x).toBeGreaterThanOrEqual(BOARD.minX);
      expect(s.x).toBeLessThan(BOARD.maxX);
      expect(s.z).toBeGreaterThanOrEqual(BOARD.minZ);
      expect(s.z).toBeLessThan(BOARD.maxZ);
      for (const tier of Object.values(s.tiers)) expect(['reported', 'inferred']).toContain(tier);
      expect(s.sources.length).toBeGreaterThan(0);
      expect(new Set(TREE_SITES.map(t => t.id)).size).toBe(TREE_SITES.length);
    }
  });

  it('puts the High Museum ginkgo in the Midtown row that holds it, once across the seam', () => {
    const upper = treeSitesIn({ minX: -1000, maxX: 1800, minZ: -4100, maxZ: -3300 });
    expect(upper.map(p => p.species.id)).toEqual(['ginkgo']);
    expect(treeSitesIn({ minX: -1000, maxX: 1800, minZ: -4900, maxZ: -4100 })).toEqual([]);
    const seam = [{ ...TREE_SITES[0], z: -4100 }];
    expect(treeSitesIn({ minX: -1000, maxX: 1800, minZ: -4100, maxZ: -3300 }, seam)).toHaveLength(1);
    expect(treeSitesIn({ minX: -1000, maxX: 1800, minZ: -4900, maxZ: -4100 }, seam)).toHaveLength(0);
  });

  it('replaces the generic crown it stands in without reshuffling any other tree', () => {
    const bounds = { minX: 0, maxX: 400, minZ: 0, maxZ: 400 };
    const crowns: [number, number, number, number][] = Array.from({ length: 30 }, (_, i) => [20 + (i % 6) * 60, 20 + Math.floor(i / 6) * 70, 12, 4]);
    const build = (replace: World['replacedTree']) => {
      const w = new World({ bounds, buildings: [], roads: [], rail: [] }, null, { terrain: 'flat', clumps: 3, lightMapMax: 64 });
      w.realTrees = crowns;
      w.replacedTree = replace;
      w.buildTrees();
      return w.trees.map(t => `${t.x},${t.z},${t.c}`);
    };
    const all = build(null);
    const named = [{ species: TREE_SITES[0].species, size: 'specimen' as const, x: 140, z: 160, seed: 1, spreadM: 10 }];
    const kept = build(replacedBy(named));
    expect(kept).toHaveLength(all.length - 1);
    expect(all.filter(t => !t.startsWith('140,160,'))).toEqual(kept);
  });
});
