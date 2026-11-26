import { faceKit, packFaces, type FaceKit } from './face-kit';

/**
 * Full-size crew-cab pickup in the proportions of a current (2021+) Ford F-150 SuperCrew with the
 * 5.5 ft box. No badge, oval, script or lettering. Metres, +z forward, y = 0 at the tyre contact.
 * Dimensions and sources: docs/road-pickup.md.
 *
 * `near` is the close form (Model Lab); the far form is what City traffic draws. `trim` 'xlt' has
 * chrome bumpers, grille bars and alloy wheels; 'xl' is the work truck, dark bumpers and grille and
 * painted steel wheels. Kinds follow vehicles.ts: 0 paint, 1 headlamp, 2 tail lamp, 3 glass,
 * 4 fixed, 5 amber marker.
 */

// Ford's 2026 F-150 technical specifications (SuperCrew, 5.5 ft box, 145.4 in wheelbase).
export const PICKUP_LENGTH = 5.893;
const FRONT = PICKUP_LENGTH / 2;
const FRONT_AXLE = FRONT - 0.95; // 37.4 in front overhang
const REAR_AXLE = FRONT_AXLE - 3.693; // 145.4 in wheelbase, 49.2 in rear overhang
const CAB_BACK = FRONT - 3.952; // 155.6 in bumper to back of cab
const HALF = 2.029 / 2; // 79.9 in without mirrors
const TYRE_R = 0.412; // 275/65R18, 32.1 in, on a 4x4's ride height
const TRACK = 1.725; // 67.9 in front, 68.3 in rear
const ROOF = 1.955; // 4x2 1.915, 4x4 1.958
const BELT = 1.36; // side-window sill, level with the hood (estimated)
const GLASS_TOP = 1.9; // tall door glass (estimated)
const BED_TOP = 1.34; // box rail, just under the belt (estimated)
const SILL = 0.64; // rocker bottom; 9.8 in ground clearance on a 4x4
const ARCH = 0.52; // wheel-opening radius (estimated)
const FLARE = 0.09; // arch flare lip, radial depth (estimated)
const BED_FRONT = CAB_BACK - 0.03;
const TAILGATE = FRONT - PICKUP_LENGTH + 0.11; // box and gate end, 11 cm ahead of the step bumper's face
const FLOOR = 0.866; // open tailgate to ground, 4x4
const INNER = HALF - 0.075; // inside face of the box walls

const body = '#ffffff',
  glass = '#344855',
  wind = '#465d69',
  lens = '#e4e2d4',
  red = '#9e2c2a',
  amber = '#c98a3c',
  tyre = '#262728',
  dark = '#1f2224',
  plastic = '#2c2f31',
  liner = '#2a2c2d',
  chrome = '#c9cdcd',
  alloy = '#a3a9ac',
  steelWheel = '#b9bcbd',
  grilleDark = '#26292b',
  grilleXl = '#45494c',
  shadow = '#3c4246';

export type PickupTrim = 'xl' | 'xlt';

/** Height of a wheel opening's edge above the ground at length z, or 0 outside it. */
function archTop(z: number, axle: number) {
  const d = z - axle;
  return Math.abs(d) <= ARCH ? TYRE_R + Math.sqrt(ARCH * ARCH - d * d) : 0;
}

/** Interpolate rows [z, ...values] at z; rows sorted by z ascending. */
function sample(rows: number[][], z: number) {
  const i = rows.findIndex((r) => r[0] >= z);
  if (i <= 0) return rows[i === 0 ? 0 : rows.length - 1];
  const a = rows[i - 1],
    b = rows[i],
    t = (z - a[0]) / (b[0] - a[0]);
  return a.map((v, j) => v + t * (b[j] - v));
}

/** Station z values plus extra stations around an axle, so an arch reads round. */
function withArch(zs: number[], axle: number, segments: number) {
  const out = [...zs];
  for (let j = 0; j <= segments; j++) out.push(axle - ARCH * Math.cos((j * Math.PI) / segments));
  return out.sort((a, b) => a - b).filter((z, i, all) => i === 0 || z - all[i - 1] > 1e-4);
}

