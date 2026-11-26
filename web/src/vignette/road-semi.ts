import { faceKit, packFaces } from './face-kit';

/**
 * Long-hood sleeper tractor (Peterbilt 589-style proportions, no badges or lettering) coupled to a
 * generic 53 ft dry van, ported from the everyday-cars finish study (codex/sedan-rear-polish 08669e18).
 * Metres, +z forward, y = 0 at the tyre contact, x lateral. Dimensions and sources: docs/road-semi.md.
 *
 * `near` is the close form (Model Lab, street-eye); the distant form drops fine fittings and uses
 * eight-sided wheels. Kinds follow vehicles.ts: 0 paint, 1 headlamp, 2 tail lamp, 3 glass, 4 fixed.
 */

// Tractor stations (study): bumper face, steer axle 31 in behind it, 280 in wheelbase to the tandem
// midpoint, bumper to back of cab 130.9 in, 72 in sleeper, 1.51 m frame overhang behind the tandem.
const BUMPER = 4.12;
const STEER = BUMPER - 0.7874;
const TANDEM = STEER - 7.112;
const CAB_BACK = BUMPER - 3.325;
const SLEEPER_REAR = CAB_BACK - 1.83;
const FRAME_TAIL = TANDEM - 1.51;
/** Fifth-wheel pin, 0.23 m ahead of the tandem midpoint (study). */
export const SEMI_KINGPIN = TANDEM + 0.23;
// 53 ft van: 36 in kingpin setback, 102.4 in wide, 13 ft 6 in overall height, 47 in coupler height.
const VAN_LENGTH = 16.154;
const VAN_FRONT = SEMI_KINGPIN + 0.914;
const VAN_REAR = VAN_FRONT - VAN_LENGTH;
const VAN_WIDTH = 2.6;
const VAN_FLOOR = 1.2;
const VAN_TOP = 4.115;
/** Sliding tandem slid back: rear axle 1.3 m ahead of the rear sill (estimated), 49 in axle spread. */
const VAN_REAR_AXLE = VAN_REAR + 1.3;
const VAN_AXLES = [VAN_REAR_AXLE, VAN_REAR_AXLE + 1.245];
/** Landing gear 134.5 in behind the front wall (Great Dane Champion spec). */
const LANDING = VAN_FRONT - 3.42;

export const SEMI_FRONT = BUMPER;
/** Rear lamps stand 6 cm proud of the rear frame. */
export const SEMI_REAR = VAN_REAR - 0.06;
/** Bumper to rear lamps, 22.97 m (22.91 m to the rear sill). */
export const SEMI_LENGTH = SEMI_FRONT - SEMI_REAR;

const bodyPaint = '#ffffff',
  dark = '#20272a',
  tyre = '#292a2b',
  rubber = '#373a3a',
  steel = '#a5aba9',
  bright = '#c4c9c7',
  alloy = '#939b9d',
  shadow = '#465056',
  glass = '#344855',
  wind = '#465d69',
  lens = '#d9d9c7',
  red = '#a3302c',
  amber = '#c88c4b',
  van = '#eeede6',
  vanRail = '#b9bebd',
  vanFrame = '#8c9294';


