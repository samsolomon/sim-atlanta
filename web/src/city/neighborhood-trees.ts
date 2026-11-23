import type { TerrainQuality } from '../terrain/surface';

export interface NeighborhoodCanopy {
  trees: [number, number, number, number][];
  treeLowCount?: number;
}

// The offline bake puts a representative crown from each occupied cell first.
// Older east-board packs carry only the manually traced crowns.
export function neighborhoodTrees(context: NeighborhoodCanopy, quality: TerrainQuality) {
  return quality === 'low' && context.treeLowCount !== undefined
    ? context.trees.slice(0, context.treeLowCount) : context.trees;
}
