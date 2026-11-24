/** Eastern redbud: low branching rounded vase, cordate leaves, pink early spring.
 * Sizes and Atlanta dates are illustrative; sources: docs/tree-species.md#eastern-redbud. */
import { broadleafSpecies, keyedCalendar, type Look } from './looks';
import type { Habit } from './broadleaf';
import { lerp3, type Seg, type V3 } from './species';

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
  { m: 2, d: 25, leaves: 0, a: '#9e9768', b: '#b1ac7a', label: 'flower buds' },
  { m: 3, d: 10, leaves: 0, a: '#9e9768', b: '#b1ac7a', bloom: 0.65, label: 'magenta flowers opening on bare wood' },
  { m: 3, d: 15, leaves: 0, a: '#9e9768', b: '#b1ac7a', bloom: 1, label: 'peak bloom on bare branches' },
  { m: 3, d: 29, leaves: 0, a: '#9e9768', b: '#b1ac7a', bloom: 1, label: 'peak bloom on bare branches' },
  { m: 4, d: 4, leaves: 0, a: '#9e9768', b: '#b1ac7a', label: 'flowers fallen, leaf buds opening' },
  { m: 4, d: 10, leaves: 0.65, a: '#9e9768', b: '#b1ac7a', label: 'bronze-green young leaves' },
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
    const twigs: Seg[] = [];
    for (const limb of form.segs.slice(1)) {
      // Outer limbs are tapered to a point. Give each a short alternating lateral spur.
      if (form.segs.some(seg => seg.a === limb.b)) continue;
      limb.r1 = 0;
      const a = lerp3(limb.a, limb.b, 0.55);
      const dx = limb.b[0] - limb.a[0], dz = limb.b[2] - limb.a[2];
      const turn = twigs.length % 2 ? -1 : 1;
      twigs.push({ a, b: [a[0] + dx * 0.5 - dz * turn * 0.8, a[1] + 0.1, a[2] + dz * 0.5 + dx * turn * 0.8],
        r0: limb.r0 * 0.48, r1: 0, sides: 3, color: limb.color });
    }
    // Spread the branch fan below the round canopy, with the attachment points kept coincident.
    const spread = ([x, y, z]: V3): V3 => [x * 1.35, y * 0.93, z * 1.35];
    form.segs = [...form.segs, ...twigs].map(seg => ({ ...seg, a: spread(seg.a), b: spread(seg.b) }));
    return form;
  },
};
export const easternRedbudLook: Look = {
  species: easternRedbud, habit, leaf: 'cordate', palette, lowLift: -0.015,
  bloomColour: '#db78bd', bloomFill: 0.45, branchBloom: true,
  options: [{ id: 'A', label: 'Heart-leaf vase', technique: 'cards', ink: 2,
    units: { high: 21, low: 13 }, cover: 0.8,
    note: 'Magenta flower clusters trace bare twigs before the heart-shaped leaf cards open.' }],
};
