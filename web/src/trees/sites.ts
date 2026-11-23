/**
 * Named trees City places by species. Each is a specific tree someone can go and see; nothing
 * here is scattered. Truth tiers are per attribute: a trunk position from a public record is
 * `reported`, one read from photographs or aerials `inferred`, and sizes are estimates unless
 * measured. Sources and method: docs/tree-species.md#where-ginkgos-are.
 */
import { ginkgo } from './ginkgo';
import type { TreePlacement } from './render';
import type { SizeClass, Species } from './species';

type Tier = 'reported' | 'inferred';
export interface TreeSite {
  id: string;
  name: string;
  species: Species;
  /** Picks the drawn form; heightM and spreadM override the class's nominal size, even outside its range. */
  size: SizeClass;
  /** Trunk, Five Points metres (x east, z south). */
  x: number;
  z: number;
  heightM: number;
  /** Crown diameter, metres. */
  spreadM: number;
  tiers: { species: Tier; position: Tier; size: Tier };
  sources: string[];
  note: string;
}

export const TREE_SITES: TreeSite[] = [
  {
    id: 'tree:ginkgo:high-museum',
    name: 'High Museum ginkgo, Atlanta’s champion, on the Peachtree lawn south of the entry ramp',
    species: ginkgo,
    // The forked specimen form: photographs show the low fork. Sized as Sam judged the tree today.
    size: 'specimen',
    // Triangulated from two Street View panoramas calibrated on Rodin's The Shade; ±3 m.
    x: 612.5, z: -4001.2,
    heightM: 20, spreadM: 18,
    tiers: { species: 'reported', position: 'inferred', size: 'inferred' },
    sources: [
      'https://services6.arcgis.com/BZn8g8tzu5WfMokL/arcgis/rest/services/TreeChampionData_2019/FeatureServer/0',
      'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.78993,-84.38466&heading=252&pitch=12&fov=55',
      'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.78972,-84.38478&heading=300&pitch=10&fov=45',
      'https://commons.wikimedia.org/wiki/File:Ginkgo_tree_and_Rodin_at_the_Woodruff_Arts_Center.jpg',
      'https://commons.wikimedia.org/wiki/File:10_The_High.jpg',
    ],
    note: 'Champion record (2012) puts the trunk at 33.789866, -84.384916 = (617.9, -3999.2) and measures 27.5 m by 26.2 m. Street View (Dec 2025 from Peachtree, Sep 2024 from the café to the south), each calibrated on The Shade at (603.6, -4003.4), triangulates the forked trunk 5.7 m WSW of that, 6 m from the end of the lawn path. Photo estimate 17 m by 15 m. Drawn at 20 m by 18 m.',
  },
];

const seedOf = (id: string) => [...id].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

/** Sites whose trunk is on a board, half-open so a tree on a row seam is built once. */
export function treeSitesIn(bounds: { minX: number; maxX: number; minZ: number; maxZ: number }, sites = TREE_SITES): TreePlacement[] {
  return sites.filter(s => s.x >= bounds.minX && s.x < bounds.maxX && s.z >= bounds.minZ && s.z < bounds.maxZ)
    .map(s => ({ species: s.species, size: s.size, x: s.x, z: s.z, seed: seedOf(s.id), heightM: s.heightM, spreadM: s.spreadM }));
}

/**
 * Whether a generic canopy crown (trunk x, z, crown radius) would merge with a named tree's
 * crown. The canopy height map usually traced that same tree, so the named tree replaces it.
 */
export function replacedBy(sites: TreePlacement[]) {
  return (x: number, z: number, crownM: number) =>
    sites.some(s => Math.hypot(x - s.x, z - s.z) < (s.spreadM ?? s.species.sizes[s.size].spreadM) / 2 + crownM * 0.5);
}
