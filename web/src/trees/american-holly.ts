/** American holly (Ilex opaca), a fruiting female exemplar for the Model Lab. */
import type { Habit } from './broadleaf';
import { broadleafSpecies, keyedCalendar, type Look } from './looks';

const habit: Habit = {
  trunkTop: 0.68, crownBase: 0.12, widest: 0.30,
  limbs: { high: 4, low: 3 }, limbAngle: 0.33, limbFrom: [0.16, 0.59], limbReach: 0.94,
  ragged: 0.07, bark: '#8e8577', barkDark: '#7b7468',
  mass: { r: 0.59, low: -0.73, high: 0.83 },
  tiers: { high: [3, 3, 2, 1], low: [3, 2, 1] },
  cone: 0.46, taper: 0.24,
  bySize: {
    sapling: { crownBase: 0.11, tiers: { high: [3, 2, 1], low: [2, 1] } },
    specimen: { crownBase: 0.18, widest: 0.33, cone: 0.48 },
  },
};
const palette = keyedCalendar([
  { m: 1, d: 1, leaves: 1, a: '#5e885d', b: '#76985f', bloom: 0.84, label: 'evergreen with red fruit' },
  { m: 2, d: 20, leaves: 1, a: '#5e885d', b: '#76985f', bloom: 0.30, label: 'a few remaining red fruits' },
  { m: 3, d: 21, leaves: 1, a: '#60885c', b: '#77995d', label: 'evergreen foliage' },
  { m: 5, d: 4, leaves: 1, a: '#678f5e', b: '#829f61', label: 'fresh spring growth over evergreen foliage' },
  { m: 6, d: 19, leaves: 1, a: '#649065', b: '#7a9f64', label: 'leathery green foliage' },
  { m: 9, d: 16, leaves: 1, a: '#5e865d', b: '#73985d', bloom: 0.1, label: 'first red fruit' },
  { m: 10, d: 25, leaves: 1, a: '#5e885d', b: '#76985f', bloom: 1, label: 'red fruit on evergreen branches' },
  { m: 12, d: 6, leaves: 1, a: '#5e885d', b: '#76985f', bloom: 1, label: 'red fruit on evergreen branches' },
]);

export const americanHolly = broadleafSpecies({
  id: 'american-holly', name: 'American holly', carpet: false, habit, palette,
  sizes: {
    sapling: { heightM: 2.1, spreadM: 1.25, calliperM: 0.04 },
    young: { heightM: 4.5, spreadM: 2.45, calliperM: 0.1 },
    mature: { heightM: 10.5, spreadM: 4.7, calliperM: 0.30 },
    specimen: { heightM: 15, spreadM: 6.1, calliperM: 0.52 },
  },
  ranges: {
    sapling: { heightM: [1.5, 3], spreadM: [0.7, 1.6], calliperM: [0.025, 0.07] },
    young: { heightM: [3, 6.5], spreadM: [1.5, 3.4], calliperM: [0.06, 0.16] },
    mature: { heightM: [8.5, 12.5], spreadM: [3.4, 5.9], calliperM: [0.22, 0.4] },
    specimen: { heightM: [12.5, 18], spreadM: [4.7, 6.6], calliperM: [0.35, 0.65] },
  },
  clumps: { high: 12, low: 7 }, offsetDays: 7,
});
export const americanHollyLook: Look = {
  species: americanHolly, habit, leaf: 'holly', palette, cardLeafM: 0.22,
  bloomColour: '#cf342c', bloomSizeM: 0.62, bloomLift: 0.65,
  options: [{ id: 'A', label: 'Fruiting evergreen', technique: 'cards', ink: 2,
    units: { high: 25, low: 17 }, cover: 1.12, blooms: { high: 14, low: 11 },
    note: 'A fruiting female exemplar with evergreen, spiny-margined leaves, a dense pyramidal crown and red fall-to-winter fruit.' }],
};
