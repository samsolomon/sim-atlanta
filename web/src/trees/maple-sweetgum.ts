/**
 * Red maple (Acer rubrum) and sweetgum (Liquidambar styraciflua): Atlanta's fall colour. Red
 * maple is a rounded, ascending crown on a smooth grey trunk that hazes red with flowers in late
 * winter and turns scarlet early in the fall. Sweetgum keeps a straight leader under a crown of
 * glossy star leaves, pyramidal when young and oval later, and turns late: purple, red, orange
 * and yellow on one tree, with spiny gumballs hanging through the winter. Sources and dates:
 * docs/tree-species.md#red-maple and #sweetgum.
 */
import { broadleafSpecies, keyedCalendar, type Look, type LookOption } from './looks';
import type { Habit } from './broadleaf';

const OPTIONS = (leafy: string): LookOption[] => [
  { id: 'A', label: 'Branch-mass cards', technique: 'cards', ink: 2, tips: 3, units: { high: 26, low: 12 }, cover: 0.74,
    note: `The ginkgo C4 technique on the species' structure: ${leafy}; warm silhouette ink and leaf tips close up.` },
  { id: 'B', label: 'Cored masses', technique: 'cored', ink: 2, units: { high: 12, low: 10 }, cover: 0.8,
    note: 'The same masses with a dark faceted core under the cards: fuller and more solid.' },
  { id: 'C', label: 'Faceted clusters', technique: 'lobes', facets: 4, units: { high: 13, low: 9 }, cover: 0.85,
    note: 'The same masses as faceted clusters with every facet inked: the house style, for comparison.' },
];

// ---- red maple -----------------------------------------------------------------------------

const mapleHabit: Habit = {
  // "A rounded crown and ascending branches" (NC State); oval to round, medium texture (UF
  // ST041). Smooth light grey bark when young; twigs "slender, red, and shiny". GT crown base
  // is about a quarter of height.
  trunkTop: 0.85, crownBase: 0.2, widest: 0.46,
  limbs: { high: 4, low: 3 }, limbAngle: 0.85, limbFrom: [0.24, 0.58], limbReach: 0.78,
  ragged: 0.12, bark: '#8a7670', barkDark: '#7d7c78',
  mass: { r: 0.7, low: -0.6, high: 0.45 },
  bySize: {
    sapling: { crownBase: 0.25, widest: 0.42, limbAngle: 0.95 },
    young: { crownBase: 0.22, widest: 0.45 },
    specimen: { trunkTop: 0.6, crownBase: 0.16, widest: 0.42, limbAngle: 0.7, limbReach: 0.85, ragged: 0.16 },
  },
};

// GA USA-NPN (8 sites): open flowers Jan–Apr (most in Feb–Mar), leaves from March, coloured
// leaves Sep–Nov (23 of 28 October records), none in leaf in December (0 of 3). Colour "may vary
// from tree to tree" (NC State); trees spread ±8 days, so none holds leaves into December. The late-winter flower haze is drawn
// as a thin red crown.
const maplePalette = keyedCalendar([
  { m: 1, d: 1, leaves: 0, a: '#7c6e66', b: '#7c6e66', carpet: 0.3, label: 'bare grey limbs, red buds' },
  { m: 1, d: 28, leaves: 0.16, a: '#b23a36', b: '#c8503c', label: 'red flowers in the bare crown' },
  { m: 3, d: 5, leaves: 0.22, a: '#a8443c', b: '#c4684c', label: 'red seed keys, first leaves' },
  { m: 3, d: 28, leaves: 0.55, a: '#86a462', b: '#b07052', label: 'leafing out among red keys' },
  { m: 4, d: 22, leaves: 1, a: '#6fa06c', b: '#80ad74', label: 'summer green' },
  { m: 9, d: 18, leaves: 1, a: '#639262', b: '#9a6a46', label: 'green, the first red leaves' },
  { m: 10, d: 24, leaves: 1, a: '#c23a2c', b: '#d6782e', label: 'scarlet to orange' },
  { m: 11, d: 8, leaves: 0.5, a: '#b03a2e', b: '#c98c3a', carpet: 0.7, label: 'red and yellow, dropping' },
  { m: 11, d: 22, leaves: 0.03, a: '#8e4a36', b: '#9a6a3a', carpet: 1, label: 'bare over a red leaf carpet' },
]);

export const redMaple = broadleafSpecies({
  id: 'red-maple',
  name: 'Red maple',
  carpet: true,
  // Ranges: NC State, UF ST041 and USFS FEIS; GT's 519 measured red maples by DBH class; Trees
  // Atlanta's champion (McLendon Ave, 2011). No nursery size was found.
  sizes: {
    sapling: { heightM: 4.5, spreadM: 2, calliperM: 0.06 },
    young: { heightM: 10.7, spreadM: 5.6, calliperM: 0.2 },
    mature: { heightM: 15, spreadM: 10, calliperM: 0.45 },
    specimen: { heightM: 22, spreadM: 17, calliperM: 0.9 },
  },
  ranges: {
    sapling: { heightM: [3, 6.5], spreadM: [1.2, 3], calliperM: [0.04, 0.1] },
    young: { heightM: [6, 12], spreadM: [3, 7], calliperM: [0.1, 0.3] },
    mature: { heightM: [12.2, 22.9], spreadM: [7.6, 15.2], calliperM: [0.3, 0.76] },
    specimen: { heightM: [18.9, 33.3], spreadM: [12, 18.3], calliperM: [0.76, 0.97] },
  },
  clumps: { high: 13, low: 7 },
  offsetDays: 8,
  habit: mapleHabit,
  palette: maplePalette,
});
export const redMapleLook: Look = {
  species: redMaple, habit: mapleHabit, leaf: 'palmate', palette: maplePalette, lowLift: -0.025,
  options: OPTIONS('dense, rounded clusters on ascending limbs'),
};

