/**
 * The generic leaf-clump tree that fills City's canopy today, built exactly as a Midtown row
 * builds it (World.buildTrees with octahedron clumps). The lab shows it as the baseline, and
 * its triangles per tree are the budget a species must stay within.
 */
import * as THREE from 'three';
import { World } from '../vignette/world';
import type { SizeClass, TreeQuality } from './species';

/** Height and crown RADIUS, metres, of the canopy-map crowns the lab shows for each class. */
export const GENERIC_SIZES: Record<SizeClass, { heightM: number; crownM: number }> = {
  sapling: { heightM: 4, crownM: 1 },
  young: { heightM: 10, crownM: 3 },
  mature: { heightM: 18, crownM: 6 },
  specimen: { heightM: 25, crownM: 10 },
};

/** Midtown's clump counts by tier (terrain/model.ts makeScenery). */
const CLUMPS: Record<TreeQuality, number> = { high: 8, low: 3 };

export function createGenericTrees(trees: { x: number; z: number; size: SizeClass }[], quality: TreeQuality) {
  const pad = 40;
  const xs = trees.map(t => t.x), zs = trees.map(t => t.z);
  const bounds = { minX: Math.min(...xs) - pad, maxX: Math.max(...xs) + pad, minZ: Math.min(...zs) - pad, maxZ: Math.max(...zs) + pad };
  const world = new World({ bounds, buildings: [], roads: [], rail: [] }, null, { terrain: 'flat', clumps: CLUMPS[quality], lightMapMax: 256 });
  world.realTrees = trees.map(t => [t.x, t.z, GENERIC_SIZES[t.size].heightM, GENERIC_SIZES[t.size].crownM]);
  world.buildTrees(new THREE.OctahedronGeometry(1));
  // World draws a tree's kind from its colour seed; pin every one to a broadleaf (c ≥ 0.26).
  world.trees.forEach((t, i) => { t.c = 0.3 + ((i * 0.137) % 0.6); });
  world.setSeason(180);
  return {
    group: world.group,
    setSeason: (doy: number) => world.setSeason(doy),
    dispose: () => { world.group.removeFromParent(); world.dispose(); },
  };
}

const counted = new Map<TreeQuality, { total: number; draws: number }>();
/** Triangles per generic broadleaf at a tier, counted (once) from the meshes World builds. */
export function genericTriangles(quality: TreeQuality) {
  const known = counted.get(quality);
  if (known) return known;
  const g = createGenericTrees([{ x: 0, z: 0, size: 'mature' }], quality);
  let total = 0;
  let draws = 0;
  g.group.traverse(o => {
    if (!(o instanceof THREE.InstancedMesh)) return;
    const geom = o.geometry;
    const tri = (geom.index ? geom.index.count : geom.attributes.position.count) / 3;
    // Pine tiers are a different kind; a broadleaf draws canopy, trunk and bare branches.
    if (o.count === 0 || o.geometry instanceof THREE.ConeGeometry) return;
    total += tri * o.count;
    draws++;
  });
  g.dispose();
  counted.set(quality, { total, draws });
  return { total, draws };
}
