/**
 * Southern magnolia (Magnolia grandiflora) and crape myrtle (Lagerstroemia): the South's two
 * signature ornamentals. The magnolia is a dense, dark, glossy evergreen pyramid whose branches
 * sweep to the ground, with big creamy-white flowers in May and June. The crape myrtle is a
 * small multi-stem vase of smooth, mottled, peeling bark that blooms pink, red, white or purple
 * through the summer and turns yellow to red in the fall. Sources and dates:
 * docs/tree-species.md#southern-magnolia and #crape-myrtle.
 */
import { broadleafSpecies, keyedCalendar, type Look, type LookOption } from './looks';
import type { Habit } from './broadleaf';

// ---- southern magnolia ---------------------------------------------------------------------

const magnoliaHabit: Habit = {
  // Dense pyramidal evergreen, branched to the ground; smooth grey bark.
  trunkTop: 0.9, crownBase: 0.08, widest: 0.24,
  limbs: { high: 4, low: 3 }, limbAngle: 0.45, limbFrom: [0.1, 0.6], limbReach: 0.85,
  ragged: 0.05, bark: '#7a776f', barkDark: '#6a675f',
  // Dense tiers to the ground, shrinking toward a filled top: a tall dark cone (gloss round 2).
  mass: { r: 0.66, low: -0.68, high: 0.8 },
  tiers: { high: [3, 3, 2, 2, 2], low: [2, 2, 2, 1] },
  taper: 0.6,
  cone: 0.8,
  clusterWeight: 0.8,
  bySize: {
    sapling: { widest: 0.28 },
    specimen: { widest: 0.3, ragged: 0.12 },
  },
};

// Evergreen, "no color change" (UF). GA USA-NPN: young leaves Apr 13–28, open flowers May 22 to
// Jun 6 (medians), "sparse continued flowering throughout the summer" (NC State); red seeds in
// October. Old leaves drop as the new ones open.
const magnoliaPalette = keyedCalendar([
  { m: 1, d: 1, leaves: 1, a: '#376848', b: '#618756', carpet: 0.15, label: 'evergreen, glossy' },
  { m: 4, d: 20, leaves: 1, a: '#376a48', b: '#6e9661', carpet: 0.35, label: 'new leaves, old ones dropping' },
  { m: 5, d: 12, leaves: 1, a: '#396c4c', b: '#67925d', carpet: 0.3, bloom: 0.15, label: 'first flowers' },
  { m: 5, d: 28, leaves: 1, a: '#396c4c', b: '#67925d', carpet: 0.2, bloom: 0.85, label: 'creamy white flowers' },
  { m: 6, d: 10, leaves: 1, a: '#396c4c', b: '#67925d', carpet: 0.15, bloom: 0.35, label: 'last of the main bloom' },
  { m: 7, d: 1, leaves: 1, a: '#376848', b: '#618b57', carpet: 0.15, bloom: 0.06, label: 'a few summer flowers' },
  { m: 8, d: 15, leaves: 1, a: '#376848', b: '#618b57', carpet: 0.15, bloom: 0, label: 'evergreen, glossy' },
]);

const A_BASE = { technique: 'cards' as const, ink: 2 as const, tips: 3, units: { high: 20, low: 10 }, blooms: { high: 12, low: 8 }, cover: 1.0 };
const MAGNOLIA_OPTIONS: LookOption[] = [
  // A and its gloss variants share one tall dark cone; the variants differ only in how many
  // painted leaves can flash in the sun (Sam's gloss round 2, 23 Nov).
  { id: 'A', label: 'Dark cone', ...A_BASE,
    note: 'The ginkgo C4 technique on a tall, dark evergreen cone branched to the ground: big leaves, sunlit tops over a near-black interior, creamy-white flowers in May and June; warm silhouette ink and leaf tips close up.' },
  { id: 'A1', label: 'Sparse specks', ...A_BASE, specks: 0.05,
    note: 'A with small warm-white specks: about one painted leaf in twenty on the sun side can flash where its card meets the sun’s half vector, and the specks move with the view. No extra draws or triangles; off at night.' },
  { id: 'A2', label: 'Specks', ...A_BASE, specks: 0.1,
    note: 'A1 at about one leaf in ten.' },
  { id: 'A3', label: 'Dense specks', ...A_BASE, specks: 0.18,
    note: 'A1 at about one leaf in six.' },
  // No cored option (B): a core per mass on the cone's 13 masses cannot fit 196 with cards on
  // every mass, and Sam's direction is A (gloss round 2).
  // At least as many clusters as masses, so no limb ends in bare air.
  { id: 'C', label: 'Faceted clusters', technique: 'lobes', facets: 3, units: { high: 13, low: 9 }, blooms: { high: 12, low: 6 }, cover: 0.95,
    note: 'The same masses as faceted clusters with every facet inked: the house style, for comparison.' },
];

