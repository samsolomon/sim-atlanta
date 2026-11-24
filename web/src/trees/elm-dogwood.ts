/**
 * American elm (Ulmus americana) and flowering dogwood (Cornus florida). The elm is the classic
 * vase: an open-grown trunk forks a few metres up into erect limbs that arch out into a wide,
 * fountain-like crown, soft yellow in the fall; Atlanta streets plant its look-alikes, lacebark
 * elm and zelkova, which the City mixes would map to it (proposed, not wired in). The dogwood is the understorey tree of
 * Atlanta's yard edges: low and wide, its lower branches horizontal in layers, white bracts on
 * bare twigs in early April (the Dogwood Festival), red-maroon in the fall. Sources and dates:
 * docs/tree-species.md#american-elm and #flowering-dogwood.
 */
import { broadleafSpecies, keyedCalendar, type Look, type LookOption } from './looks';
import type { Habit } from './broadleaf';

// ---- American elm --------------------------------------------------------------------------

const elmHabit: Habit = {
  // "Open-grown trees fork 10 to 20 feet (3-6 m) from the ground with several erect limbs
  // forming a wide, arching crown" (FEIS); "branches like spreading fountains" (Morton).
  trunkTop: 0.3, crownBase: 0.3, widest: 0.72,
  limbs: { high: 4, low: 3 }, limbAngle: 1.15, limbFrom: [0.17, 0.27], limbReach: 0.95,
  ragged: 0.12, bark: '#6f6a62', barkDark: '#5c5852',
  mass: { r: 0.6, low: -0.25, high: 0.75 },
  bySize: {
    sapling: { trunkTop: 0.6, crownBase: 0.3, widest: 0.5, limbFrom: [0.3, 0.6], limbAngle: 0.9 },
    young: { trunkTop: 0.45, widest: 0.6, limbFrom: [0.22, 0.42] },
  },
};

// Flowers Feb–Mar before the leaves (NC State, FEIS); "an undistinguished yellow in fall" (NC
// State). Georgia USA-NPN has only 2 tree-years. Dates are inferred.
const elmPalette = keyedCalendar([
  { m: 1, d: 1, leaves: 0, a: '#7a7066', b: '#7a7066', carpet: 0.25, label: 'bare, a fountain of grey limbs' },
  { m: 2, d: 1, leaves: 0, a: '#7a7066', b: '#7a7066', carpet: 0, label: 'bare' },
  { m: 2, d: 25, leaves: 0.08, a: '#8c6e56', b: '#a07c5c', label: 'flowering, a red-brown haze' },
  { m: 3, d: 25, leaves: 0.2, a: '#a8c070', b: '#c0c87e', label: 'seeds and first leaves' },
  { m: 4, d: 20, leaves: 1, a: '#557c56', b: '#63885e', label: 'summer green' },
  { m: 10, d: 10, leaves: 1, a: '#537a54', b: '#88964c', label: 'summer green, first yellow' },
  { m: 10, d: 30, leaves: 0.9, a: '#c4b042', b: '#d4bc4c', label: 'soft yellow' },
  { m: 11, d: 18, leaves: 0, a: '#a8904c', b: '#9a8448', carpet: 1, label: 'bare over yellow leaves' },
]);

const ELM_OPTIONS: LookOption[] = [
  { id: 'A', label: 'Vase of branch-mass cards', technique: 'cards', ink: 2, tips: 3, units: { high: 22, low: 11 }, cover: 0.78,
    note: 'The ginkgo C4 technique on the elm vase: a short trunk forking into erect limbs that arch out into a wide crown of rough, matte leaves; warm silhouette ink and leaf tips close up.' },
  { id: 'B', label: 'Cored masses', technique: 'cored', ink: 2, units: { high: 9, low: 7 }, cover: 0.85,
    note: 'The same masses with a dark faceted core under the cards: fuller and more solid.' },
  { id: 'C', label: 'Faceted clusters', technique: 'lobes', facets: 4, units: { high: 11, low: 8 }, cover: 0.9,
    note: 'The same masses as faceted clusters with every facet inked: the house style, for comparison.' },
];

