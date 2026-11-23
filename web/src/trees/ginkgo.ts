/**
 * Ginkgo biloba. Young trees are gangly and open: one grey leader and sparse limbs angled
 * upward. Old specimens such as the High Museum's champion fork low into several near-upright
 * stems under a broad crown. Leaves grow in tufts on spur shoots, so the crown reads as separate
 * clumps with sky between them. The calendar is the signature: green through October,
 * butter-yellow in November, a drop of a day or a few, then a gold carpet under bare grey limbs.
 * Sources: docs/tree-species.md#ginkgo.
 */
import * as THREE from 'three';
import { lerp3, pad, polar, trunkRadius, type Dims, type Foliage, type Form, type Seg, type SizeClass, type Species, type TreeQuality, type V3 } from './species';

const BARK = '#9a948a';
const BARK_DARK = '#857f75';

/**
 * Leaf state in Atlanta on day-of-year `doy`, shifted by `offset` days.
 *   leaf-out from about Mar 21, full green by Apr 20 (inferred; no Atlanta source)
 *   green to Oct 31, turning Nov 1–14, butter-yellow Nov 15–27
 *   drop Nov 28–Dec 1 (the High's tree was still full gold on 27 Nov 2017)
 *   gold carpet fading by about Dec 13, then bare grey limbs.
 */
export function ginkgoState(doy: number, offset = 0) {
  const d = doy + offset;
  if (d < 80 || d >= 347) return { stage: 'bare' as const, t: 0, leaves: 0, carpet: 0 };
  if (d < 110) {
    const t = (d - 80) / 30;
    return { stage: 'leafout' as const, t, leaves: 0.35 + 0.65 * t, carpet: 0 };
  }
  if (d < 305) return { stage: 'green' as const, t: 0, leaves: 1, carpet: 0 };
  if (d < 319) return { stage: 'turning' as const, t: (d - 305) / 14, leaves: 1, carpet: 0 };
  if (d < 332) return { stage: 'gold' as const, t: (d - 319) / 13, leaves: 1, carpet: 0 };
  if (d < 335) {
    const t = (d - 332) / 3;
    return { stage: 'dropping' as const, t, leaves: 1 - t, carpet: t };
  }
  const t = (d - 335) / 12;
  return { stage: 'carpet' as const, t, leaves: 0, carpet: t < 0.4 ? 1 : 1 - (t - 0.4) / 0.6 };
}

const LEAFOUT = new THREE.Color('#b8d46c');
const GREEN = new THREE.Color('#79ab4f');
const TURNING = new THREE.Color('#b9bf48');
const GOLD = new THREE.Color('#f1c63c');
const CARPET = new THREE.Color('#e6b83e');
const CARPET_FADED = new THREE.Color('#a8915c');
const LABELS = { bare: 'bare grey limbs', leafout: 'leafing out', green: 'summer green', turning: 'turning', gold: 'butter-yellow', dropping: 'dropping its leaves', carpet: 'bare over a gold carpet' };

// Young form: limbs leave the leader at `y`, toward compass angle `a`, reaching `reach` out and
// `rise` up. Low detail keeps the first four.
const LIMBS = [
  { y: 0.27, a: 0.3, reach: 0.9, rise: 0.22 },
  { y: 0.31, a: 3.5, reach: 0.84, rise: 0.24 },
  { y: 0.47, a: 1.9, reach: 0.72, rise: 0.2 },
  { y: 0.5, a: 5.0, reach: 0.68, rise: 0.2 },
  { y: 0.4, a: 2.6, reach: 0.62, rise: 0.26 },
  { y: 0.64, a: 0.9, reach: 0.5, rise: 0.16 },
  { y: 0.68, a: 4.2, reach: 0.46, rise: 0.15 },
];
// Specimen form: a short, massive trunk forking at a fifth of the height into near-upright
// stems; long limbs leave them partway up toward the edge of the crown.
const STEMS = [
  { a: 0.4, r: 0.5, y: 0.94 },
  { a: 2.3, r: 0.58, y: 0.86 },
  { a: 4.0, r: 0.6, y: 0.82 },
  { a: 5.4, r: 0.42, y: 0.92 },
];
const FORK_LIMBS = [
  { stem: 0, f: 0.45, da: 0.35, reach: 0.92, lift: 0.1 },
  { stem: 1, f: 0.5, da: -0.3, reach: 0.95, lift: 0.08 },
  { stem: 2, f: 0.4, da: 0.3, reach: 0.9, lift: 0.12 },
  { stem: 3, f: 0.55, da: -0.35, reach: 0.85, lift: 0.08 },
  { stem: 1, f: 0.7, da: 0.4, reach: 0.8, lift: 0.06 },
];
const FORK: V3 = [0, 0.2, 0];