export const southernMagnolia = broadleafSpecies({
  id: 'southern-magnolia',
  name: 'Southern magnolia',
  carpet: true,
  bloomColour: '#f3eed6',
  // Ranges: NC State and UF ST371; GT's 433 measured magnolias by DBH class; Trees Atlanta
  // champions (2021, 23.8 × 19.8 m; Oakland Cemetery, 2012, 19.9 × 20.1 m).
  sizes: {
    sapling: { heightM: 4.5, spreadM: 2.2, calliperM: 0.08 },
    young: { heightM: 9.1, spreadM: 4.4, calliperM: 0.22 },
    mature: { heightM: 15.7, spreadM: 11.2, calliperM: 0.7 },
    specimen: { heightM: 23.8, spreadM: 19.8, calliperM: 1.37 },
  },
  ranges: {
    sapling: { heightM: [3, 6], spreadM: [1.2, 3.5], calliperM: [0.04, 0.15] },
    young: { heightM: [5, 12], spreadM: [2.5, 6.5], calliperM: [0.15, 0.3] },
    mature: { heightM: [12, 24.4], spreadM: [7, 15.2], calliperM: [0.3, 0.91] },
    specimen: { heightM: [19.9, 24.5], spreadM: [17.1, 20.1], calliperM: [0.9, 1.38] },
  },
  clumps: { high: 13, low: 7 },
  offsetDays: 6,
  habit: magnoliaHabit,
  palette: magnoliaPalette,
});
export const southernMagnoliaLook: Look = {
  species: southernMagnolia, habit: magnoliaHabit, leaf: 'oval', palette: magnoliaPalette, options: MAGNOLIA_OPTIONS, preferred: 'A3', tidySkirt: true,
  toneByLight: true, bloomColour: '#f6f2e2', bloomSizeM: 1.5, bloomWash: 0.12,
};

// ---- crape myrtle --------------------------------------------------------------------------

const crapeHabit: Habit = {
  // A multi-stem vase (GT median 4 stems, p90 6) of smooth, mottled, peeling bark: tan, grey and
  // cinnamon patches. The crown is wider at the top.
  stems: 4,
  trunkTop: 0.72, crownBase: 0.38, widest: 0.62,
  limbs: { high: 4, low: 3 }, limbAngle: 1.1, limbFrom: [0.3, 0.6], limbReach: 0.75,
  ragged: 0.12, bark: '#b49a82', barkDark: '#8c7a6c',
  mass: { r: 0.6, low: -0.45, high: 0.55 },
  bySize: {
    sapling: { stems: 3, crownBase: 0.3 },
    specimen: { stems: 5, widest: 0.58 },
  },
};