export const americanElm = broadleafSpecies({
  id: 'american-elm',
  name: 'American elm',
  carpet: true,
  // Ranges: NC State, UF ST649 and USFS FEIS; GT's 40 measured American elms (all single-stem);
  // Trees Atlanta champions (80 Palisades Rd, 32.0 × 29.0 m; Doraville, 25.4 × 33.5 m).
  sizes: {
    sapling: { heightM: 5, spreadM: 3, calliperM: 0.08 },
    young: { heightM: 10, spreadM: 6.4, calliperM: 0.22 },
    mature: { heightM: 21, spreadM: 15, calliperM: 0.7 },
    specimen: { heightM: 30, spreadM: 28, calliperM: 1.4 },
  },
  ranges: {
    sapling: { heightM: [3, 6.5], spreadM: [1.5, 4], calliperM: [0.04, 0.12] },
    young: { heightM: [6, 13.6], spreadM: [4, 8.5], calliperM: [0.12, 0.3] },
    mature: { heightM: [15, 27.4], spreadM: [9.1, 21.3], calliperM: [0.3, 0.91] },
    specimen: { heightM: [24, 32], spreadM: [20, 33.5], calliperM: [0.9, 1.52] },
  },
  clumps: { high: 13, low: 7 },
  offsetDays: 8,
  habit: elmHabit,
  palette: elmPalette,
});
export const americanElmLook: Look = { species: americanElm, habit: elmHabit, leaf: 'oval', palette: elmPalette, options: ELM_OPTIONS, lowLift: 0.03 };

// ---- flowering dogwood ---------------------------------------------------------------------

const dogwoodHabit: Habit = {
  // "Branches on the lower half of the crown grow horizontally, those in the upper half are more
  // upright … a strikingly horizontal impact" (UF ST185). GT: 96% single-stem, about as wide as
  // tall. Drawn as horizontal tiers of flat masses on a single trunk.
  trunkTop: 0.2, forkM: 1.25, crownBase: 0.22, widest: 0.42,
  limbs: { high: 4, low: 3 }, limbAngle: 0.15, limbFrom: [0.2, 0.7], limbReach: 0.9,
  ragged: 0.08, bark: '#82766e', barkDark: '#70665e',
  mass: { r: 0.46, low: -0.7, high: 0.75 },
  tiers: { high: [2, 2, 2], low: [2, 2, 1] },
  taper: 0.3,
  bySize: {
    sapling: { tiers: { high: [2, 2, 1], low: [2, 1] } },
  },
};

