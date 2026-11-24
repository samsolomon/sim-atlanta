/** River birch (Betula nigra), the multi-stem form of an illustrative Atlanta tree. */
import { treeBarkMaterial } from './bark-material';
import type { Habit } from './broadleaf';
import { broadleafSpecies, keyedCalendar, type Look } from './looks';
import { lerp3, polar, type Seg, type V3 } from './species';

const habit: Habit = {
  stems: 3, trunkTop: 0.34, crownBase: 0.32, widest: 0.52,
  limbs: { high: 4, low: 3 }, limbAngle: 0.72, limbFrom: [0.26, 0.4], limbReach: 0.92,
  ragged: 0.16, bark: '#bc947d', barkDark: '#ab8169',
  mass: { r: 0.49, low: -0.64, high: 0.84 },
  tiers: { high: [3, 4, 2], low: [3, 2, 1] },
  bySize: {
    sapling: { crownBase: 0.26, widest: 0.49 },
    specimen: { crownBase: 0.35, widest: 0.63 },
  },
};
const palette = keyedCalendar([
  { m: 1, d: 1, leaves: 0, a: '#9c745c', b: '#9c745c', carpet: 0.55, label: 'bare with salmon-coloured bark' },
  { m: 3, d: 7, leaves: 0, a: '#91ae60', b: '#acc475', label: 'bare with swelling buds' },
  { m: 3, d: 25, leaves: 0.45, a: '#91ae60', b: '#acc475', label: 'fresh yellow-green leaf-out' },
  { m: 4, d: 15, leaves: 1, a: '#557e53', b: '#6d925e', label: 'small green summer leaves' },
  { m: 9, d: 22, leaves: 1, a: '#557e53', b: '#6d925e', label: 'late green leaves' },
  { m: 10, d: 16, leaves: 0.89, a: '#ae944b', b: '#ccad5d', label: 'soft yellow fall colour' },
  { m: 11, d: 3, leaves: 0.3, a: '#a38348', b: '#bb995a', carpet: 0.73, label: 'sparse ochre leaves' },
  { m: 11, d: 22, leaves: 0, a: '#9c745c', b: '#9c745c', carpet: 1, label: 'bare over fallen leaves' },
]);

const base = broadleafSpecies({
  id: 'river-birch', name: 'River birch', carpet: true, habit, palette,
  sizes: {
    sapling: { heightM: 4, spreadM: 2.3, calliperM: 0.065 },
    young: { heightM: 8, spreadM: 5.4, calliperM: 0.16 },
    mature: { heightM: 15, spreadM: 11.5, calliperM: 0.33 },
    specimen: { heightM: 20, spreadM: 16, calliperM: 0.54 },
  },
  ranges: {
    sapling: { heightM: [2.7, 5], spreadM: [1.5, 3.6], calliperM: [0.04, 0.095] },
    young: { heightM: [5.5, 11], spreadM: [3.8, 8], calliperM: [0.09, 0.24] },
    mature: { heightM: [11, 18], spreadM: [8, 15], calliperM: [0.22, 0.46] },
    specimen: { heightM: [17, 22], spreadM: [12, 18.3], calliperM: [0.38, 0.65] },
  },
  clumps: { high: 10, low: 6 }, offsetDays: 6,
});

export const riverBirch: typeof base = {
  ...base,
  form(size, quality, dims) {
    const form = base.form(size, quality, dims);
    const mainRadius = form.segs[0].r0;
    const sides = quality === 'high' ? 4 : 3;
    const segs: Seg[] = [];
    for (let i = 0; i < 3; i++) {
      const angle = 0.55 + i * 2.09;
      const radius = mainRadius * (1 - i * 0.16);
      const start: V3 = i === 0 ? [0, 0, 0] : polar(angle, mainRadius * 1.25, 0.016);
      const knee: V3 = i === 0 ? [0, 0.29, 0] : polar(angle, 0.10, 0.27 + 0.025 * i);
      const fork = polar(angle + 0.13, [0.2, 0.28, 0.22][i], 0.61 - i * 0.065);
      const tip = polar(angle - 0.18, [0.38, 0.66, 0.57][i], 0.92 - i * 0.08);
      segs.push({ a: start, b: knee, r0: radius, r1: radius * 0.76, sides, color: habit.barkDark });
      segs.push({ a: knee, b: fork, r0: radius * 0.76, r1: radius * 0.43, sides, color: habit.bark });
      segs.push({ a: fork, b: tip, r0: radius * 0.43, r1: 0, sides, color: habit.bark });
      const branch = lerp3(knee, fork, 0.52);
      segs.push({ a: branch, b: polar(angle - 0.6, 0.63, branch[1] + 0.14),
        r0: radius * 0.36, r1: 0, sides: 3, color: habit.bark });
      segs.push({ a: fork, b: polar(angle + 0.65, 0.74 - i * 0.04, fork[1] + 0.105),
        r0: radius * 0.28, r1: 0, sides: 3, color: habit.barkDark });
      if (quality === 'high') segs.push({ a: lerp3(fork, tip, 0.52), b: polar(angle - 0.76, 0.77, tip[1] - 0.06),
        r0: radius * 0.17, r1: 0, sides: 3, color: habit.bark });
    }
    return { ...form, segs };
  },
};

function barkMaterial() {
  return treeBarkMaterial('river-birch-bark', /* glsl */ `
vec2 barkUV = vec2(vBarkMetres.x + vBarkMetres.z * .76, vBarkMetres.y);
float oldBase = smoothstep(14., 20., vBarkHeight) * (1. - smoothstep(.45, 3., barkUV.y));
float barkDetail = sfSee(.17, barkPx);
if (barkDetail > 0.) {
  vec2 layerUV = barkUV * vec2(15., 23.);
  vec2 warp = vec2(sfN(barkUV * 11. + 2.7), sfN(barkUV * 18.)) * vec2(.7, 2.1);
  float flake = .77 * sfN(layerUV + warp) + .23 * sfN(layerUV * 2.3 + 9.1);
  float edge = max(.025, barkPx * 1.6);
  vec3 cinnamon = vec3(.35, .17, .10);
  vec3 salmon = vec3(.63, .37, .25);
  vec3 cream = vec3(.81, .65, .48);
  vec3 layers = mix(cinnamon, salmon, smoothstep(.32 - edge, .32 + edge, flake));
  layers = mix(layers, cream, smoothstep(.61 - edge, .61 + edge, flake));
  float lip = smoothstep(.43 - edge, .43, flake) * (1. - smoothstep(.43, .51 + edge, flake));
  float fissure = smoothstep(.56, .65, sfN(barkUV * vec2(16., 3.9)));
  layers = mix(layers * (1. + .19 * lip), layers * (.54 + .34 * fissure), oldBase);
  diffuseColor.rgb = mix(diffuseColor.rgb, layers, .82 * barkDetail);
}`);
}

export const riverBirchLook: Look = {
  species: riverBirch, habit, leaf: 'oval', palette, barkMaterial, cardLeafM: 0.18, lowLift: -0.013,
  options: [{ id: 'A', label: 'Paper-bark clump', technique: 'cards', ink: 2,
    units: { high: 24, low: 16 }, cover: 0.81,
    note: 'Three slender stems with salmon and cream bark, fine green sprays and soft yellow autumn foliage.' }],
};