function frontBody(k: FaceKit, near: boolean) {
  // z, half width at the shoulder, top (hood, then belt), sill
  const rows = [
    [CAB_BACK, HALF, BELT, SILL],
    [1.2, HALF, BELT + 0.02, SILL],
    [2.2, HALF, 1.4, SILL + 0.02],
    [FRONT - 0.08, HALF - 0.015, 1.41, SILL + 0.04],
    [FRONT - 0.03, HALF - 0.05, 1.395, SILL + 0.06],
  ];
  const zs = withArch(rows.map((r) => r[0]), FRONT_AXLE, near ? 10 : 5);
  const rings = zs.map((z) => {
    const [, w, top, sill] = sample(rows, z);
    const low = Math.max(sill, archTop(z, FRONT_AXLE));
    const dome = z > 1.3 ? 0.03 : 0.012;
    const half = [[0, low], [w * 0.97, low], [w, Math.min(top - 0.2, low + 0.1)], [w, top - 0.08], [w * 0.96, top - 0.02], [w * 0.4, top], [w * 0.25, top + dome], [0, top + dome]];
    return [...half, ...half.slice(1, -1).reverse().map(([x, y]) => [-x, y])].map(([x, y]) => [x, y, z]);
  });
  k.skin(rings, body);
  // Arch liners: dark bands just inside the front openings.
  const segs = near ? 10 : 5;
  for (const s of [-1, 1])
    for (let i = 0; i < segs; i++) {
      const at = (j: number, x: number) => [s * x, TYRE_R + ARCH * Math.sin((j * Math.PI) / segs), FRONT_AXLE - ARCH * Math.cos((j * Math.PI) / segs)];
      k.panel([at(i, HALF - 0.01), at(i + 1, HALF - 0.01), at(i + 1, HALF - 0.3), at(i, HALF - 0.3)], liner, [s * 0.7, TYRE_R, FRONT_AXLE]);
    }
}

/** Glass-to-roof greenhouse; side and rear glass sit just proud of it. */
function cab(k: FaceKit) {
  // z, half width at the belt, half width at the roof edge, roof height
  const rows = [
    [CAB_BACK, 0.96, 0.82, ROOF - 0.04],
    [CAB_BACK + 0.05, 0.965, 0.82, ROOF],
    [0.55, 0.965, 0.82, ROOF],
    [1.2, 0.98, 0.93, BELT + 0.04],
  ];
  k.skin(rows.map(([z, wb, wt, top]) => [[-wb, BELT, z], [wb, BELT, z], [wt, top, z], [-wt, top, z]]), body);
  const side = (z: number, y: number, s: number, lift = 0.008) => {
    const [, wb, wt, top] = sample(rows, z);
    const f = (y - BELT) / Math.max(0.05, top - BELT);
    return [s * (wb + (wt - wb) * f + lift), y, z];
  };
  const top = (z: number, x: number) => {
    const [, , wt, h] = sample(rows, z);
    return [x * wt, h + 0.006, z];
  };
  // Windshield across the raked front of the greenhouse.
  k.panel([top(1.17, -0.93), top(1.17, 0.93), top(0.6, 0.93), top(0.6, -0.93)], wind, [0, BELT, 0.5]);
  for (const s of [-1, 1]) {
    // Front door glass under the A-pillar, black B-pillar, rear door glass to the C-pillar.
    // SuperCrew: front door glass under the A-pillar, a near-vertical black B-pillar, then the long
    // rear door's own glass, and a body-colour C-pillar to the back of the cab.
    const lo = BELT + 0.05, hi = GLASS_TOP;
    k.panel([side(1.1, lo, s), side(0.24, lo, s), side(0.24, hi, s), side(0.64, hi, s)], glass, [0, 1.6, 0.7]);
    k.panel([side(0.24, BELT + 0.02, s), side(0.14, BELT + 0.02, s), side(0.15, ROOF - 0.03, s), side(0.25, ROOF - 0.03, s)], dark, [0, 1.6, 0.2]);
    k.panel([side(0.14, lo, s), side(-0.62, lo, s), side(-0.74, lo + 0.12, s), side(-0.74, hi, s), side(0.14, hi, s)], glass, [0, 1.6, -0.3]);
  }
  k.lamp(0, 1.66, CAB_BACK - 0.004, 1.4, 0.4, '-z', glass);
}