// GA USA-NPN (39 tree-years): open flowers Mar 28 to Apr 9, full flowering Apr 1–13 (median Apr
// 8); leaf buds break Mar 27, leaves expand from Apr 7; coloured leaves from Oct 3, falling Oct 5
// to Oct 22 (latest Nov 21). Atlanta Dogwood Festival: Apr 10–12, 2026. Sam saw red-maroon
// dogwoods at yard edges in late November, so the drop runs late here.
const dogwoodPalette = keyedCalendar([
  { m: 1, d: 1, leaves: 0, a: '#6a5e5a', b: '#6a5e5a', carpet: 0.2, label: 'bare, layered grey branches' },
  { m: 2, d: 1, leaves: 0, a: '#6a5e5a', b: '#6a5e5a', carpet: 0, label: 'bare, flower buds' },
  // Approximation: leaves rise with the bracts (the clusters carry both), so a little green shows
  // about a week before USA-NPN's leaf expansion. In bloom the crown is mostly bracts: clusters stay present and wash white (bloomWash),
  // with a little early green between them.
  { m: 3, d: 22, leaves: 0, a: '#9ab868', b: '#aac27a', bloom: 0, label: 'flower buds' },
  { m: 3, d: 28, leaves: 0.55, a: '#a8bc72', b: '#b8c480', bloom: 0.5, label: 'bracts opening' },
  { m: 4, d: 6, leaves: 0.85, a: '#9ab868', b: '#aac27a', bloom: 1, label: 'white bracts' },
  { m: 4, d: 18, leaves: 0.9, a: '#7aa45a', b: '#8cb066', bloom: 0.3, label: 'last bracts, leafing out' },
  { m: 5, d: 1, leaves: 1, a: '#548853', b: '#63945b', bloom: 0, label: 'summer green' },
  { m: 9, d: 25, leaves: 1, a: '#60885c', b: '#8a6a48', label: 'green, first colour' },
  { m: 10, d: 25, leaves: 1, a: '#9a2e34', b: '#6e2a3c', label: 'red to maroon' },
  { m: 11, d: 20, leaves: 0.45, a: '#8a2a30', b: '#642838', carpet: 0.6, label: 'red-maroon, dropping' },
  { m: 12, d: 5, leaves: 0, a: '#7a3a34', b: '#5c3030', carpet: 1, label: 'bare over fallen leaves' },
]);

const DOGWOOD_OPTIONS: LookOption[] = [
  { id: 'A', label: 'Layered branch-mass cards', technique: 'cards', ink: 2, flat: 0.9, cardHeight: 0.22, units: { high: 16, low: 9 }, blooms: { high: 2, low: 4 }, cover: 0.85,
    note: 'The ginkgo C4 technique on the dogwood’s horizontal layers: flat masses on near-level limbs, white bracts on bare twigs in early April, red-maroon in the fall; warm silhouette ink.' },
  { id: 'B', label: 'Cored layers', technique: 'cored', ink: 2, flat: 0.9, cardHeight: 0.22, units: { high: 4, low: 3 }, blooms: { high: 0, low: 0 }, cover: 0.9,
    note: 'The same layers with a dark faceted core under the cards: fuller and more solid.' },

];

export const floweringDogwood = broadleafSpecies({
  id: 'flowering-dogwood',
  name: 'Flowering dogwood',
  carpet: true,
  bloomColour: '#edf4ff',
  // Ranges: NC State and UF ST185; GT's 339 measured dogwoods; Trees Atlanta champions (458
  // Ponce de Leon Ave, 9.1 × 13.7 m; Peachtree Christian courtyard, 12.9 × 12.2 m).
  sizes: {
    sapling: { heightM: 2.5, spreadM: 3, calliperM: 0.07 },
    young: { heightM: 5, spreadM: 6.5, calliperM: 0.2 },
    mature: { heightM: 6, spreadM: 9, calliperM: 0.35 },
    specimen: { heightM: 9.1, spreadM: 13.7, calliperM: 0.6 },
  },
  ranges: {
    sapling: { heightM: [1.5, 4], spreadM: [1, 4], calliperM: [0.03, 0.12] },
    young: { heightM: [4, 7], spreadM: [3, 7.5], calliperM: [0.12, 0.3] },
    mature: { heightM: [6, 9.3], spreadM: [4.6, 11.1], calliperM: [0.3, 0.5] },
    specimen: { heightM: [8, 12.9], spreadM: [9, 13.7], calliperM: [0.45, 0.65] },
  },
  clumps: { high: 8, low: 6 },
  offsetDays: 6,
  habit: dogwoodHabit,
  palette: dogwoodPalette,
});
export const floweringDogwoodLook: Look = {
  species: floweringDogwood, habit: dogwoodHabit, leaf: 'oval', palette: dogwoodPalette, options: DOGWOOD_OPTIONS,
  bloomColour: '#edf4ff', bloomSizeM: 0.35, bloomOffset: 0.12, bloomWash: 1, bloomLift: 1,
};
