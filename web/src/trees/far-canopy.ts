/**
 * The generic tree's far form: two faceted octahedron clumps (or pine tiers) and a trunk per tree, drawn as a
 * single instanced mesh per area on the generic leaf material (no new shader program). City
 * swaps it in for the near clumps past the low tier's far-tree orbit (city.ts FAR_TREES_M), and
 * the streaming mid ring uses the same core for areas it holds as forest.
 *
 * The core is pure, with no THREE objects or DOM, so a Worker can run it and transfer the
 * buffers: plain trees in, column-major instance matrices and linear-RGB colours out. Colours
 * follow World.setSeason's palette and per-tree seeds, so near and far agree on every day of
 * the year. A bare crown is left out (today's far view shows only its trunk).
 */
import { leafState } from '../vignette/time';

/** A World tree: trunk base, size scale s, colour seed c (pine < 0.18, magnolia < 0.26), trunk height. */
export interface FarTree { x: number; y: number; z: number; s: number; c: number; th?: number }

/** Instances per tree at most: two crown clumps (or pine tiers) and a trunk. */
export const FAR_PER_TREE = 3;

const linear = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
/** '#rrggbb' to linear RGB, as THREE.Color.set does in the working colour space. */
const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [linear(((n >> 16) & 255) / 255), linear(((n >> 8) & 255) / 255), linear((n & 255) / 255)];
};
const lighter = (c: readonly number[], f: number) => [c[0] * f, c[1] * f, c[2] * f];
const mix = (a: readonly number[], b: readonly number[], t: number): [number, number, number] =>
  [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// World.setSeason's palette.
const SUMMER = ['#5f8f4e', '#6e9d55', '#4f7f45', '#7ea65f', '#5a8a58'].map(rgb);
const SPRING = rgb('#a9cf6a');
const FALL = ['#c43a26', '#8e2f3a', '#a8662f', '#e0b04a', '#d0782f'].map(rgb);
const BROWN = rgb('#8a6a48');
const PINE = rgb('#355f3c');
const MAGNOLIA = rgb('#2f5c3a');
const TRUNK = rgb('#6b4f3a');

/** A crown's colour and leaf fraction on a day, as the near form draws it. */
export function farCrown(t: FarTree, doy: number): { colour: [number, number, number]; leaves: number; kind: 'pine' | 'magnolia' | 'deciduous' } {
  if (t.c < 0.18) return { colour: PINE, leaves: 1, kind: 'pine' };
  if (t.c < 0.26) return { colour: MAGNOLIA, leaves: 1, kind: 'magnolia' };
  const st = leafState(doy, (t.c * 997) % 1 * 28 - 14);
  const fall = FALL[Math.floor(((t.c * 7.3) % 1) * FALL.length)];
  const green = SUMMER[Math.floor(((t.c * 3.1) % 1) * SUMMER.length)];
  const colour = st.stage === 'summer' ? green
    : st.stage === 'spring' ? mix(SPRING, green, st.t)
    : st.stage === 'turning' ? mix(green, fall, Math.min(1, st.t * 1.3))
    : st.stage === 'dropping' ? mix(fall, BROWN, st.t * 0.6)
    : BROWN;
  return { colour: [...colour] as [number, number, number], leaves: st.canopy, kind: 'deciduous' };
}

export interface FarInstances { matrices: Float32Array; colors: Float32Array; count: number }

function put(o: FarInstances, x: number, y: number, z: number, sx: number, sy: number, sz: number, yaw: number, c: readonly number[]) {
  const m = o.count * 16, cs = Math.cos(yaw), sn = Math.sin(yaw);
  o.matrices.set([cs * sx, 0, -sn * sx, 0, 0, sy, 0, 0, sn * sz, 0, cs * sz, 0, x, y, z, 1], m);
  o.colors.set([c[0], c[1], c[2]], o.count * 3);
  o.count++;
}

/**
 * Far instances for trees on a day of the year, into `out` when given (sized for
 * FAR_PER_TREE per tree). Crowns first, then trunks; bare crowns are skipped, so `count`
 * is exactly what draws.
 */
export function farCanopyInstances(trees: readonly FarTree[], doy: number, out?: FarInstances): FarInstances {
  const o = out ?? { matrices: new Float32Array(trees.length * FAR_PER_TREE * 16), colors: new Float32Array(trees.length * FAR_PER_TREE * 3), count: 0 };
  o.count = 0;
  for (const t of trees) {
    const trunkH = t.th ?? 2 + t.s * 0.6;
    const { colour, leaves, kind } = farCrown(t, doy);
    const yaw = t.c * 40;
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    // Offsets turn with the tree, so neighbours never repeat one silhouette.
    const at = (dx: number, dz: number) => [t.x + cs * dx + sn * dz, t.z - sn * dx + cs * dz] as const;
    if (kind === 'pine') {
      // The stacked tiers' outline: a broad lower tier and a narrower top, about 5 s above the trunk.
      put(o, t.x, t.y + trunkH + 1.5 * t.s, t.z, 1.4 * t.s, 1.8 * t.s, 1.4 * t.s, yaw, colour);
      put(o, t.x, t.y + trunkH + 3.7 * t.s, t.z, 0.85 * t.s, 1.6 * t.s, 0.85 * t.s, yaw + 0.6, lighter(colour, 1.12));
      continue;
    }
    if (leaves < 0.05) continue;
    // Two clumps inside the near crown's outline (about 1.2 R across), shrinking as leaves drop:
    // a larger shaded one low and a smaller sunlit one high and across from it.
    const R = 2.3 * t.s, k = 0.45 + 0.55 * leaves, cy = t.y + trunkH + R * 0.85 - (1 - leaves) * R * 0.3;
    const [ax, az] = at(-0.3 * R * k, 0.12 * R * k), [bx, bz] = at(0.32 * R * k, -0.18 * R * k);
    put(o, ax, cy - 0.05 * R, az, 0.78 * R * k, 0.82 * R * k, 0.78 * R * k, yaw, colour);
    put(o, bx, cy + 0.22 * R * k, bz, 0.66 * R * k, 0.72 * R * k, 0.66 * R * k, yaw + 0.8, lighter(colour, 1.15));
  }
  for (const t of trees) {
    const trunkH = t.th ?? 2 + t.s * 0.6;
    // A diamond tapers at both ends: run it up into the crown so it reads as one tree.
    put(o, t.x, t.y + trunkH * 0.65, t.z, 0.32 * t.s, trunkH * 0.65, 0.32 * t.s, t.c * 40, TRUNK);
  }
  return o;
}