function bed(k: FaceKit, near: boolean) {
  const inner = INNER;
  const zs = withArch([TAILGATE, -2.4, -1.25, BED_FRONT], REAR_AXLE, near ? 10 : 5);
  for (const s of [-1, 1]) {
    // Each wall is its own convex ring, so the open box needs no non-convex caps.
    k.skin(zs.map((z) => {
      const low = Math.max(SILL + 0.04, archTop(z, REAR_AXLE));
      return [[s * inner, low, z], [s * HALF, low, z], [s * HALF, BED_TOP, z], [s * inner, BED_TOP, z]];
    }), body);
    const segs = near ? 10 : 5;
    for (let i = 0; i < segs; i++) {
      const at = (j: number, x: number) => [s * x, TYRE_R + ARCH * Math.sin((j * Math.PI) / segs), REAR_AXLE - ARCH * Math.cos((j * Math.PI) / segs)];
      k.panel([at(i, HALF - 0.01), at(i + 1, HALF - 0.01), at(i + 1, inner - 0.2), at(i, inner - 0.2)], liner, [s * 0.6, TYRE_R, REAR_AXLE]);
    }
  }
  // Floor, front wall and tailgate, with a dark liner on the floor.
  k.box(0, FLOOR - 0.03, (BED_FRONT + TAILGATE) / 2, 2 * inner, 0.06, BED_FRONT - TAILGATE, liner);
  k.box(0, (FLOOR + BED_TOP) / 2, BED_FRONT - 0.025, 2 * inner, BED_TOP - FLOOR, 0.05, body);
  k.box(0, (SILL + 0.06 + BED_TOP) / 2, TAILGATE + 0.025, 2 * inner, BED_TOP - SILL - 0.06, 0.05, body); // tailgate, between the walls
  // Wheelhouses inside the box.
  for (const s of [-1, 1]) k.box(s * (inner - 0.12), FLOOR + 0.13, REAR_AXLE, 0.24, 0.26, 2 * ARCH, liner);
}

/** Body-colour flare lips standing proud of each wheel opening, from sill to sill over the tyre. */
function flares(k: FaceKit, near: boolean) {
  const a0 = Math.asin((SILL - TYRE_R) / ARCH), segs = near ? 10 : 5, out = 0.035;
  for (const axle of [FRONT_AXLE, REAR_AXLE])
    for (const s of [-1, 1])
      for (let i = 0; i < segs; i++) {
        const ang = (j: number) => a0 + ((Math.PI - 2 * a0) * j) / segs;
        const p = (j: number, x: number, r: number) => [s * x, TYRE_R + r * Math.sin(ang(j)), axle - r * Math.cos(ang(j))];
        const hub = [s * (HALF - 0.3), TYRE_R, axle];
        k.panel([p(i, HALF + out, ARCH), p(i + 1, HALF + out, ARCH), p(i + 1, HALF + out, ARCH + FLARE), p(i, HALF + out, ARCH + FLARE)], body, [0, TYRE_R, axle]);
        k.panel([p(i, HALF - 0.01, ARCH + FLARE), p(i + 1, HALF - 0.01, ARCH + FLARE), p(i + 1, HALF + out, ARCH + FLARE), p(i, HALF + out, ARCH + FLARE)], body, hub);
        k.panel([p(i, HALF - 0.01, ARCH), p(i + 1, HALF - 0.01, ARCH), p(i + 1, HALF + out, ARCH), p(i, HALF + out, ARCH)], liner, [s * (HALF + 1), TYRE_R + 3, axle]);
        // Close the lip at the sill on both ends.
        for (const [j, next] of [[0, 1], [segs, segs - 1]] as const)
          if (i === 0) k.panel([p(j, HALF - 0.01, ARCH), p(j, HALF + out, ARCH), p(j, HALF + out, ARCH + FLARE), p(j, HALF - 0.01, ARCH + FLARE)], body, p(next, HALF + out / 2, ARCH + FLARE / 2));
      }
}