// ---- sweetgum ------------------------------------------------------------------------------

const gumHabit: Habit = {
  // "Grows in a narrow pyramid … developing a more oval or rounded canopy as it grows older";
  // the trunk "is normally straight and does not divide" (UF ST358). Grey-brown, deeply
  // furrowed bark. GT crown base is about 0.28 of height.
  trunkTop: 0.94, crownBase: 0.27, widest: 0.38,
  limbs: { high: 4, low: 3 }, limbAngle: 0.5, limbFrom: [0.3, 0.75], limbReach: 0.8,
  ragged: 0.14, bark: '#7a6e62', barkDark: '#5e544a',
  mass: { r: 0.66, low: -0.65, high: 0.62 },
  bySize: {
    sapling: { crownBase: 0.12, widest: 0.22, limbFrom: [0.18, 0.75], mass: { r: 0.7, low: -0.85, high: 0.3 } },
    young: { crownBase: 0.15, widest: 0.25, limbFrom: [0.2, 0.78], mass: { r: 0.68, low: -0.8, high: 0.35 } },
    specimen: { crownBase: 0.3, widest: 0.42, limbAngle: 0.45, ragged: 0.18 },
  },
};

// Colours late and holds its leaves long (NC State): "a brilliant mixture of yellows, oranges,
// purples and reds", and in USDA zones 8–9 colour comes in early winter (UF). The Georgia
// Forestry Commission saw "purple to yellow and some red" in NE Georgia on 11 Nov 2021. Tones
// A and B run yellow-orange to purple, so every cluster lands somewhere between.
const gumPalette = keyedCalendar([
  { m: 1, d: 1, leaves: 0, a: '#6e6052', b: '#6e6052', carpet: 0.3, label: 'bare, dark gumballs hanging' },
  { m: 2, d: 1, leaves: 0, a: '#6e6052', b: '#6e6052', carpet: 0, label: 'bare, dark gumballs hanging' },
  { m: 3, d: 30, leaves: 0.08, a: '#a9c86c', b: '#b8d07a', label: 'buds breaking' },
  { m: 4, d: 20, leaves: 0.7, a: '#86b462', b: '#98c06a', label: 'leafing out' },
  { m: 5, d: 5, leaves: 1, a: '#5c955f', b: '#6aa16a', label: 'glossy deep green' },
  { m: 10, d: 18, leaves: 1, a: '#58905c', b: '#728f52', label: 'glossy deep green' },
  { m: 11, d: 5, leaves: 1, a: '#9c9c40', b: '#9a4848', label: 'turning, green to red' },
  { m: 11, d: 22, leaves: 0.95, a: '#dca434', b: '#7a2e54', label: 'purple, red, orange and yellow' },
  { m: 12, d: 8, leaves: 0.55, a: '#c8742e', b: '#7c3248', carpet: 0.6, label: 'red-orange and purple, dropping' },
  { m: 12, d: 22, leaves: 0.05, a: '#9a5a3a', b: '#6a3a40', carpet: 1, label: 'bare over star leaves' },
]);

export const sweetgum = broadleafSpecies({
  id: 'sweetgum',
  name: 'Sweetgum',
  carpet: true,
  // Ranges: NC State, UF ST358 and USFS FEIS; GT's 88 measured sweetgums by DBH class; Trees
  // Atlanta champions (Peachtree Battle, 2025; Parkwood Park, Decatur, 2014).
  sizes: {
    sapling: { heightM: 5, spreadM: 2, calliperM: 0.07 },
    young: { heightM: 13, spreadM: 4.3, calliperM: 0.2 },
    mature: { heightM: 24, spreadM: 13, calliperM: 0.7 },
    specimen: { heightM: 36.6, spreadM: 27.4, calliperM: 1.25 },
  },
  ranges: {
    sapling: { heightM: [3, 8.7], spreadM: [1.2, 3], calliperM: [0.04, 0.1] },
    young: { heightM: [7, 15], spreadM: [3, 7], calliperM: [0.1, 0.3] },
    mature: { heightM: [18.3, 30.5], spreadM: [10.7, 16.7], calliperM: [0.3, 0.91] },
    specimen: { heightM: [27.9, 42.2], spreadM: [16.7, 27.4], calliperM: [0.91, 1.25] },
  },
  clumps: { high: 13, low: 7 },
  offsetDays: 8,
  habit: gumHabit,
  palette: gumPalette,
});
export const sweetgumLook: Look = {
  species: sweetgum, habit: gumHabit, leaf: 'star', palette: gumPalette, lowLift: -0.03,
  options: OPTIONS('glossy star leaves in rounded masses along a straight leader'),
};