/** The face kit plus the semi's truck wheels. */
function kit() {
  const k = faceKit();
  const { panel, round } = k;
  /** Truck wheel: tyre, rim, hub and eight studs close up; an octagonal drum with a hub disc far off. */
  function wheel(x: number, r: number, z: number, side: number, near: boolean) {
    const w = 0.26,
      centre = [x, r, z];
    if (!near) {
      const disc = (d: number, radius: number) =>
        Array.from({ length: 8 }, (_, i) => [x + side * d, r + radius * Math.cos((i * Math.PI) / 4), z + radius * Math.sin((i * Math.PI) / 4)]);
      const back = disc(-w / 2, r),
        outer = disc(w / 2, r);
      for (let i = 0; i < 8; i++) {
        const j = (i + 1) % 8;
        panel([outer[i], outer[j], back[j], back[i]], tyre, centre);
      }
      panel(outer, tyre, centre);
      panel(disc(w / 2 + 0.012, r * 0.55), alloy, centre);
      return;
    }
    round(x, r, z, 'x', [[-w / 2, r * 0.92], [-w * 0.36, r], [w * 0.36, r], [w / 2, r * 0.92]], tyre, 16);
    const end = x + (side * w) / 2;
    round(end, r, z, 'x', [[0, r * 0.68], [side * 0.012, r * 0.65]], alloy);
    round(end + side * 0.014, r, z, 'x', [[0, r * 0.56], [side * 0.008, r * 0.52]], shadow);
    for (let j = 0; j < 8; j++) {
      const a = (j * 2 * Math.PI) / 8;
      round(end + side * 0.026, r + Math.sin(a) * r * 0.35, z + Math.cos(a) * r * 0.35, 'x', [[0, 0.036], [side * 0.013, 0.027]], bright, 6);
    }
    round(end + side * 0.026, r, z, 'x', [[0, r * 0.24], [side * 0.033, r * 0.19]], steel, 10);
  }
  /** Inner dual casing, 0.322 m inboard of the outer tyre: 62 mm between sidewalls. */
  function innerDual(x: number, r: number, z: number, near: boolean) {
    if (near) round(x, r, z, 'x', [[-0.13, r * 0.918], [-0.1, r], [0.1, r], [0.13, r * 0.918]], tyre, 16);
    else round(x, r, z, 'x', [[-0.13, r], [0.13, r]], tyre, 8);
  }
  return { ...k, wheel, innerDual };
}

type Kit = ReturnType<typeof kit>;

