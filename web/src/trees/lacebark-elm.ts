/** Lacebark elm (Ulmus parvifolia), an illustrative Atlanta street-tree study. */
import { treeBarkMaterial } from './bark-material';
import type { Habit } from './broadleaf';
import { broadleafSpecies, keyedCalendar, type Look } from './looks';
import { lerp3, type Seg } from './species';

const habit: Habit = {
  trunkTop: 0.29, crownBase: 0.25, widest: 0.61,
  limbs: { high: 4, low: 3 }, limbAngle: 0.85, limbFrom: [0.16, 0.29], limbReach: 0.95,
  ragged: 0.14, bark: '#796d60', barkDark: '#766a59',
  mass: { r: 0.51, low: -0.4, high: 0.73 },
  bySize: {
    sapling: { trunkTop: 0.45, crownBase: 0.28, widest: 0.5, limbFrom: [0.25, 0.42] },
    specimen: { widest: 0.66, limbAngle: 0.73 },
  },
};
const palette = keyedCalendar([
  { m: 1, d: 12, leaves: 0, a: '#7b6d60', b: '#7b6d60', carpet: 0.7, label: 'bare, mottled bark and fine twigs' },
  { m: 3, d: 14, leaves: 0, a: '#8aaa57', b: '#a2b967', label: 'bare with swelling buds' },
  { m: 4, d: 3, leaves: 0.55, a: '#8aaa57', b: '#a2b967', label: 'fresh yellow-green leaf-out' },
  { m: 4, d: 22, leaves: 1, a: '#527e54', b: '#658d5d', label: 'small glossy green leaves' },
  { m: 10, d: 29, leaves: 1, a: '#527e54', b: '#658d5d', label: 'small glossy green leaves' },
  { m: 11, d: 20, leaves: 0.85, a: '#9b7949', b: '#c4a057', label: 'muted bronze-gold foliage' },
  { m: 12, d: 7, leaves: 0.43, a: '#885745', b: '#b07f55', carpet: 0.58, label: 'late copper foliage and leaf litter' },
  { m: 12, d: 28, leaves: 0, a: '#7b6d60', b: '#7b6d60', carpet: 1, label: 'bare, mottled bark and fine twigs' },
]);

const base = broadleafSpecies({
  id: 'lacebark-elm', name: 'Lacebark elm', carpet: true, habit, palette,
  sizes: {
    sapling: { heightM: 3.6, spreadM: 2.4, calliperM: 0.075 },
    young: { heightM: 7.5, spreadM: 6.4, calliperM: 0.18 },
    mature: { heightM: 12.5, spreadM: 13.5, calliperM: 0.45 },
    specimen: { heightM: 15.2, spreadM: 16, calliperM: 0.7 },
  },
  ranges: {
    sapling: { heightM: [2.5, 5], spreadM: [1.6, 4], calliperM: [0.04, 0.12] },
    young: { heightM: [5, 10], spreadM: [4, 9], calliperM: [0.11, 0.29] },
    mature: { heightM: [10, 14], spreadM: [10, 15], calliperM: [0.28, 0.55] },
    specimen: { heightM: [13.5, 16], spreadM: [13, 17], calliperM: [0.5, 0.82] },
  },
  clumps: { high: 10, low: 6 }, offsetDays: 7,
});
export const lacebarkElm: typeof base = {
  ...base,
  form(size, quality, dims) {
    const form = base.form(size, quality, dims);
    const twigs: Seg[] = [];
    let extraForks = 3;
    for (const branch of form.segs.slice(1)) {
      if (form.segs.some(seg => seg.a === branch.b)) continue;
      // Fine shoots turn outward and down at the ends of the scaffold.
      branch.r1 = 0;
      const a = lerp3(branch.a, branch.b, 0.64);
      const [x, , z] = branch.b;
      const side = twigs.length % 2 ? 0.13 : -0.13;
      branch.b = [x * 1.14, branch.b[1] - 0.045, z * 1.14];
      twigs.push({ a, b: [x * 1.22 - z * side, a[1] - 0.025, z * 1.22 + x * side],
        r0: branch.r0 * 0.42, r1: 0, sides: 3, color: habit.bark });
      if (extraForks > 0) {
        const fork = lerp3(branch.a, a, 0.76);
        twigs.push({ a: fork, b: [x * 1.04 + z * 0.28, fork[1] + 0.045, z * 1.04 - x * 0.28],
          r0: branch.r0 * 0.36, r1: 0, sides: 3, color: habit.barkDark });
        extraForks--;
      }
    }
    form.segs.push(...twigs);
    return form;
  },
};

/** The patches are in tree-local metres, so they follow the trunk through an instance's rotation. */
function barkMaterial() {
  return treeBarkMaterial('lacebark-elm-bark', /* glsl */ `
vec2 barkUV = vec2(vBarkMetres.x + vBarkMetres.z * .83, vBarkMetres.y);
float barkDetail = sfSee(.19, barkPx);
if (barkDetail > 0.) {
  vec2 grain = barkUV * vec2(12., 7.);
  float mottle = .71 * sfN(grain) + .29 * sfN(grain * 2.8 + 6.);
  vec3 fresh = vec3(.41, .23, .095);
  vec3 old = vec3(.16, .17, .13);
  vec3 pale = vec3(.56, .49, .34);
  float soft = max(.035, barkPx);
  vec3 patches = mix(old, fresh, smoothstep(.38 - soft, .38 + soft, mottle));
  patches = mix(patches, pale, smoothstep(.65 - soft, .65 + soft, mottle));
  diffuseColor.rgb = mix(diffuseColor.rgb, patches, .85 * barkDetail);
}`);
}

export const lacebarkElmLook: Look = {
  species: lacebarkElm, preferred: 'A', habit, leaf: 'oval', palette, barkMaterial, cardLeafM: 0.14, lowLift: 0.055,
  options: [{ id: 'A', label: 'Fine drooping sprays', technique: 'cards', ink: 2, specks: 0.04,
    units: { high: 24, low: 15 }, cover: 0.79,
    note: 'A broad crown of small glossy leaves and arching twigs over mottled olive, tan and cinnamon bark.' }],
};
