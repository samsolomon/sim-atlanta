/** Callery pear (Pyrus calleryana), the oval Bradford street-tree form.
 * Sizes and Atlanta dates are illustrative. See docs/tree-species.md#callery-pear. */
import type { Habit } from './broadleaf';
import { broadleafSpecies, keyedCalendar, type Look } from './looks';
import { polar, type Seg } from './species';

const habit: Habit = {
  trunkTop: 0.4, crownBase: 0.25, widest: 0.56,
  limbs: { high: 4, low: 3 }, limbAngle: 1.1, limbFrom: [0.24, 0.37], limbReach: 0.9,
  ragged: 0.065, bark: '#736c65', barkDark: '#605a54',
  mass: { r: 0.7, low: -0.54, high: 0.88 },
  bySize: {
    sapling: { crownBase: 0.34, widest: 0.52 },
    specimen: { widest: 0.63, limbAngle: 0.86 },
  },
};
const palette = keyedCalendar([
  { m: 1, d: 1, leaves: 0, a: '#605a54', b: '#736c65', carpet: 0.45, label: 'bare, upright grey boughs' },
  { m: 2, d: 25, leaves: 0, a: '#83a561', b: '#98b56e', label: 'swelling flower buds' },
  { m: 3, d: 6, leaves: 0, a: '#83a561', b: '#98b56e', bloom: 1, label: 'white flower clusters on bare wood' },
  { m: 3, d: 18, leaves: 0, a: '#83a561', b: '#98b56e', bloom: 1, label: 'white flower clusters on bare wood' },
  { m: 3, d: 27, leaves: 0.38, a: '#83a561', b: '#98b56e', bloom: 0.12, label: 'last flowers and pale green leaves' },
  { m: 4, d: 12, leaves: 1, a: '#567f53', b: '#6a925c', label: 'glossy green leaves' },
  { m: 10, d: 20, leaves: 1, a: '#567f53', b: '#6a925c', label: 'glossy green leaves' },
  { m: 11, d: 11, leaves: 0.94, a: '#934532', b: '#bc6851', label: 'bronze red' },
  { m: 11, d: 25, leaves: 0.84, a: '#74384d', b: '#a65666', carpet: 0.3, label: 'late burgundy foliage' },
  { m: 12, d: 17, leaves: 0, a: '#605a54', b: '#736c65', carpet: 1, label: 'bare over fallen leaves' },
]);

const bloomColour = '#fafaff';
const base = broadleafSpecies({
  id: 'callery-pear', name: 'Callery pear', carpet: true, bloomColour,
  sizes: {
    sapling: { heightM: 3, spreadM: 1.65, calliperM: 0.06 },
    young: { heightM: 6, spreadM: 3.6, calliperM: 0.15 },
    mature: { heightM: 10.5, spreadM: 7, calliperM: 0.34 },
    specimen: { heightM: 14, spreadM: 10, calliperM: 0.52 },
  },
  ranges: {
    sapling: { heightM: [2, 4.5], spreadM: [1, 2.5], calliperM: [0.04, 0.09] },
    young: { heightM: [4.5, 8.5], spreadM: [2.4, 5.8], calliperM: [0.09, 0.25] },
    mature: { heightM: [9.1, 13], spreadM: [6.1, 9], calliperM: [0.25, 0.45] },
    specimen: { heightM: [12, 15.2], spreadM: [8.5, 10.7], calliperM: [0.4, 0.64] },
  },
  clumps: { high: 10, low: 6 }, offsetDays: 4, habit, palette,
});
export const calleryPear: typeof base = {
  ...base,
  form(size, quality, dims) {
    const form = base.form(size, quality, dims);
    const trunk = form.segs[0];
    trunk.b = [0, size === 'sapling' ? 0.31 : 0.27, 0];
    trunk.r1 = trunk.r0 * 0.66;
    const count = quality === 'high' ? 4 : 3;
    const boughs: Seg[] = [];
    for (let i = 0; i < count; i++) {
      const angle = i * 2 * Math.PI / count + (i % 2 ? 0.18 : -0.06);
      const rise = [0.16, 0.02, 0.13, 0.07][i];
      const elbow = polar(angle, 0.28, 0.44 + rise * 0.5);
      const tip = polar(angle + 0.13, 0.65 - rise, 0.6 + rise);
      const radius = trunk.r0 * (0.52 - i * 0.055);
      boughs.push({ a: trunk.b, b: elbow, r0: radius, r1: radius * 0.61, sides: 3, color: habit.barkDark });
      boughs.push({ a: elbow, b: tip, r0: radius * 0.61, r1: 0, sides: 3, color: habit.bark });
    }
    form.segs = [trunk, ...boughs];
    return form;
  },
};
export const calleryPearLook: Look = {
  species: calleryPear, habit, leaf: 'oval', palette,
  bloomColour, bloomFill: 0.6, branchBloom: true,
  options: [{ id: 'A', label: 'Oval crown', technique: 'cards', ink: 2, specks: 0.05,
    units: { high: 21, low: 13 }, cover: 0.94,
    note: 'Upright grey branches, white March flower clusters, glossy oval leaves and late burgundy foliage.' }],
};
