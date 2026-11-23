/**
 * Red Japanese maple (Acer palmatum, red-leaved cultivars): the colour accents of Ansley Park
 * and Midtown's yards and traffic islands. A low, wide, layered umbrella on several leaning
 * trunks with fine twigs; deep red-purple through the summer and vivid scarlet to crimson late
 * in the fall. Each tree takes one colourway by its seed: scarlet-crimson (most), Bloodgood
 * burgundy, or orange-red. Sam's Ansley walk, 23 Nov 2026, and docs/tree-species.md#japanese-maple.
 */
import { broadleafSpecies, keyedCalendar, type Key, type Look, type LookOption } from './looks';
import type { Habit } from './broadleaf';

const habit: Habit = {
  // Several leaning trunks into a low, wide, layered crown, widest near the top (an umbrella).
  stems: 3,
  trunkTop: 0.55, crownBase: 0.22, widest: 0.6,
  limbs: { high: 3, low: 3 }, limbAngle: 0.45, limbFrom: [0.2, 0.5], limbReach: 0.9,
  ragged: 0.15, bark: '#7a7470', barkDark: '#635a56',
  mass: { r: 0.6, low: -0.35, high: 0.6 },
  bySize: {
    sapling: { stems: 2, widest: 0.5 },
    specimen: { stems: 4, widest: 0.62 },
  },
};

/**
 * One colourway's year. Leaf-out is early (UF, MoBot); colour peaks in mid-November near Atlanta
 * (Gibbs Gardens' "Japanese Maples Colorfest", Nov 1–17) and leaves are down by early December
 * (inferred; no dated Georgia leaf-drop source).
 */
const year = (spring: [string, string], summer: [string, string], fall: [string, string], late: [string, string]): Key[] => [
  { m: 1, d: 1, leaves: 0, a: '#6a5a56', b: '#6a5a56', carpet: 0.25, label: 'bare, fine grey twigs' },
  { m: 2, d: 1, leaves: 0, a: '#6a5a56', b: '#6a5a56', carpet: 0, label: 'bare, fine grey twigs' },
  { m: 3, d: 18, leaves: 0.1, a: spring[0], b: spring[1], label: 'leafing out' },
  { m: 4, d: 8, leaves: 1, a: spring[0], b: spring[1], label: 'new leaves' },
  { m: 5, d: 10, leaves: 1, a: summer[0], b: summer[1], label: 'summer colour' },
  { m: 10, d: 25, leaves: 1, a: summer[0], b: summer[1], label: 'summer colour' },
  { m: 11, d: 14, leaves: 1, a: fall[0], b: fall[1], label: 'peak fall colour' },
  { m: 11, d: 28, leaves: 0.75, a: late[0], b: late[1], carpet: 0.4, label: 'fall colour, dropping' },
  { m: 12, d: 10, leaves: 0.04, a: late[0], b: late[1], carpet: 1, label: 'bare over fallen leaves' },
];
// Scarlet-crimson (atropurpureum type): red spring, bronze-red summer (it greens and bronzes in
// southern heat, NC State, UF), vivid scarlet to crimson in the fall.
const scarlet = keyedCalendar(year(['#b4383a', '#c8504a'], ['#6e4238', '#7c5040'], ['#d42c2a', '#b81c30'], ['#b42a28', '#9c1e2c']));
// Bloodgood: "deep burgundy spring and summer foliage", "bright crimson in fall" (NC State).
const bloodgood = keyedCalendar(year(['#8c2a3a', '#a03848'], ['#5c2a38', '#6e3040'], ['#a81c30', '#8c1830'], ['#8c1c2c', '#741a28']));
// Orange-red: green in summer, orange-red in the fall.
const orange = keyedCalendar(year(['#a8b85c', '#c0a050'], ['#5f8a4e', '#6e9656'], ['#dc5a28', '#e07a2c'], ['#c44a24', '#b8542a']));

const OPTIONS: LookOption[] = [
  { id: 'A', label: 'Layered branch-mass cards', technique: 'cards', ink: 2, tips: 3, flat: 0.45, units: { high: 20, low: 10 }, cover: 0.82,
    note: 'The ginkgo C4 technique on a low, wide, layered umbrella: small palmate leaves in flat-topped masses on several leaning trunks; warm silhouette ink and leaf tips close up.' },
  { id: 'B', label: 'Cored masses', technique: 'cored', ink: 2, flat: 0.45, units: { high: 9, low: 8 }, cover: 0.85,
    note: 'The same masses with a dark faceted core under the cards: fuller and more solid.' },
  { id: 'C', label: 'Faceted layers', technique: 'lobes', facets: 4, squash: 0.7, flat: 0.5, units: { high: 11, low: 9 }, cover: 0.9,
    note: 'The same masses as flattened faceted clusters with every facet inked: the house style, for comparison.' },
];

export const japaneseMaple = broadleafSpecies({
  id: 'japanese-maple',
  name: 'Japanese maple',
  carpet: true,
  // Ranges: NC State (species and 'Bloodgood'), UF ST023, Missouri Botanical Garden; GT's 86
  // measured Japanese maples by DBH class (as wide as tall at the median). No Atlanta champion
  // Acer palmatum is recorded. Calliper is the largest stem's.
  sizes: {
    sapling: { heightM: 2.4, spreadM: 2.4, calliperM: 0.05 },
    young: { heightM: 4.2, spreadM: 4, calliperM: 0.12 },
    mature: { heightM: 5, spreadM: 5.5, calliperM: 0.2 },
    specimen: { heightM: 7.5, spreadM: 8, calliperM: 0.35 },
  },
  ranges: {
    sapling: { heightM: [1.5, 3], spreadM: [1, 3], calliperM: [0.02, 0.08] },
    young: { heightM: [2.5, 5], spreadM: [2, 5], calliperM: [0.06, 0.18] },
    mature: { heightM: [4.5, 7.6], spreadM: [3.7, 7.6], calliperM: [0.12, 0.3] },
    specimen: { heightM: [6, 9.4], spreadM: [6, 10.2], calliperM: [0.2, 0.57] },
  },
  clumps: { high: 13, low: 7 },
  offsetDays: 7,
  habit,
  palette: scarlet,
});
export const japaneseMapleLook: Look = {
  species: japaneseMaple, habit, leaf: 'palmate', palette: scarlet, options: OPTIONS,
  // Scarlet-crimson is the dominant look (Sam); Bloodgood burgundy and orange-red appear too.
  varieties: [scarlet, scarlet, scarlet, bloodgood, orange],
};
