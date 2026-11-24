/** White oak (Quercus alba): broad pale-limbed crown, rounded lobes and russet fall.
 * Sources, size-class assumptions and Georgia calendar: docs/tree-species.md#white-oak.
 */
import { broadleafSpecies, keyedCalendar, type Look, type LookOption } from './looks';
import type { Habit } from './broadleaf';

const habit: Habit = {
  trunkTop: 0.48, crownBase: 0.25, widest: 0.43,
  limbs: { high: 4, low: 3 }, limbAngle: 0.55, limbFrom: [0.22, 0.44], limbReach: 0.9,
  ragged: 0.18, bark: '#a29e95', barkDark: '#85827b',
  mass: { r: 0.72, low: -0.45, high: 0.42 },
  bySize: {
    sapling: { trunkTop: 0.8, crownBase: 0.3, widest: 0.3, limbAngle: 1, limbFrom: [0.3, 0.65] },
    young: { trunkTop: 0.65, crownBase: 0.25, widest: 0.35, limbAngle: 0.85 },
    specimen: { trunkTop: 0.34, crownBase: 0.18, widest: 0.4, limbAngle: 0.35, limbFrom: [0.18, 0.32], ragged: 0.22 },
  },
};
// Georgia NPN first budbreak Apr 1, expansion Apr 13; coloured leaves Oct 9–Nov 12,
// falling Nov 2–25. Winter retention is illustrative; current cards distribute it across
// the crown rather than concentrating it on lower limbs and juvenile trees.
const palette = keyedCalendar([
  { m: 1, d: 1, leaves: 0.025, a: '#967047', b: '#ad865b', carpet: 0.65, label: 'mostly bare, a few brown leaves held' },
  { m: 3, d: 20, leaves: 0, a: '#967047', b: '#ad865b', carpet: 0.25, label: 'bare before budbreak' },
  { m: 4, d: 1, leaves: 0.1, a: '#b0a18b', b: '#c1b59a', label: 'pink-grey buds breaking' },
  { m: 4, d: 13, leaves: 0.55, a: '#94b180', b: '#abc294', label: 'young leaves expanding' },
  { m: 5, d: 1, leaves: 1, a: '#61986b', b: '#72a477', label: 'blue-green summer crown' },
  { m: 9, d: 30, leaves: 1, a: '#61986b', b: '#72a477', label: 'blue-green summer crown' },
  { m: 10, d: 9, leaves: 1, a: '#667a4e', b: '#876144', label: 'first russet colour' },
  { m: 10, d: 28, leaves: 0.95, a: '#873c37', b: '#b46940', label: 'wine-red to russet' },
  { m: 11, d: 12, leaves: 0.65, a: '#925136', b: '#b57443', carpet: 0.5, label: 'russet-brown, dropping' },
  { m: 11, d: 25, leaves: 0.08, a: '#967047', b: '#ad865b', carpet: 1, label: 'brown leaves held into winter' },
]);
const options: LookOption[] = [
  { id: 'A', label: 'Broad lobed-leaf masses', technique: 'cards', ink: 2, tips: 3, units: { high: 26, low: 12 }, cover: 0.78,
    note: 'Rounded-lobed leaves over a broad irregular crown, pale spreading limbs and a heavy trunk; silhouette ink and near leaf tips.' },
  { id: 'C', label: 'Faceted spreading crown', technique: 'lobes', facets: 3, units: { high: 17, low: 13 }, cover: 0.82,
    note: 'The same broad irregular masses as small inked facets, for comparison with the card techniques.' },
];
export const whiteOak = broadleafSpecies({
  id: 'white-oak', name: 'White oak', carpet: true,
  sizes: {
    sapling: { heightM: 4.7, spreadM: 2.4, calliperM: 0.08 },
    young: { heightM: 9.1, spreadM: 5, calliperM: 0.22 },
    mature: { heightM: 25.3, spreadM: 22.1, calliperM: 0.95 },
    specimen: { heightM: 30, spreadM: 35.7, calliperM: 1.7 },
  },
  ranges: {
    sapling: { heightM: [3, 8.1], spreadM: [1.5, 4.1], calliperM: [0.04, 0.15] },
    young: { heightM: [6.8, 11.3], spreadM: [3.4, 6.4], calliperM: [0.15, 0.3] },
    mature: { heightM: [17.7, 32.3], spreadM: [13.4, 29.3], calliperM: [0.61, 1.2] },
    specimen: { heightM: [25.9, 43.3], spreadM: [22.1, 37.2], calliperM: [1.2, 1.83] },
  },
  clumps: { high: 13, low: 7 }, offsetDays: 8, habit, palette,
});
export const whiteOakLook: Look = { species: whiteOak, habit, leaf: 'lobed', palette, options, preferred: 'A' };