function tractor(k: Kit, near: boolean) {
  const { skin, panel, box, round, wheel, innerDual } = k;
  const nose = BUMPER - 0.07,
    n = near ? 12 : 6;
  function shell(stations: number[][], color: string) {
    skin(
      stations.map(([z, w, low, top]) => [
        [-w * 0.5, low, z], [w * 0.5, low, z], [w * 0.5, top - 0.09, z],
        [w * 0.44, top, z], [-w * 0.44, top, z], [-w * 0.5, top - 0.09, z],
      ]),
      color,
    );
  }
  // Frame rails, hood, cab and sleeper.
  for (const s of [-1, 1]) box(s * 0.43, 0.78, (nose + FRAME_TAIL) / 2, 0.13, 0.27, nose - FRAME_TAIL, dark);
  // Hood about 1.9 m tall, as the dealer side photo reads when scaled by its tyres; the cab's cowl
  // steps up from it to the windshield base.
  shell([[1.96, 1.43, 1.06, 1.9], [2.27, 1.4, 1.04, 1.93], [nose - 0.15, 1.3, 1.06, 1.86], [nose - 0.1, 1.24, 1.06, 1.835]], bodyPaint);
  shell([[CAB_BACK, 2.08, 1.2, 3.01], [1.61, 2.04, 1.2, 3.01], [1.98, 2.02, 1.18, 2.3], [2.04, 2.02, 1.18, 2.2]], bodyPaint);
  panel([[-0.87, 2.88, 1.7], [0.87, 2.88, 1.7], [0.92, 2.22, 2.036], [-0.92, 2.22, 2.036]], wind, [0, 2.4, 1.2]);
  shell(
    [[SLEEPER_REAR, 2.22, 1.05, 3.35], [SLEEPER_REAR + 0.1, 2.24, 1.04, 3.45], [CAB_BACK - 0.3, 2.22, 1.04, 3.45], [CAB_BACK + 0.04, 2.14, 1.09, 3.17]],
    bodyPaint,
  );
  // Grille surround, grille and bumper.
  box(0, 1.38, nose - 0.055, 1.32, 0.96, 0.12, bright);
  box(0, 1.39, nose + 0.012, 1.15, 0.84, 0.025, shadow);
  // Vertical slats with three heavier dividers, as on the photographed grille.
  for (let i = -5; i <= 5; i++) box(i * 0.098, 1.39, nose + 0.031, 0.021, 0.74, 0.018, alloy);
  for (const x of [-0.28, 0, 0.28]) box(x, 1.39, nose + 0.044, 0.045, 0.78, 0.022, bright);
  // Deep chrome bumper, about 0.42 m tall in the dealer front photo.
  box(0, 0.7, nose, 2.47, 0.42, 0.14, steel);
  for (const s of [-1, 1]) {
    panel([[s * 1.043, 2.13, 0.94], [s * 1.043, 2.82, 0.94], [s * 1.043, 2.84, 1.62], [s * 1.043, 2.18, 1.91]], glass, [0, 2.4, 1.3]);
    wheel(s * 0.995, 0.51, STEER, s, near);
    for (const z of [TANDEM - 0.67, TANDEM + 0.67]) {
      wheel(s * 1.032, 0.51, z, s, near);
      innerDual(s * 0.71, 0.51, z, near);
    }
    // Full wrap-around front fenders: the crown runs from below the hub in front, over the tyre and
    // down behind it, with a deep outer face over the top of the sidewall.
    const hub = [s * 1.0, 0.51, STEER];
    const from = -0.42, to = Math.PI + 0.3;
    for (let i = 0; i < n; i++) {
      const a = (j: number) => from + ((to - from) * j) / n;
      const p = (j: number, x: number, r: number) => [s * x, 0.51 + r * Math.sin(a(j)), STEER + r * Math.cos(a(j))];
      panel([p(i, 0.74, 0.66), p(i, 1.25, 0.66), p(i + 1, 1.25, 0.66), p(i + 1, 0.74, 0.66)], bodyPaint, hub);
      panel([p(i, 1.25, 0.66), p(i, 1.25, 0.45), p(i + 1, 1.25, 0.45), p(i + 1, 1.25, 0.66)], bodyPaint, hub);
      // The low front and rear wraps are seen from inside along the road, so give them an inner face
      // just inside the outer one (normal toward the hub: `panel` turns it away from a point outside).
      if (i === 0 || i === n - 1) {
        const out = [s * 1.0, 0.51 + 3 * Math.sin(a(i + 0.5)), STEER + 3 * Math.cos(a(i + 0.5))];
        panel([p(i, 0.74, 0.655), p(i, 1.25, 0.655), p(i + 1, 1.25, 0.655), p(i + 1, 0.74, 0.655)], bodyPaint, out);
      }
    }
    // Headlamp pods on the fenders.
    box(s * 0.992, 1.23, STEER + 0.46, 0.43, 0.21, 0.34, alloy);
    box(s * 0.992, 1.23, STEER + 0.64, 0.34, 0.135, 0.018, lens);
    // Strapped fuel tanks, steps and air cleaners.
    round(s * 0.88, 0.735, -0.19, 'z', [[-0.78, 0.3], [-0.72, 0.345], [0.67, 0.345], [0.74, 0.3]], steel, n);
    if (near) for (const z of [-0.71, 0.39]) round(s * 0.88, 0.735, z, 'z', [[-0.037, 0.35], [0.037, 0.35]], shadow);
    box(s * 0.92, 0.89, 1.35, 0.55, 0.48, 0.93, steel);
    for (let i = 0; i < 3; i++) box(s * (1.15 - i * 0.065), 0.59 + i * 0.18, 1.36, 0.2, 0.055, 0.96, bright);
    round(s * 1.056, 0, 0.74, 'y', [[1.05, 0.105], [3.64, 0.105], [3.71, 0.096]], steel, n);
    // Grab handle, mirror arm and mirror head.
    box(s * 1.09, 2.08, 0.94, 0.032, 0.46, 0.032, bright);
    box(s * 1.16, 2.61, 1.74, 0.25, 0.032, 0.035, alloy);
    box(s * 1.272, 2.57, 1.74, 0.055, 0.35, 0.14, bright);
    if (!near) continue;
    round(s * 1.03, 0, 2.06, 'y', [[1.35, 0.14], [1.42, 0.18], [2.13, 0.18], [2.2, 0.14]], bright);
    // Sleeper service door with inset window and latch, door seam, mirror arm and head.
    box(s * 1.121, 2.03, -0.49, 0.025, 1.37, 0.55, shadow);
    box(s * 1.14, 2.03, -0.49, 0.025, 1.32, 0.5, bodyPaint);
    box(s * 1.157, 2.43, -0.49, 0.016, 0.365, 0.405, glass);
    box(s * 1.155, 1.67, -0.64, 0.018, 0.108, 0.065, dark);
    box(s * 1.05, 0.62, FRAME_TAIL + 0.25, 0.49, 0.6, 0.05, rubber);
  }
  // Slotted fifth wheel on slide rails, under the trailer's kingpin.
  for (const s of [-1, 1]) {
    box(s * 0.34, 0.985, SEMI_KINGPIN, 0.14, 0.15, 1.44, steel);
    if (near)
      panel(
        [[s * 0.04, 1.12, SEMI_KINGPIN + 0.45], [s * 0.42, 1.12, SEMI_KINGPIN + 0.41], [s * 0.53, 1.12, SEMI_KINGPIN + 0.13],
          [s * 0.49, 1.12, SEMI_KINGPIN - 0.43], [s * 0.34, 1.12, SEMI_KINGPIN - 0.52], [s * 0.075, 1.12, SEMI_KINGPIN + 0.04]],
        dark,
        [s * 0.3, 0, SEMI_KINGPIN],
      );
  }
  // Five amber cab-roof markers: small boxes close up, forward-facing quads far off.
  for (const x of [-0.74, -0.36, 0, 0.36, 0.74])
    if (near) box(x, 3.018, 1.52, 0.073, 0.048, 0.12, amber);
    else k.lamp(x, 3.018, 1.58, 0.073, 0.048, 'z', amber);
  // Catwalk between the sleeper and the fifth wheel.
  box(0, 0.999, -1.66, 0.99, 0.08, 0.94, alloy);
  if (near) {
    for (let i = -5; i <= 5; i++) box(i * 0.091, 1.046, -1.66, 0.019, 0.014, 0.88, shadow);
  }
}

