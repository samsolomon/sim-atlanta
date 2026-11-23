/**
 * Willow oak (Quercus phellos) and water oak (Quercus nigra): Atlanta's two most common oaks.
 * Willow oak lines Downtown's streets: a straight trunk under a dense oval crown of fine,
 * willow-like leaves. Water oak fills yards and woods: a short trunk splitting into big
 * ascending leaders under a wider, more open crown, holding some leaves into winter. Sources and dates:
 * docs/tree-species.md#willow-oak and #water-oak.
 */
import { broadleafSpecies, keyedCalendar, type Look, type LookOption } from './looks';
import type { Habit } from './broadleaf';

// ---- willow oak ----------------------------------------------------------------------------

const willowHabit: Habit = {
  // Dense oblong crown; GT's median crown base is 3.7 m. Pyramidal when young, rounded later,
  // its lower limbs drooping with age (UF ST-556, VT).
  trunkTop: 0.78, crownBase: 0.2, widest: 0.42,
  limbs: { high: 4, low: 3 }, limbAngle: 0.75, limbFrom: [0.22, 0.5], limbReach: 0.72,
  ragged: 0.08, bark: '#77706a', barkDark: '#605a55',
  // Broad rounded masses that nearly close: a dense crown with only small gaps.
  mass: { r: 0.7, low: -0.6, high: 0.45 },
  bySize: {
    sapling: { crownBase: 0.3, widest: 0.32, limbAngle: 1.0, limbFrom: [0.3, 0.6] },
    young: { crownBase: 0.25, widest: 0.34, limbAngle: 0.95 },
    specimen: { trunkTop: 0.55, crownBase: 0.12, widest: 0.38, limbAngle: 0.4, limbReach: 0.85, limbFrom: [0.16, 0.4], ragged: 0.12 },
  },
};
// Atlanta dates are inferred from USA-NPN status data for the NC Piedmont (35–36°N), shifted
// a little earlier for 33.75°N, and dated Commons photographs (docs/tree-species.md#willow-oak).
const willowPalette = keyedCalendar([
  { m: 1, d: 1, leaves: 0, a: '#8f7a5c', b: '#8f7a5c', carpet: 0.45, label: 'bare grey limbs' },
  { m: 2, d: 1, leaves: 0, a: '#8f7a5c', b: '#8f7a5c', carpet: 0, label: 'bare grey limbs' },
  { m: 3, d: 18, leaves: 0, a: '#c9cf7e', b: '#d6c57a', label: 'bare, catkins' },
  { m: 3, d: 28, leaves: 0.12, a: '#c2d47a', b: '#d3c87c', label: 'buds breaking, catkins' },
  { m: 4, d: 12, leaves: 0.6, a: '#a9cc66', b: '#c3d47e', label: 'leafing out' },
  { m: 4, d: 28, leaves: 1, a: '#628f60', b: '#76a06a', label: 'summer green' },
  { m: 10, d: 20, leaves: 1, a: '#5f8b5c', b: '#729a64', label: 'summer green' },
  { m: 11, d: 5, leaves: 1, a: '#9fa448', b: '#c4a446', label: 'turning yellow' },
  { m: 11, d: 20, leaves: 0.92, a: '#dcae3e', b: '#bd7c3a', label: 'golden yellow to orange-brown' },
  { m: 12, d: 3, leaves: 0.5, a: '#b98a42', b: '#93613a', carpet: 0.7, label: 'yellow-brown, dropping' },
  { m: 12, d: 15, leaves: 0.04, a: '#8f6a44', b: '#7d5a3e', carpet: 1, label: 'nearly bare over a leaf carpet' },
]);
/**
 * A is the ginkgo's chosen technique (C4): leaf cards, warm silhouette-only ink, leaf tips close
 * up. B and C stay for comparison.
 */
const OAK_OPTIONS: LookOption[] = [
  { id: 'A', label: 'Branch-mass cards', technique: 'cards', ink: 2, tips: 3, units: { high: 26, low: 12 }, cover: 0.75,
    note: 'The ginkgo’s C4 technique on an oak’s structure: each scaffold limb ends in a broad rounded mass of small leaf clusters, lit on top and shaded beneath, with warm silhouette-only ink and leaf tips on the nearest trees.' },
  { id: 'B', label: 'Cored masses', technique: 'cored', ink: 2, units: { high: 12, low: 10 }, cover: 0.8,
    note: 'The same branch masses, each with a dark faceted core under its leaf cards: fuller and more solid, fewer leaves at the edge.' },
  { id: 'C', label: 'Faceted clusters', technique: 'lobes', facets: 3, units: { high: 17, low: 12 }, cover: 0.78,
    note: 'The same branch masses as faceted clusters with every facet inked: the house clump style, for comparison.' },
];