// Blooms July–September (NC State; 'Natchez' from late June); "yellow, orange, or red in the
// fall". Crape myrtle is not in USA-NPN: leaf-out in April and drop in November are inferred.
const crapePalette = keyedCalendar([
  { m: 1, d: 1, leaves: 0, a: '#8a7a6a', b: '#8a7a6a', carpet: 0.2, label: 'bare, mottled stems' },
  { m: 2, d: 1, leaves: 0, a: '#8a7a6a', b: '#8a7a6a', carpet: 0, label: 'bare, mottled stems' },
  { m: 4, d: 10, leaves: 0.1, a: '#9cb86a', b: '#b48a5a', label: 'buds breaking, red-tinged' },
  { m: 5, d: 1, leaves: 1, a: '#5a8658', b: '#6a925e', label: 'summer green' },
  { m: 7, d: 1, leaves: 1, a: '#5a8658', b: '#6a925e', bloom: 0.1, label: 'first flowers' },
  { m: 7, d: 25, leaves: 1, a: '#5a8658', b: '#6a925e', bloom: 1, label: 'in full bloom' },
  { m: 9, d: 5, leaves: 1, a: '#5a8658', b: '#749058', bloom: 0.6, label: 'still in bloom' },
  { m: 9, d: 30, leaves: 1, a: '#6a9458', b: '#9a9a50', bloom: 0, label: 'seed heads' },
  { m: 10, d: 28, leaves: 0.95, a: '#d0a03c', b: '#c8562e', label: 'yellow, orange and red' },
  { m: 11, d: 18, leaves: 0.05, a: '#a8763a', b: '#9c4a30', carpet: 1, label: 'bare over a leaf carpet' },
]);

const CRAPE_OPTIONS: LookOption[] = [
  { id: 'A', label: 'Vase of branch-mass cards', technique: 'cards', ink: 2, tips: 3, units: { high: 18, low: 10 }, blooms: { high: 20, low: 14 }, cover: 0.8,
    note: 'The ginkgo C4 technique on a multi-stem vase: one rounded mass of small leaves on each mottled stem, summer flower trusses in pink, red, white or purple (one colour per tree); warm silhouette ink and leaf tips close up.' },
  { id: 'B', label: 'Cored masses', technique: 'cored', ink: 2, units: { high: 8, low: 8 }, blooms: { high: 6, low: 6 }, cover: 0.9,
    note: 'The same masses with a dark faceted core under the cards: fuller and more solid.' },
  { id: 'C', label: 'Faceted clusters', technique: 'lobes', facets: 4, units: { high: 11, low: 9 }, blooms: { high: 12, low: 6 }, cover: 0.9,
    note: 'The same masses as faceted clusters with every facet inked: the house style, for comparison.' },
];

export const crapeMyrtle = broadleafSpecies({
  id: 'crape-myrtle',
  name: 'Crape myrtle',
  carpet: true,
  // The clump model shows one pink; the look gives each tree one of four colours.
  bloomColour: '#d8608c',
  // Ranges: NC State and UF ST342; GT's 861 measured crape myrtles by equivalent DBH (median 4
  // stems, p90 6); Trees Atlanta champion (Georgia Beer Garden, 420 Edgewood Ave, 2018).
  // Calliper is the largest stem's.
  sizes: {
    sapling: { heightM: 3, spreadM: 2, calliperM: 0.05 },
    young: { heightM: 5.5, spreadM: 4.5, calliperM: 0.1 },
    mature: { heightM: 7.3, spreadM: 5.8, calliperM: 0.18 },
    specimen: { heightM: 10.1, spreadM: 7.8, calliperM: 0.3 },
  },
  ranges: {
    sapling: { heightM: [1.8, 4.5], spreadM: [1, 4], calliperM: [0.025, 0.08] },
    young: { heightM: [4.5, 7], spreadM: [3, 6], calliperM: [0.06, 0.15] },
    mature: { heightM: [6, 9.8], spreadM: [4.3, 7.6], calliperM: [0.1, 0.3] },
    specimen: { heightM: [8, 10.4], spreadM: [6, 9.1], calliperM: [0.2, 0.42] },
  },
  clumps: { high: 13, low: 7 },
  offsetDays: 6,
  habit: crapeHabit,
  palette: crapePalette,
});
export const crapeMyrtleLook: Look = {
  species: crapeMyrtle, habit: crapeHabit, leaf: 'oval', palette: crapePalette, options: CRAPE_OPTIONS,
  bloomColours: ['#e0649a', '#c83a52', '#f4eee6', '#a060b4'], bloomSizeM: 1.0, bloomWash: 0.45,
};