function dryVan(k: Kit, near: boolean) {
  const { box, wheel, innerDual } = k;
  // The box takes the van paint kind: white unless a traffic slot picks one of the plain colours.
  const half = VAN_WIDTH / 2,
    mid = (VAN_FRONT + VAN_REAR) / 2,
    h = VAN_TOP - VAN_FLOOR;
  // Plain composite-panel box; the rear frame and rails are separate so the ink finds the edges.
  box(0, VAN_FLOOR + h / 2, mid, VAN_WIDTH, h, VAN_LENGTH, van);
  // Rails stand proud of the sides but stop short of the roof and floor faces, so no face is coplanar.
  for (const y of [VAN_FLOOR + 0.07, VAN_TOP - 0.065]) box(0, y, mid, VAN_WIDTH + 0.02, y < 2 ? 0.12 : 0.1, VAN_LENGTH + 0.01, vanRail);
  // Rear frame: header, sill and corner posts around the swing doors.
  const rear = VAN_REAR - 0.02;
  box(0, VAN_TOP - 0.115, rear, VAN_WIDTH + 0.02, 0.21, 0.05, vanFrame);
  box(0, VAN_FLOOR + 0.105, rear, VAN_WIDTH + 0.02, 0.2, 0.05, vanFrame);
  for (const s of [-1, 1]) box(s * (half - 0.07), (VAN_FLOOR + VAN_TOP) / 2, rear, 0.14, h - 0.01, 0.05, vanFrame);
  // Tail and stop lamps in the sill, three red ID lamps in the header.
  for (const s of [-1, 1]) for (const x of [0.92, 1.05]) box(s * x, VAN_FLOOR + 0.1, rear - 0.03, 0.09, 0.09, 0.02, red);
  for (const x of [-0.3, 0, 0.3]) box(x, VAN_TOP - 0.11, rear - 0.03, 0.08, 0.05, 0.02, red);
  // Floor crossmembers read as one dark undertray; sliding tandem subframe and rear impact guard.
  box(0, VAN_FLOOR - 0.08, mid, VAN_WIDTH - 0.3, 0.16, VAN_LENGTH - 0.2, dark);
  box(0, 0.98, (VAN_AXLES[0] + VAN_AXLES[1]) / 2, 1.0, 0.24, 3.4, dark);
  box(0, 0.48, VAN_REAR + 0.15, 2.3, 0.16, 0.12, steel);
  for (const s of [-1, 1]) box(s * 0.75, 0.82, VAN_REAR + 0.25, 0.1, 0.56, 0.1, steel);
  for (const s of [-1, 1]) {
    for (const z of VAN_AXLES) {
      wheel(s * 1.035, 0.51, z, s, near);
      innerDual(s * 0.713, 0.51, z, near);
    }
    // Mud flaps behind the tandem. No side skirts: dropped at review as uncommon.
    box(s * 0.9, 0.55, VAN_AXLES[0] - 0.65, 0.55, 0.62, 0.03, rubber);
    // Amber clearance lamps at the top front corners and a mid-ship side marker, lit at night.
    k.lamp(s * (half - 0.05), VAN_TOP - 0.05, VAN_FRONT + 0.012, 0.08, 0.05, 'z', amber);
    k.lamp(s * (half + 0.012), VAN_FLOOR + 0.02, mid, 0.1, 0.05, 'x', amber);
    // Landing gear leg and sand shoe.
    box(s * 0.85, 0.72, LANDING, 0.11, 0.92, 0.11, vanFrame);
    if (near) {
      box(s * 0.85, 0.22, LANDING, 0.24, 0.05, 0.3, dark);
      box(s * 0.85, 1.0, LANDING + 0.13, 0.05, 0.05, 0.14, dark);
      // Composite panel seams, side marker lamps and the door hinges.
      for (let i = 1; i < 13; i++) box(s * (half + 0.004), (VAN_FLOOR + VAN_TOP) / 2, VAN_FRONT - (i * VAN_LENGTH) / 13, 0.008, h - 0.2, 0.04, vanRail);
      for (const z of [VAN_FRONT - 0.3, VAN_REAR + 0.3]) box(s * (half + 0.012), VAN_FLOOR + 0.02, z, 0.02, 0.05, 0.1, z === VAN_REAR + 0.3 ? red : amber);
      // Red clearance lamps at the top rear corners.
      box(s * (half - 0.05), VAN_TOP - 0.2, rear - 0.03, 0.06, 0.05, 0.02, red);
      for (const y of [1.65, 2.6, 3.55]) box(s * (half - 0.22), y, rear - 0.035, 0.12, 0.1, 0.02, alloy);
    }
  }
  if (near) {
    // Centre door seam and four lock rods.
    box(0, (VAN_FLOOR + VAN_TOP) / 2, rear - 0.01, 0.03, h - 0.4, 0.04, vanFrame);
    for (const x of [-0.85, -0.18, 0.18, 0.85]) box(x, (VAN_FLOOR + VAN_TOP) / 2, rear - 0.035, 0.03, h - 0.5, 0.03, alloy);
  }
}

/** Kinds from colour: paint takes the instance colour, lamps glow at night (amber is kind 5), the van
 * box is kind 6 (white, or a traffic slot's van colour), and the rest is fixed. */
function kindOf(color: string) {
  return color === bodyPaint ? 0 : color === lens ? 1 : color === red ? 2 : color === glass || color === wind ? 3
    : color === amber ? 5 : color === van ? 6 : 4;
}

/**
 * The coupled rig as one rigid body, recentred on its footprint like every traffic vehicle.
 * `paint` bakes a cab colour into the paint vertices for a plain (non-instanced) mesh.
 */
export function roadSemiGeometry({ near = false, paint = bodyPaint } = {}) {
  const k = kit();
  tractor(k, near);
  dryVan(k, near);
  return packFaces(k.faces, kindOf, paint, -(SEMI_FRONT + SEMI_REAR) / 2);
}
