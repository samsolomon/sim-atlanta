import { existsSync, readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { bounds, midtownRows } from '../square-board/sections';
import { World } from '../vignette/world';
import { createTrees } from './render';
import { TREE_SITES, replacedBy, treeSitesIn } from './sites';

const BOARD = { minX: -1000, maxX: 1800, minZ: -6500, maxZ: 1100 };
const rowOf = (z: number) => midtownRows.filter(r => z >= bounds[r].minZ && z < bounds[r].maxZ);

describe('named tree sites', () => {
  it('have unique ids, stand on the board, and carry a tier per attribute and a source', () => {
    expect(TREE_SITES.length).toBeGreaterThan(0);
    expect(new Set(TREE_SITES.map(t => t.id)).size).toBe(TREE_SITES.length);
    for (const s of TREE_SITES) {
      expect(s.x).toBeGreaterThanOrEqual(BOARD.minX);
      expect(s.x).toBeLessThan(BOARD.maxX);
      expect(s.z).toBeGreaterThanOrEqual(BOARD.minZ);
      expect(s.z).toBeLessThan(BOARD.maxZ);
      for (const tier of Object.values(s.tiers)) expect(['reported', 'inferred']).toContain(tier);
      expect(s.sources.length).toBeGreaterThan(0);
    }
  });

  it('builds each Midtown site in exactly one row, even on a seam', () => {
    for (const s of TREE_SITES) {
      if (s.z < BOARD.minZ || s.z >= -1700) continue;
      const hits = midtownRows.filter(r => treeSitesIn(bounds[r]).some(p => p.x === s.x && p.z === s.z));
      expect(hits).toEqual(rowOf(s.z));
    }
    const seam = [{ ...TREE_SITES[0], z: bounds['midtown-upper'].minZ }];
    expect(treeSitesIn(bounds['midtown-upper'], seam)).toHaveLength(1);
    expect(treeSitesIn(bounds['brookwood-south'], seam)).toHaveLength(0);
    const northSeam = [{ ...TREE_SITES[0], z: -5700 }];
    expect(treeSitesIn(bounds['brookwood-station'], northSeam)).toHaveLength(1);
    expect(treeSitesIn(bounds.r16, northSeam)).toHaveLength(0);
  });

  const scene = new URL('../../public/data/scene/square-board/', import.meta.url);
  it.skipIf(!existsSync(new URL('midtown-upper/context.json', scene)))('keeps every trunk off staged building footprints', () => {
    const inside = (x: number, z: number, ring: number[][]) => {
      let c = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
        if ((ring[i][1] > z) !== (ring[j][1] > z) && x < ring[j][0] + (z - ring[j][1]) / (ring[i][1] - ring[j][1]) * (ring[i][0] - ring[j][0])) c = !c;
      return c;
    };
    for (const s of TREE_SITES) for (const r of rowOf(s.z)) {
      const ctx = JSON.parse(readFileSync(new URL(`${r}/context.json`, scene), 'utf8')) as { buildings: { id: string; rings: number[][][] }[] };
      for (const b of ctx.buildings) expect(inside(s.x, s.z, b.rings[0]), `${s.id} inside ${b.id}`).toBe(false);
    }
  });

  it('keeps the High ginkgo’s leaves clear of the entry ramp, at both tiers and every season', () => {
    const site = TREE_SITES.find(s => s.id === 'tree:ginkgo:high-museum')!;
    // Ramp centreline from the Peachtree foot to the landing, and its half-width (docs/arts-campus.md).
    const a = new THREE.Vector2(625.1, -4010.5), b = new THREE.Vector2(577.2, -4017.0), half = 2.2;
    const toRamp = (x: number, z: number) => {
      const p = new THREE.Vector2(x, z), ab = b.clone().sub(a);
      const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq()));
      return p.distanceTo(a.clone().add(ab.multiplyScalar(t))) - half;
    };
    for (const q of ['high', 'low'] as const) {
      const trees = createTrees(treeSitesIn(bounds['midtown-upper']).filter(p => p.x === site.x), q, () => 0)!;
      trees.setSeason(182);
      const leaves = trees.group.getObjectByName('clump leaves') as THREE.InstancedMesh;
      const m = new THREE.Matrix4(), v = new THREE.Vector3();
      const corners = leaves.geometry.attributes.position;
      for (let i = 0; i < leaves.count; i++) {
        leaves.getMatrixAt(i, m);
        for (let k = 0; k < corners.count; k++) {
          v.fromBufferAttribute(corners, k).applyMatrix4(m);
          // Any leaf over the ramp (or within a metre of it) must stay above 7.5 m.
          if (toRamp(v.x, v.z) < 1) expect(v.y).toBeGreaterThan(7.5);
        }
      }
      trees.dispose();
    }
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
