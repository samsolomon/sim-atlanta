/**
 * Loblolly pine (Pinus taeda) and tulip poplar (Liriodendron tulipifera): the tall trees of
 * Atlanta's yards and woods. The loblolly carries a high, open, irregular crown on a long clear
 * red-brown trunk, its needles in tufts at the tips of bare twigs. The tulip poplar is the
 * straightest and tallest: a column of trunk under a narrow oval crown of coarse, square-tipped
 * leaves that turn yellow early. Sources and dates: docs/tree-species.md#loblolly-pine and
 * #tulip-poplar.
 */
import { broadleafSpecies, keyedCalendar, type Look, type LookOption } from './looks';
import type { Habit } from './broadleaf';

// ---- loblolly pine -------------------------------------------------------------------------

const pineHabit: Habit = {
  // "Loosely pyramidal in youth … a dense oval crown at maturity as it loses its lower branches"
  // (NC State); open, irregular, fine (UF ST478). GT's median crown base is a third of height.
  trunkTop: 0.96, crownBase: 0.4, widest: 0.42,
  limbs: { high: 4, low: 3 }, limbAngle: 0.35, limbFrom: [0.45, 0.8], limbReach: 0.8,
  ragged: 0.25, bark: '#7d5c48', barkDark: '#5f4a3d',
  // Tufts at the branch ends with sky between them.
  mass: { r: 0.85, low: -0.75, high: 0.5 },
  bySize: {
    sapling: { crownBase: 0.08, widest: 0.25, limbAngle: 0.25, limbFrom: [0.15, 0.6], mass: { r: 0.6, low: -0.85, high: 0.4 } },
    young: { crownBase: 0.2, widest: 0.32, limbFrom: [0.25, 0.7], mass: { r: 0.58, low: -0.75, high: 0.45 } },
    specimen: { crownBase: 0.55, widest: 0.55, limbAngle: 0.25, limbFrom: [0.58, 0.85], ragged: 0.3 },
  },
};

// Evergreen. Interior needles brown and shed in their third year, Oct–Nov, while tips stay
// green (NC State, UGA Extension, a dated 17 Nov 2018 photo); "light green to brown during the
// winter" (UF); pollen from late Feb or early Mar (Georgia Forestry Commission); new candles in
// spring (inferred). The carpet is pine straw.
const pinePalette = keyedCalendar([
  { m: 1, d: 10, leaves: 1, a: '#405f42', b: '#5a6a4c', carpet: 0.55, label: 'winter green, dulled' },
  { m: 3, d: 5, leaves: 1, a: '#3e6442', b: '#a09a52', carpet: 0.4, label: 'pollen, yellow-green candles' },
  { m: 4, d: 15, leaves: 1, a: '#3c6842', b: '#86a868', carpet: 0.3, label: 'new candles' },
  { m: 6, d: 1, leaves: 1, a: '#467250', b: '#567e5c', carpet: 0.25, label: 'summer green' },
  { m: 9, d: 25, leaves: 1, a: '#467250', b: '#5a8060', carpet: 0.25, label: 'summer green' },
  { m: 11, d: 5, leaves: 0.93, a: '#43704a', b: '#7d6f48', carpet: 0.6, label: 'inner needles orange-brown, shedding' },
  { m: 12, d: 10, leaves: 1, a: '#3e6242', b: '#7a7048', carpet: 0.75, label: 'green over fresh pine straw' },
]);

const PINE_OPTIONS: LookOption[] = [
  { id: 'A', label: 'Needle-tuft cards', technique: 'cards', ink: 2, tips: 3, flat: 0.55, units: { high: 26, low: 12 }, cover: 0.72,
    note: 'Leaf cards painted with needle bursts, gathered into flat tufts at the branch ends with sky between them, on a long clear trunk; warm silhouette ink and needle tips close up (the ginkgo C4 technique).' },
  { id: 'B', label: 'Needle stars', technique: 'stars', ink: 2, flat: 0.55, units: { high: 17, low: 12 }, cover: 1.0,
    note: 'Each tuft is a star of six thin needle triangles: geometric, crisp at a distance, no texture.' },
  { id: 'C', label: 'Tiered pads', technique: 'lobes', facets: 4, squash: 0.6, flat: 0.8, units: { high: 12, low: 9 }, cover: 0.95,
    note: 'Flattened faceted pads at the branch ends, every facet inked: the storybook pine, for comparison.' },
];

export const loblollyPine = broadleafSpecies({
  id: 'loblolly-pine',
  name: 'Loblolly pine',
  carpet: true,
  // Ranges: NC State, UF ST478 and USFS FEIS; GT's 957 measured loblollies by DBH class; Trees
  // Atlanta champions. No nursery size was found: the sapling class is inferred.
  sizes: {
    sapling: { heightM: 4.5, spreadM: 2, calliperM: 0.07 },
    young: { heightM: 14, spreadM: 4.5, calliperM: 0.22 },
    mature: { heightM: 22, spreadM: 12, calliperM: 0.5 },
    specimen: { heightM: 38, spreadM: 17, calliperM: 1 },
  },
  ranges: {
    sapling: { heightM: [3, 6], spreadM: [1.2, 3], calliperM: [0.04, 0.1] },
    young: { heightM: [7, 16.5], spreadM: [2.4, 6], calliperM: [0.1, 0.3] },
    mature: { heightM: [18.3, 27.4], spreadM: [6.1, 12.2], calliperM: [0.3, 0.76] },
    specimen: { heightM: [30, 45.1], spreadM: [12.2, 20.1], calliperM: [0.76, 1.12] },
  },
  // The clump model draws faceted tufts at the branch masses; a cone form would need its own pads.
  clumps: { high: 13, low: 7 },
  offsetDays: 8,
  habit: pineHabit,
  palette: pinePalette,
});
export const loblollyPineLook: Look = { species: loblollyPine, habit: pineHabit, leaf: 'needles', options: PINE_OPTIONS, palette: pinePalette };