function wheel(k: FaceKit, x: number, z: number, s: number, near: boolean, trim: PickupTrim) {
  const r = TYRE_R,
    w = 0.3,
    rim = trim === 'xl' ? steelWheel : alloy,
    centre = [x, r, z];
  if (!near) {
    const disc = (d: number, radius: number) =>
      Array.from({ length: 8 }, (_, i) => [x + s * d, r + radius * Math.cos((i * Math.PI) / 4), z + radius * Math.sin((i * Math.PI) / 4)]);
    const back = disc(-w / 2, r),
      outer = disc(w / 2, r);
    for (let i = 0; i < 8; i++) k.panel([outer[i], outer[(i + 1) % 8], back[(i + 1) % 8], back[i]], tyre, centre);
    k.panel(outer, tyre, centre);
    k.panel(disc(w / 2 + 0.01, r * 0.62), rim, centre);
    return;
  }
  k.round(x, r, z, 'x', [[-w / 2, r * 0.9], [-w * 0.38, r], [w * 0.38, r], [w / 2, r * 0.9]], tyre, 16);
  const face = x + (s * w) / 2;
  k.round(face, r, z, 'x', [[0, r * 0.66], [s * 0.01, r * 0.63]], rim);
  k.round(face + s * 0.012, r, z, 'x', [[0, r * 0.55], [s * 0.006, r * 0.52]], shadow);
  // Six spokes (alloy) or six vent holes' worth of ribs (steel), and six lugs.
  for (let j = 0; j < 6; j++) {
    const a = (j * Math.PI) / 3,
      p = (ang: number, rad: number) => [face + s * 0.02, r + Math.cos(ang) * rad, z + Math.sin(ang) * rad];
    k.panel([p(a - 0.13, r * 0.18), p(a - 0.09, r * 0.54), p(a + 0.09, r * 0.54), p(a + 0.13, r * 0.18)], rim, [x, r, z]);
    k.round(face + s * 0.022, r + Math.cos(a + Math.PI / 6) * r * 0.14, z + Math.sin(a + Math.PI / 6) * r * 0.14, 'x', [[0, 0.018], [s * 0.01, 0.014]], chrome, 6);
  }
  k.round(face + s * 0.02, r, z, 'x', [[0, r * 0.12], [s * 0.025, r * 0.1]], trim === 'xl' ? dark : chrome, 10);
}

