/** Eastern redbud: low branching rounded vase, cordate leaves, pink early spring.
 * Sizes and Atlanta dates are illustrative; sources: docs/tree-species.md#eastern-redbud. */
import { broadleafSpecies, keyedCalendar, type Look } from './looks';
import type { Habit } from './broadleaf';
import { polar, type Seg } from './species';

const habit: Habit = {
  trunkTop: 0.28, crownBase: 0.24, widest: 0.65,
  limbs: { high: 4, low: 3 }, limbAngle: 0.75, limbFrom: [0.16, 0.3], limbReach: 0.9,
  ragged: 0.16, bark: '#78645b', barkDark: '#63534e',
  mass: { r: 0.63, low: -0.3, high: 0.6 },
  bySize: {
    sapling: { trunkTop: 0.55, crownBase: 0.28, widest: 0.45, limbFrom: [0.25, 0.5] },
    specimen: { trunkTop: 0.24, crownBase: 0.2, widest: 0.7, limbAngle: 0.6 },
  },
};
// Illustrative Atlanta calendar. The full flush finishes before leaf-out begins.
const palette = keyedCalendar([
  { m: 1, d: 1, leaves: 0, a: '#79654f', b: '#79654f', carpet: 0.3, label: 'bare, spreading brown limbs' },
  { m: 2, d: 25, leaves: 0, a: '#793c58', b: '#aa5a79', label: 'flower buds' },
  { m: 3, d: 10, leaves: 0, a: '#793c58', b: '#aa5a79', bloom: 0.65, label: 'magenta flowers opening on bare wood' },
  { m: 3, d: 15, leaves: 0, a: '#793c58', b: '#aa5a79', bloom: 1, label: 'peak bloom on bare branches' },
  { m: 3, d: 29, leaves: 0, a: '#793c58', b: '#aa5a79', bloom: 1, label: 'peak bloom on bare branches' },
  { m: 4, d: 4, leaves: 0, a: '#793c58', b: '#aa5a79', label: 'flowers fallen, leaf buds opening' },
  { m: 4, d: 10, leaves: 0.65, a: '#793c58', b: '#aa5a79', label: 'reddish-purple young leaves' },
  { m: 4, d: 15, leaves: 0.85, a: '#884564', b: '#a45a78', label: 'reddish-purple young leaves' },
  { m: 4, d: 20, leaves: 1, a: '#5d8c59', b: '#6e9a66', bloom: 0, label: 'green heart-shaped leaves' },
  { m: 9, d: 30, leaves: 1, a: '#5d8c59', b: '#6e9a66', label: 'summer green' },
  { m: 10, d: 25, leaves: 0.95, a: '#bba743', b: '#d2bd55', label: 'soft yellow fall colour' },
  { m: 11, d: 12, leaves: 0.35, a: '#b29a4e', b: '#c7ad62', carpet: 0.7, label: 'yellow-brown, dropping' },
  { m: 11, d: 28, leaves: 0, a: '#79654f', b: '#79654f', carpet: 1, label: 'bare over fallen leaves' },
]);
const base = broadleafSpecies({
  id: 'eastern-redbud', name: 'Eastern redbud', carpet: true,
  sizes: {
    sapling: { heightM: 2, spreadM: 1.5, calliperM: 0.05 },
    young: { heightM: 4, spreadM: 4.5, calliperM: 0.12 },
    mature: { heightM: 7, spreadM: 8, calliperM: 0.3 },
    specimen: { heightM: 10, spreadM: 10.5, calliperM: 0.5 },
  },
  ranges: {
    sapling: { heightM: [1, 3], spreadM: [0.8, 2.5], calliperM: [0.03, 0.08] },
    young: { heightM: [3, 5.5], spreadM: [2.5, 6], calliperM: [0.08, 0.2] },
    mature: { heightM: [6, 9.1], spreadM: [4.6, 10.7], calliperM: [0.2, 0.4] },
    specimen: { heightM: [9, 10.7], spreadM: [8, 12], calliperM: [0.4, 0.6] },
  },
  clumps: { high: 9, low: 5 }, offsetDays: 7, habit, palette,
});
export const easternRedbud: typeof base = {
  ...base,
  form(size, quality, dims) {
    const form = base.form(size, quality, dims);
    const trunk = form.segs[0];
    const sapling = size === 'sapling';
    const count = quality === 'high' ? 4 : 3;
    trunk.b = [0, sapling ? 0.27 : 0.12, 0];
    trunk.r1 = trunk.r0 * 0.74;
    const boughs: Seg[] = [];
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count + (i % 2 ? 0.25 : -0.15);
      const lift = [0.25, 0.08, 0.36, 0.17][i];
      const elbow = polar(angle, sapling ? 0.19 : 0.39, 0.26 + lift * 0.45);
      const tip = polar(angle + (i % 2 ? -0.19 : 0.19), 0.72 + (0.24 - lift) * 0.6, 0.44 + lift);
      const radius = trunk.r0 * (0.61 - i * 0.049);
      boughs.push({ a: trunk.b, b: elbow, r0: radius, r1: radius * 0.64, sides: 3, color: habit.barkDark });
      boughs.push({ a: elbow, b: tip, r0: radius * 0.64, r1: 0, sides: 3, color: habit.bark });
    }
    form.segs = [trunk, ...boughs];
    return form;
  },
};
export const easternRedbudLook: Look = {
  species: easternRedbud, preferred: 'A', habit, leaf: 'cordate', palette, lowLift: -0.015,
  bloomColour: '#e46cbb', bloomFill: 0.68, branchBloom: true,
  options: [{ id: 'A', label: 'Heart-leaf vase', technique: 'cards', ink: 2,
    units: { high: 21, low: 13 }, cover: 0.8,
    note: 'Magenta flower clusters trace bare twigs before the heart-shaped leaf cards open.' }],
};