// ---- tulip poplar --------------------------------------------------------------------------

const poplarHabit: Habit = {
  // "A fairly narrow oval crown, even as it grows older … a straight trunk … several
  // large-diameter major limbs in the top half of the crown" (UF ST363). Coarse texture.
  trunkTop: 0.92, crownBase: 0.3, widest: 0.5,
  limbs: { high: 4, low: 3 }, limbAngle: 0.95, limbFrom: [0.38, 0.72], limbReach: 0.75,
  ragged: 0.12, bark: '#8a877a', barkDark: '#6d695d',
  mass: { r: 0.72, low: -0.55, high: 0.5 },
  bySize: {
    sapling: { crownBase: 0.2, widest: 0.38, limbFrom: [0.25, 0.65] },
    young: { crownBase: 0.22, widest: 0.42, limbFrom: [0.3, 0.7] },
    specimen: { crownBase: 0.42, widest: 0.5, limbAngle: 0.75, limbFrom: [0.48, 0.78], ragged: 0.16 },
  },
};

// GA USA-NPN (6 sites): buds break Mar–Apr; every record coloured in October; 9 of 10 November
// records still in leaf, none in December. Golden yellow (NC State), often early, and drought
// can yellow it in late summer. Flowers high in the crown, late Apr–May, hard to see.
const poplarPalette = keyedCalendar([
  { m: 1, d: 1, leaves: 0, a: '#9a8c5c', b: '#9a8c5c', carpet: 0.35, label: 'bare, pale fruit on the twigs' },
  { m: 2, d: 1, leaves: 0, a: '#9a8c5c', b: '#9a8c5c', carpet: 0, label: 'bare, pale fruit on the twigs' },
  { m: 3, d: 22, leaves: 0.08, a: '#b6d277', b: '#c9d98a', label: 'buds breaking' },
  { m: 4, d: 12, leaves: 0.7, a: '#86b26e', b: '#9cc07a', label: 'leafing out' },
  { m: 4, d: 30, leaves: 1, a: '#56845a', b: '#679462', label: 'bright summer green' },
  { m: 9, d: 10, leaves: 1, a: '#548258', b: '#90985a', label: 'green, a few early yellow leaves' },
  { m: 10, d: 12, leaves: 0.95, a: '#d6bd42', b: '#e2a83a', label: 'golden yellow' },
  { m: 11, d: 2, leaves: 0.55, a: '#d2a83c', b: '#b88a3e', carpet: 0.7, label: 'yellow, dropping' },
  { m: 11, d: 18, leaves: 0.03, a: '#a8884a', b: '#9a7a46', carpet: 1, label: 'bare over a yellow-brown carpet' },
]);

const POPLAR_OPTIONS: LookOption[] = [
  { id: 'A', label: 'Branch-mass cards', technique: 'cards', ink: 2, tips: 3, units: { high: 26, low: 12 }, cover: 0.72,
    note: 'The ginkgo C4 technique on the poplar’s structure: big square-tipped leaves on rounded masses at the ends of ascending limbs, high on a tall clear trunk; warm silhouette ink and leaf tips close up.' },
  { id: 'B', label: 'Cored masses', technique: 'cored', ink: 2, units: { high: 12, low: 10 }, cover: 0.78,
    note: 'The same masses with a dark faceted core under the cards: fuller and more solid.' },
  { id: 'C', label: 'Faceted clusters', technique: 'lobes', facets: 4, units: { high: 13, low: 9 }, cover: 0.95,
    note: 'The same masses as coarse faceted clusters with every facet inked: the house style, for comparison.' },
];

export const tulipPoplar = broadleafSpecies({
  id: 'tulip-poplar',
  name: 'Tulip poplar',
  carpet: true,
  // Ranges: NC State, UF ST363 and USFS FEIS; GT's 359 measured trees by DBH class; Trees
  // Atlanta champions, the city's tallest trees (44.3 m; 50.6 m at Bitsy Grant).
  sizes: {
    sapling: { heightM: 5, spreadM: 2.2, calliperM: 0.07 },
    young: { heightM: 12.3, spreadM: 4.5, calliperM: 0.2 },
    mature: { heightM: 27, spreadM: 11, calliperM: 0.65 },
    specimen: { heightM: 44, spreadM: 24, calliperM: 1.5 },
  },
  ranges: {
    sapling: { heightM: [3, 7], spreadM: [1.2, 3.5], calliperM: [0.04, 0.12] },
    young: { heightM: [7, 14], spreadM: [3, 6], calliperM: [0.12, 0.3] },
    mature: { heightM: [19.2, 36.6], spreadM: [7.6, 18.3], calliperM: [0.3, 0.91] },
    specimen: { heightM: [36.6, 50.6], spreadM: [17.1, 29.9], calliperM: [0.91, 1.9] },
  },
  clumps: { high: 13, low: 7 },
  offsetDays: 8,
  habit: poplarHabit,
  palette: poplarPalette,
});
export const tulipPoplarLook: Look = { species: tulipPoplar, habit: poplarHabit, leaf: 'tulip', options: POPLAR_OPTIONS, palette: poplarPalette, lowLift: -0.03 };