function details(k: FaceKit, near: boolean, trim: PickupTrim) {
  const bright = trim === 'xl' ? plastic : chrome;
  const grilleBar = trim === 'xl' ? grilleXl : chrome;
  // Front: bumper, lower valance, a tall rectangular grille between C-clamp lamps.
  // A chrome (or dark) bar over a dark lower valance; the grille stands tall between the lamp pods.
  k.box(0, 0.78, FRONT - 0.07, 2 * HALF - 0.04, 0.16, 0.14, bright);
  k.box(0, 0.58, FRONT - 0.09, 2 * HALF - 0.12, 0.24, 0.1, plastic);
  // Tall, blunt grille from the bumper to the hood line.
  k.box(0, 1.12, FRONT - 0.035, 1.22, 0.58, 0.05, grilleDark);
  for (const y of [1.0, 1.2]) k.box(0, y, FRONT - 0.008, 1.22, 0.06, 0.02, grilleBar);
  for (const x of [-0.62, 0.62]) k.box(x, 1.12, FRONT - 0.008, 0.05, 0.6, 0.02, grilleBar);
  k.box(0, 1.405, FRONT - 0.008, 1.26, 0.05, 0.02, grilleBar);
  for (const s of [-1, 1]) {
    // Headlamp housing, its lens, the C-shaped running-lamp bar (top and outboard) and an amber marker.
    // Headlamp pod at the grille's top corners, ringed by the C-clamp running lamp: along the top,
    // down the outboard edge and back in under the lamp (lit at night with the headlamps).
    k.box(s * 0.82, 1.2, FRONT - 0.065, 0.36, 0.38, 0.08, dark);
    k.lamp(s * 0.8, 1.21, FRONT - 0.023, 0.2, 0.17, 'z', lens);
    k.lamp(s * 0.83, 1.375, FRONT - 0.021, 0.33, 0.035, 'z', lens);
    k.lamp(s * 0.98, 1.2, FRONT - 0.021, 0.035, 0.36, 'z', lens);
    k.lamp(s * 0.91, 1.035, FRONT - 0.021, 0.17, 0.035, 'z', lens);
    k.lamp(s * 0.8, 1.085, FRONT - 0.023, 0.16, 0.045, 'z', amber);
    k.lamp(s * (HALF + 0.002), 1.15, FRONT - 0.2, 0.08, 0.05, 'x', amber);
    // Fog lamp bar in the bumper.
    k.lamp(s * 0.78, 0.6, FRONT - 0.037, 0.18, 0.04, 'z', lens);
    // Mirror arm and head, door handles and running board.
    // Door-mounted mirror: a short arm and a dark housing, so it reads as a mirror and not a block.
    k.box(s * 1.06, 1.47, 1.06, 0.1, 0.04, 0.08, plastic);
    k.box(s * 1.13, 1.55, 1.04, 0.045, 0.22, 0.2, plastic);
    k.box(s * 1.0, SILL - 0.12, (CAB_BACK + 1.2) / 2, 0.16, 0.05, 1.2 - CAB_BACK - 0.1, plastic);
    // Tail lamps on the box corners, facing back and wrapping the side.
    k.lamp(s * (HALF + INNER) / 2, 1.1, TAILGATE - 0.003, HALF - INNER - 0.01, 0.44, '-z', red);
    k.lamp(s * (HALF + 0.002), 1.1, TAILGATE + 0.08, 0.1, 0.44, 'x', red);
    if (!near) continue;
    // Door cuts: a front door to the B-pillar and a long rear door to the C-pillar.
    for (const z of [1.17, 0.19, -0.86]) k.box(s * (HALF + 0.004), (SILL + 0.04 + BELT) / 2, z, 0.008, BELT - SILL - 0.08, 0.012, shadow);
    for (const z of [0.42, -0.62]) k.box(s * (HALF + 0.012), 1.22, z, 0.02, 0.04, 0.2, trim === 'xl' ? plastic : body);
    k.box(s * (HALF + 0.004), (SILL + 0.04 + BED_TOP) / 2, BED_FRONT - 0.006, 0.008, BED_TOP - SILL - 0.08, 0.012, shadow);
  }
  // Rear step bumper, plate recess, and the frame and fuel tank that fill the underside.
  k.box(0, 0.62, FRONT - PICKUP_LENGTH + 0.07, 2 * HALF - 0.06, 0.22, 0.14, bright);
  k.box(0, 0.92, TAILGATE - 0.004, 0.34, 0.17, 0.008, dark);
  k.box(0, 0.5, (FRONT_AXLE + REAR_AXLE) / 2, 1.25, 0.28, FRONT_AXLE - REAR_AXLE + 0.9, dark);
}

function kindOf(color: string) {
  return color === body ? 0 : color === lens ? 1 : color === red ? 2 : color === glass || color === wind ? 3 : color === amber ? 5 : 4;
}

/** The pickup centred on its footprint. `paint` bakes a body colour for a plain (non-instanced) mesh. */
export function roadPickupGeometry({ near = false, paint = body, trim = 'xlt' as PickupTrim } = {}) {
  const k = faceKit();
  frontBody(k, near);
  cab(k);
  bed(k, near);
  for (const s of [-1, 1]) for (const z of [FRONT_AXLE, REAR_AXLE]) wheel(k, (s * TRACK) / 2, z, s, near, trim);
  flares(k, near);
  details(k, near, trim);
  return packFaces(k.faces, kindOf, paint);
}

/** Generic look-alike paints from the current range, for the Lab and the traffic palette. */
export const PICKUP_PAINTS: Record<string, { label: string; hex: string }> = {
  white: { label: 'Oxford-like white', hex: '#eceeed' },
  black: { label: 'Agate-like black', hex: '#1d1f22' },
  silver: { label: 'Iconic-like silver', hex: '#a9aeb2' },
  grey: { label: 'Carbonized-like grey', hex: '#4b4f54' },
  stone: { label: 'Stone grey', hex: '#7b766c' },
  blue: { label: 'Antimatter-like blue', hex: '#22304d' },
  red: { label: 'Rapid-like red', hex: '#8d1d22' },
};