export const willowOak = broadleafSpecies({
  id: 'willow-oak',
  name: 'Willow oak',
  carpet: true,
  // Ranges: NC State, Clemson and UF ST-556; ANSI Z60.1 nursery heights; GT's 478 measured
  // willow oaks by DBH class; Trees Atlanta champions (docs/tree-species.md#willow-oak).
  sizes: {
    sapling: { heightM: 4.5, spreadM: 1.8, calliperM: 0.06 },
    young: { heightM: 10.5, spreadM: 5.4, calliperM: 0.2 },
    mature: { heightM: 18, spreadM: 13.5, calliperM: 0.55 },
    specimen: { heightM: 32, spreadM: 32, calliperM: 1.8 },
  },
  ranges: {
    sapling: { heightM: [3, 5.5], spreadM: [1.2, 2.5], calliperM: [0.04, 0.1] },
    young: { heightM: [5, 12], spreadM: [3, 7], calliperM: [0.1, 0.3] },
    mature: { heightM: [12.2, 22.9], spreadM: [7.6, 15.2], calliperM: [0.3, 0.75] },
    specimen: { heightM: [24, 34.3], spreadM: [20, 38.4], calliperM: [1, 1.9] },
  },
  clumps: { high: 13, low: 7 },
  offsetDays: 7,
  habit: willowHabit,
  palette: willowPalette,
});
export const willowOakLook: Look = { species: willowOak, habit: willowHabit, leaf: 'narrow', options: OAK_OPTIONS, palette: willowPalette, lowLift: 0.04 };

// ---- water oak -----------------------------------------------------------------------------

const waterHabit: Habit = {
  // Spreading, rounded, open; a short trunk splits into big ascending leaders a few metres up
  // (UF ST-553, VT, the Arlington photographs). GT's median crown base is 4.6 m.
  trunkTop: 0.42, crownBase: 0.2, widest: 0.45,
  limbs: { high: 4, low: 3 }, limbAngle: 0.85, limbFrom: [0.2, 0.36], limbReach: 0.8,
  ragged: 0.2, bark: '#57534d', barkDark: '#46433e',
  // Like the willow oak's but bigger, lumpier and lower on the wide crown.
  mass: { r: 0.74, low: -0.42, high: 0.4 },
  bySize: {
    sapling: { crownBase: 0.3, widest: 0.4, limbAngle: 1.0, trunkTop: 0.75, limbFrom: [0.3, 0.6] },
    young: { crownBase: 0.25, widest: 0.42, limbAngle: 0.95, trunkTop: 0.65, limbFrom: [0.25, 0.5] },
    specimen: { trunkTop: 0.3, crownBase: 0.14, widest: 0.42, limbAngle: 0.55, limbReach: 0.9, limbFrom: [0.14, 0.28], ragged: 0.22 },
  },
};
// Semi-evergreen at Atlanta's latitude: USA-NPN north of 33.5°N puts the crown at about 37%
// in December and near bare by February; a yellow week in fall (UF). Dates inferred between
// the NC and Alabama data and Georgia photographs (docs/tree-species.md#water-oak).
const waterPalette = keyedCalendar([
  { m: 1, d: 1, leaves: 0.25, a: '#5f6f3c', b: '#8d7448', carpet: 0.5, label: 'a few green and brown leaves held' },
  { m: 2, d: 10, leaves: 0.06, a: '#66703f', b: '#917a4c', carpet: 0.3, label: 'nearly bare' },
  { m: 3, d: 8, leaves: 0.04, a: '#a8c36a', b: '#c4c676', label: 'buds breaking, catkins' },
  { m: 3, d: 28, leaves: 0.45, a: '#9cc262', b: '#b7ca72', label: 'leafing out' },
  { m: 4, d: 20, leaves: 1, a: '#62935f', b: '#70a067', label: 'summer green' },
  { m: 10, d: 31, leaves: 1, a: '#60905c', b: '#6e9d64', label: 'summer green' },
  { m: 11, d: 22, leaves: 0.9, a: '#6d8a3e', b: '#c9ac3a', label: 'yellowing, still partly green' },
  { m: 12, d: 5, leaves: 0.6, a: '#6c7c3c', b: '#a58447', carpet: 0.35, label: 'green, yellow and brown' },
  { m: 12, d: 20, leaves: 0.37, a: '#62723c', b: '#8f7546', carpet: 0.6, label: 'holding a third of its leaves' },
]);
export const waterOak = broadleafSpecies({
  id: 'water-oak',
  name: 'Water oak',
  carpet: true,
  // Ranges: NC State, Clemson and UF ST-553; nursery heights as a Type 1 shade tree (inferred);
  // GT's 446 measured water oaks by DBH class; Trees Atlanta champions, wider than tall.
  sizes: {
    sapling: { heightM: 4.5, spreadM: 2.2, calliperM: 0.06 },
    young: { heightM: 11, spreadM: 6.4, calliperM: 0.22 },
    mature: { heightM: 18, spreadM: 15, calliperM: 0.65 },
    specimen: { heightM: 25.7, spreadM: 30, calliperM: 1.8 },
  },
  ranges: {
    sapling: { heightM: [3, 5.5], spreadM: [1.2, 3], calliperM: [0.04, 0.1] },
    young: { heightM: [6, 13], spreadM: [3, 8], calliperM: [0.1, 0.3] },
    mature: { heightM: [15.2, 24.4], spreadM: [10, 21.3], calliperM: [0.4, 0.92] },
    specimen: { heightM: [23.8, 31.2], spreadM: [24.4, 35.1], calliperM: [1.6, 2.02] },
  },
  clumps: { high: 13, low: 7 },
  offsetDays: 10,
  habit: waterHabit,
  palette: waterPalette,
});
export const waterOakLook: Look = {
  species: waterOak, habit: waterHabit, leaf: 'spatulate', palette: waterPalette, lowLift: -0.025,
  // Denser and darker than the willow oak, with bigger, lumpier masses and coarser leaves.
  options: OAK_OPTIONS.map(o => ({ ...o, cover: (o.cover ?? 0.62) * 1.08 })),
};