function leader(q: TreeQuality, d: Dims, fill = 1): Form {
  const tr = trunkRadius(d);
  const segs: Seg[] = [{ a: [0, 0, 0], b: [0, 0.9, 0], r0: tr, r1: tr * 0.35, sides: 5, color: BARK_DARK }];
  const tips = (q === 'high' ? LIMBS : LIMBS.slice(0, 4)).map(l => ({ from: [0, l.y, 0] as V3, to: polar(l.a, l.reach, l.y + l.rise) }));
  for (const t of tips) segs.push({ a: t.from, b: t.to, r0: tr * 0.45, r1: tr * 0.18, sides: 3, color: BARK });
  const pads = [pad([0, 0.87, 0], 0.2 * fill, 0.08)];
  if (q === 'high') pads.push(pad([0.04, 0.77, -0.05], 0.2 * fill));
  for (const t of tips) pads.push(pad(lerp3(t.from, t.to, 0.9), (q === 'high' ? 0.22 : 0.3) * fill));
  if (q === 'high') for (const t of tips.slice(0, 6)) pads.push(pad(lerp3(t.from, t.to, 0.52), 0.2 * fill));
  return { segs, pads };
}

function forked(q: TreeQuality, d: Dims): Form {
  const tr = trunkRadius(d);
  const segs: Seg[] = [{ a: [0, 0, 0], b: FORK, r0: tr, r1: tr * 0.8, sides: 5, color: BARK_DARK }];
  const stems = (q === 'high' ? STEMS : STEMS.slice(0, 3)).map(st => polar(st.a, st.r, st.y));
  for (const tip of stems) segs.push({ a: FORK, b: tip, r0: tr * 0.5, r1: tr * 0.18, sides: 3, color: BARK_DARK });
  const limbs = (q === 'high' ? FORK_LIMBS : FORK_LIMBS.slice(0, 1)).map(l => {
    const from = lerp3(FORK, stems[l.stem], l.f);
    return { from, to: polar(STEMS[l.stem].a + l.da, l.reach, from[1] + l.lift) };
  });
  for (const l of limbs) segs.push({ a: l.from, b: l.to, r0: tr * 0.3, r1: tr * 0.12, sides: 3, color: BARK });
  const pads = [];
  if (q === 'high') {
    // Heavy spur growth on an old tree: tufts large enough to merge into tiers.
    for (const tip of stems) pads.push(pad(lerp3(FORK, tip, 0.94), 0.27, 0.08));
    for (const l of limbs) pads.push(pad(lerp3(l.from, l.to, 0.86), 0.27));
    for (const tip of stems) pads.push(pad(lerp3(FORK, tip, 0.66), 0.25));
    pads.push(pad([0.05, 0.98, 0.02], 0.24, 0.07), pad([-0.45, 0.66, -0.4], 0.25));
  } else {
    for (const tip of stems) pads.push(pad(lerp3(FORK, tip, 0.85), 0.34, 0.1));
    for (const l of limbs) pads.push(pad(lerp3(l.from, l.to, 0.85), 0.32));
    pads.push(pad([0, 0.95, 0], 0.28, 0.09));
  }
  return { segs, pads };
}

export const ginkgo: Species = {
  id: 'ginkgo',
  name: 'Ginkgo',
  leaf: 'clump',
  carpet: true,
  // Classes from Georgia Tech's 89 measured ginkgos and NC State's 15–24 m mature height;
  // the specimen is Trees Atlanta's champion at the High Museum (2012).
  sizes: {
    sapling: { heightM: 4, spreadM: 1.5, calliperM: 0.065 },
    young: { heightM: 7, spreadM: 3.2, calliperM: 0.12 },
    mature: { heightM: 17, spreadM: 10, calliperM: 0.45 },
    specimen: { heightM: 27.5, spreadM: 26.2, calliperM: 1.5 },
  },
  ranges: {
    sapling: { heightM: [3, 4.5], spreadM: [1, 2], calliperM: [0.05, 0.075] },
    young: { heightM: [4.5, 8], spreadM: [2, 4], calliperM: [0.08, 0.15] },
    mature: { heightM: [14, 22], spreadM: [7, 12], calliperM: [0.3, 0.6] },
    specimen: { heightM: [22, 28], spreadM: [15, 26.2], calliperM: [0.8, 1.5] },
  },
  clumps: { high: 15, low: 5 },
  // One photographed tree supports the low fork, and it is a specimen; younger classes keep a leader.
  form: (size: SizeClass, q: TreeQuality, d: Dims) => (size === 'specimen' ? forked(q, d) : leader(q, d, size === 'mature' ? 1.2 : 1)),
  offsetDays: 3,
  foliage(doy: number, offset: number): Foliage {
    const st = ginkgoState(doy, offset);
    const c = new THREE.Color();
    if (st.stage === 'leafout') c.copy(LEAFOUT).lerp(GREEN, st.t);
    else if (st.stage === 'green') c.copy(GREEN);
    else if (st.stage === 'turning') {
      if (st.t < 0.5) c.copy(GREEN).lerp(TURNING, st.t * 2);
      else c.copy(TURNING).lerp(GOLD, (st.t - 0.5) * 2);
    } else c.copy(GOLD);
    return { leaves: st.leaves, colour: c, carpet: st.carpet, carpetColour: CARPET_FADED.clone().lerp(CARPET, st.carpet), label: LABELS[st.stage] };
  },
};
