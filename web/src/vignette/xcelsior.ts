/**
 * MARTA bus: a New Flyer Xcelsior 40-foot (most of MARTA's fleet; CNG with roof enclosures),
 * built in code to the manufacturer's published dimensions (New Flyer Xcelsior family
 * brochure, 2021) and proportions traced from its side-elevation drawing:
 *   12.24 m over body (12.50 m over bumpers) · 2.6 m wide · 3.38 m over the CNG roof enclosures
 *   wheelbase 7.2 m · front overhang ≈ 2.2 m · 305/70R22.5 tyres (≈ 1.0 m diameter)
 *   step height 356 mm · front door behind the windscreen, rear door ahead of the rear axle.
 *
 * Faces +z; origin at the centre of the footprint on the ground. Facing +z the right-hand
 * (curb) side is −x, so the doors are on −x. Livery is a parameter (`BusLivery`), from reference
 * photos of MARTA's scheme. No logos.
 *
 * Per-vertex `aKind` (read by `busMaterial`): 0 fixed, 1 headlight, 2 tail light, 3 glass, 4 Rapid passenger glass,
 * 7 destination sign.
 */
import * as THREE from 'three';

export const BUS_LENGTH = 12.5; // over bumpers
const L = 12.24; // over body
const W = 2.6;
const H = 3.02; // roof (body)
const H_CNG = 3.38; // over roof enclosures
const Y0 = 0.3; // underside of the body (ground clearance)
const ZF = L / 2; // front face
const ZR = -L / 2; // rear face
const AXLE_F = ZF - 2.2;
const AXLE_R = AXLE_F - 7.2;
const TYRE_R = 0.5;
const ARCH_R = 0.6;
const ARCH_Y = 0.46; // arch centre height
const BEV = 0.08; // edge rounding

export interface BusLivery {
  rapid?: boolean;
  body: string;
  blue: string; // the three slashes and the streak along the roofline
  gold: string;
  orange: string;
  grey: string; // the big slanted rear lettering, reduced to a plain band
  greyOnGlass: string;
}
/** MARTA's current bus livery (from Sam's photos): white, three blue slashes over the window
 *  band that run out into a streak with gold and orange dashes, and a grey slanted band where
 *  the big rear lettering sits. No wordmark. */
export const DEFAULT_LIVERY: BusLivery = {
  body: '#fbfbf9',
  blue: '#3790dd',
  gold: '#f6bb2a',
  orange: '#f08424',
  grey: '#c4c9ce',
  greyOnGlass: '#69717a',
};

export const RAPID_LIVERY: BusLivery = {
  ...DEFAULT_LIVERY, rapid: true, body: '#7954aa', grey: '#b6a7c9',
};

const C = {
  glass: '#28303a',
  frame: '#0f1114',
  tyre: '#1a1b1e',
  rim: '#8f959b',
  rimLip: '#b4b9be',
  hubRing: '#5d6268',
  hub: '#222428',
  well: '#15171a',
  roofCap: '#e6e9eb',
  bumper: '#2b2e34',
  mirror: '#24272c',
  grille: '#2f3238',
};

class Kit {
  pos: number[] = [];
  col: number[] = [];
  kind: number[] = [];
  private c = new THREE.Color();
  geo(g: THREE.BufferGeometry, color: string, kind = 0) {
    const gg = g.index ? g.toNonIndexed() : g;
    const p = gg.attributes.position.array;
    this.c.set(color);
    for (let i = 0; i < p.length; i++) this.pos.push(p[i]);
    for (let i = 0; i < p.length / 3; i++) {
      this.col.push(this.c.r, this.c.g, this.c.b);
      this.kind.push(kind);
    }
  }
  box(w: number, h: number, l: number, x: number, y: number, z: number, color: string, kind = 0, rot?: THREE.Euler) {
    const g = new THREE.BoxGeometry(w, h, l);
    if (rot) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(rot));
    g.translate(x, y, z);
    this.geo(g, color, kind);
  }
  /** A side-on panel at x = ±(W/2 + lift), from z0..z1 and y0..y1, on each listed side. */
  side(sides: number[], z0: number, z1: number, y0: number, y1: number, color: string, kind = 0, lift = 0.006) {
    for (const s of sides) this.box(0.02, y1 - y0, z1 - z0, s * (W / 2 + lift), (y0 + y1) / 2, (z0 + z1) / 2, color, kind);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aKind', new THREE.Float32BufferAttribute(this.kind, 1));
    g.computeVertexNormals();
    return g;
  }
}

/** The body's side profile (z along, y up), with semicircular wheel arches cut into the bottom. */
function bodyProfile() {
  const s = new THREE.Shape();
  // The bevel grows the outline by BEV, so trace the profile inset by BEV.
  const b = BEV;
  s.moveTo(ZR + b, Y0 + b);
  for (const zc of [AXLE_R, AXLE_F]) {
    const r = ARCH_R + b;
    s.lineTo(zc - r, Y0 + b);
    s.lineTo(zc - r, ARCH_Y);
    s.absarc(zc, ARCH_Y, r, Math.PI, 0, true);
    s.lineTo(zc + r, Y0 + b);
  }
  s.lineTo(ZF - 0.12 - b, Y0 + b);
  // Front: a slight lower bulge, then the windscreen leaning back gently into the roof.
  s.lineTo(ZF - b, 0.75);
  s.lineTo(ZF - b, 1.12);
  s.lineTo(ZF - 0.07 - b, 2.75);
  s.quadraticCurveTo(ZF - 0.1 - b, H - b, ZF - 0.42 - b, H - b);
  s.lineTo(ZR + 0.3 + b, H - b);
  s.quadraticCurveTo(ZR + b, H - b, ZR + b, H - 0.3);
  s.lineTo(ZR + b, Y0 + b);
  return s;
}

function roofExtrusion(shape: THREE.Shape, width: number, low: boolean) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: width, bevelEnabled: true, bevelThickness: .06, bevelSize: .04,
    bevelSegments: low ? 1 : 2, curveSegments: low ? 3 : 8,
  });
  geometry.translate(0, 0, -width / 2);
  return geometry.rotateY(-Math.PI / 2);
}

/** Xcelsior equipment shroud: a 36 cm crown, rounded shoulders and asymmetric end curves. */
export function xcelsiorRoofFairing(rear: number, front: number, deck: number, low = false) {
  const enclosure = new THREE.Shape();
  enclosure.moveTo(rear, deck - .01);
  enclosure.lineTo(front, deck - .01);
  enclosure.quadraticCurveTo(front - .05, deck + .31, front - .60, deck + .32);
  enclosure.lineTo(rear + .70, deck + .32);
  enclosure.quadraticCurveTo(rear + .10, deck + .31, rear, deck - .01);
  return roofExtrusion(enclosure, W - .5, low);
}

/** Rigid City LOD. Shares the detailed XN40 footprint, wheelbase, arch profile and material. */
export function cityBusGeometry(liv: BusLivery = DEFAULT_LIVERY) {
  const k = new Kit();
  const shell = new THREE.ExtrudeGeometry(bodyProfile(), { depth: W, bevelEnabled: false, curveSegments: 3 });
  k.geo(shell.translate(0, 0, -W/2).rotateY(-Math.PI/2), liv.body);
  k.box(W-.35, .36, 6.7, 0, H+.18, -.5, C.roofCap);
  for (const side of [-1, 1]) {
    for (let i=0; i<7; i++) {
      const z = ZR+.35+i*1.62;
      k.side([side], z, z+1.53, 1.58, 2.63, C.glass, 3);
    }
    k.side([side], ZR+.15, ZF-.25, 1.35, 1.49, liv.blue);
    for (const axle of [AXLE_R, AXLE_F]) {
      k.geo(new THREE.CylinderGeometry(TYRE_R, TYRE_R, .28, 10)
        .rotateZ(Math.PI/2).translate(side*(W/2-.13), TYRE_R, axle), C.tyre);
      k.geo(new THREE.CircleGeometry(.27, 10).rotateY(side*Math.PI/2)
        .translate(side*(W/2+.02), TYRE_R, axle), C.rim);
    }
    k.box(.32, .12, .04, side*.94, .88, ZF, '#ffffff', 1);
    k.box(.18, .5, .04, side*1.03, 1, ZR, '#d42c24', 2);
  }
  for (const z of [AXLE_F+1.25, AXLE_R+1.45]) k.side([-1], z-.44,z+.44,.45,2.68,C.glass,3,.025);
  k.box(W-.21, 1.1, .05, 0, 2, ZF-.13, C.glass, 3);
  k.box(W-.62, .18, .05, 0, 2.82, ZF-.22, '#ffb84a', 7);
  return k.geometry();
}

export function busGeometry(liv: BusLivery = DEFAULT_LIVERY) {
  const k = new Kit();
  // ---- body shell: profile extruded across the width with rounded edges ------------------
  const body = new THREE.ExtrudeGeometry(bodyProfile(), {
    depth: W - 2 * BEV,
    bevelEnabled: true,
    bevelThickness: BEV,
    bevelSize: BEV,
    bevelSegments: 3,
    curveSegments: 20,
  });
  body.translate(0, 0, -(W - 2 * BEV) / 2);
  body.rotateY(-Math.PI / 2);
  k.geo(body, liv.body);
  // Dark wheel wells: an open half-tube lining the top of each arch, just inside the arch wall.
  for (const zc of [AXLE_R, AXLE_F]) {
    const well = new THREE.CylinderGeometry(ARCH_R - 0.015, ARCH_R - 0.015, W - 0.04, 28, 1, true, 0, Math.PI);
    well.rotateZ(Math.PI / 2); // axis across the bus; theta 0..PI is now the upper half
    well.translate(0, ARCH_Y, zc);
    k.geo(well, C.well);
    // The straight lower lips of the arch (from ARCH_Y down to the skirt).
    for (const dz of [-1, 1]) k.box(W - 0.1, ARCH_Y - Y0, 0.01, 0, (ARCH_Y + Y0) / 2, zc + dz * (ARCH_R - 0.02), C.well);
  }

  const both = [-1, 1];
  /** A side quad at x = ±(W/2 + lift), corners as [z, y] (front-at-top order is fine: DoubleSide). */
  const decal = (sides: number[], pts: [number, number][], color: string, lift: number, kind = 0) => {
    for (const sd of sides) {
      const x = sd * (W / 2 + lift);
      const [p0, p1, p2, p3] = pts.map(([z, y]) => [x, y, z]);
      k.geo(quad(p0, p1, p2, p3), color, kind);
    }
  };

  // ---- window band (belt 1.2 m, head 2.32 m, read from the side photos) ----------------------
  // One continuous dark band from the driver's window back to ~1.1 m short of the tail, with
  // panes split by thin mullions; the doors (curb side, −x) are full-height dark leaves.
  const BELT = 1.2;
  const HEAD = 2.32;
  const BAND_R = ZR + 1.1;
  const DOOR_R: [number, number] = [AXLE_R + 1.55, AXLE_R + 2.75];
  const DOOR_F: [number, number] = [ZF - 1.28, ZF - 0.22];
  k.side(both, BAND_R, ZF - 0.22, BELT - 0.05, HEAD + 0.05, C.frame, 0, 0.007);
  const passengerGlass = liv.rapid ? 4 : 3;
  const pane = (sides: number[], z0: number, z1: number) => k.side(sides, z0, z1, BELT, HEAD, C.glass, passengerGlass, 0.011);
  // Street side (+x): driver's window, then five even bays back to the band's end.
  pane([1], DOOR_F[0] + 0.04, ZF - 0.3);
  const bays = 5;
  const bz0 = BAND_R + 0.06;
  const bz1 = DOOR_F[0] - 0.04;
  for (let i = 0; i < bays; i++) {
    const za = bz0 + ((bz1 - bz0) * i) / bays;
    pane([1], za + (i ? 0.04 : 0), za + (bz1 - bz0) / bays - 0.04);
  }
  // Curb side (−x): panes between the doors.
  pane([-1], bz0, DOOR_R[0] - 0.12);
  const midA = DOOR_R[1] + 0.12;
  const midB = DOOR_F[0] - 0.12;
  for (let i = 0; i < 3; i++) {
    const za = midA + ((midB - midA) * i) / 3;
    pane([-1], za + (i ? 0.04 : 0), za + (midB - midA) / 3 - (i < 2 ? 0.04 : 0));
  }

  // ---- livery: blue slashes, roofline streak, yellow/orange dashes, grey rear band ------------
  if (liv.rapid) {
    for (const [start, end, color] of [[ZR + .12, -1.5, liv.orange], [-1.5, .65, liv.gold], [.65, ZF - .12, liv.blue]] as const) {
      decal(both, [[start, BELT - .17], [end, BELT - .17], [end, BELT - .08], [start, BELT - .08]], color, .006);
    }
    decal(both, [[AXLE_R + .66, Y0 + .08], [AXLE_F - .85, Y0 + .08], [AXLE_F - 1.9, BELT - .19], [AXLE_R + 1.5, BELT - .19]], liv.grey, .006);
  } else {
    const UY0 = HEAD + 0.05; // upper white band, window head to the roof edge
    const UY1 = H - 0.06;
    const zAt = (d: number) => ZF - d; // distance back from the front face → z
    const bandH = UY1 - UY0;
    const SLANT = 0.85; // how far each slash leans back over the band's height
    const lean = SLANT / bandH; // dz per metre of height, shared by every slanted edge
    // A slash's leading edge at "unrolled height" h (h runs on up over the roof edge and the CNG pod).
    const SL = [3.35, 3.93, 4.51];
    const SW = 0.4;
    const slashD = (i: number, h: number) => SL[i] + (UY1 - h) * lean;
    // The stack along the roofline (blue streak, yellow, orange), centred in the upper band.
    const stack = [
      { h: 0.1, color: liv.blue, end: 8.1 },
      { h: 0.06, color: liv.gold, end: 7.5 },
      { h: 0.045, color: liv.orange, end: 7.05 },
    ];
    const GAP = 0.035;
    const stackH = stack.reduce((t, r) => t + r.h, 0) + GAP * (stack.length - 1);
    let yTop = UY0 + (bandH + stackH) / 2;
    const rows = stack.map((r) => {
      const row = { ...r, y1: yTop, y0: yTop - r.h };
      yTop -= r.h + GAP;
      return row;
    });
    // Cross-section path from the side's upper band, round the roof edge, across the roof strip and
    // up the CNG pod's side to its flat top. Each point: x (unsigned), y, height h for the lean.
    const POD_X = (W - 0.5) / 2 + 0.06; // pod side face (extrude half-depth + bevel thickness)
    const rp: [number, number, number][] = [];
    {
      const pts: [number, number][] = [
        [W / 2 + 0.008, UY1],
        [W / 2 + 0.002, H - 0.02],
        [W / 2 - 0.06, H + 0.012],
        [POD_X + 0.012, H + 0.012],
        [POD_X + 0.012, H_CNG - 0.06],
        [POD_X - 0.03, H_CNG + 0.012],
      ];
      // Lean by true height (not distance along the surface), so from the side each slash reads as
      // one straight band running up onto the pod; across the flat roof strip it just bridges.
      for (const [x, y] of pts) rp.push([x, y, y]);
    }
    for (let i = 0; i < 3; i++) {
      // Side part: every slash runs down to the window head; the streak branches off the third.
      const yb = UY0;
      decal(both, [[zAt(slashD(i, UY1)), UY1], [zAt(slashD(i, UY1) + SW), UY1], [zAt(slashD(i, yb) + SW), yb], [zAt(slashD(i, yb)), yb]], liv.blue, 0.008);
      // Roof part: segment by segment along the path, keeping the same lean.
      for (const sd of both) {
        for (let j = 1; j < rp.length; j++) {
          const [xa, ya, ha] = rp[j - 1];
          const [xb, yb2, hb] = rp[j];
          const A = [sd * xa, ya, zAt(slashD(i, ha))];
          const B = [sd * xa, ya, zAt(slashD(i, ha) + SW)];
          const Cc = [sd * xb, yb2, zAt(slashD(i, hb) + SW)];
          const D = [sd * xb, yb2, zAt(slashD(i, hb))];
          k.geo(quad(A, B, Cc, D), liv.blue);
        }
      }
    }
    // Streak, yellow and orange: horizontal runs with ends at the slashes' lean. The streak starts
    // inside the third slash (same colour, so it reads as one shape); the others start a gap behind it.
    rows.forEach((r, j) => {
      const start = (y: number) => (j === 0 ? slashD(2, y) : slashD(2, y) + SW + 0.1);
      const stop = (y: number) => r.end + (r.y1 - y) * lean;
      decal(both, [[zAt(start(r.y1)), r.y1], [zAt(stop(r.y1)), r.y1], [zAt(stop(r.y0)), r.y0], [zAt(start(r.y0)), r.y0]], r.color, 0.009);
    });
    // Grey slanted band, constant width, from the roof edge down to the rear corner; lighter on the
    // body, darker over the glass.
    const gW = 1.2;
    const gy0 = Y0 + 0.15;
    const gy1 = H - 0.06;
    const gLean = 1.0;
    const gd = (y: number) => L - 0.15 - gW - (y - gy0) * gLean; // leading edge at height y
    const gSlice = (ya: number, yb: number, color: string, lift: number) => {
      const za = (y: number, e: number) => zAt(Math.min(gd(y) + e, L - 0.12));
      decal(both, [[za(yb, 0), yb], [za(yb, gW), yb], [za(ya, gW), ya], [za(ya, 0), ya]], color, lift);
    };
    // (k.side panels are 2 cm boxes, so their faces sit at lift + 0.01: glass 0.021, grille slats 0.022.)
    gSlice(gy0, gy1, liv.grey, 0.023); // over the grille too, as the lettering is
    // Over the window band it reads as grey-on-glass, clipped where the band ends.
    const dBand = ZF - BAND_R;
    const wy0 = BELT - 0.05;
    const wy1 = HEAD + 0.05;
    const lead = (y: number) => gd(y);
    const trail = (y: number) => Math.min(gd(y) + gW, dBand);
    const yc = gy0 + (L - 0.15 - dBand) / gLean; // trailing edge meets the band's end
    const glassSlice = (ya: number, yb: number) =>
      decal(both, [[zAt(lead(yb)), yb], [zAt(trail(yb)), yb], [zAt(trail(ya)), ya], [zAt(lead(ya)), ya]], liv.greyOnGlass, 0.025);
    if (yc > wy0 && yc < wy1) {
      glassSlice(wy0, yc);
      glassSlice(yc, wy1);
    } else glassSlice(wy0, wy1);
  }
  // Engine-bay grille low on the rear quarter of each side.
  k.side(both, ZR + 0.2, ZR + 1.5, 0.48, 1.08, '#6a6f75', 0, 0.01);
  for (let y = 0.52; y < 1.05; y += 0.06) k.side(both, ZR + 0.23, ZR + 1.47, y, y + 0.025, '#3c4046', 0, 0.012);

  // Doors: glazed leaves in a dark frame, nearly full height from the low floor.
  for (const [z0, z1] of [DOOR_R, DOOR_F]) {
    k.side([-1], z0 - 0.04, z1 + 0.04, Y0 + 0.08, HEAD + 0.12, C.frame, 0, 0.009);
    const mid = (z0 + z1) / 2;
    k.side([-1], z0 + 0.05, mid - 0.03, Y0 + 0.4, HEAD + 0.02, C.glass, passengerGlass, 0.013);
    k.side([-1], mid + 0.03, z1 - 0.05, Y0 + 0.4, HEAD + 0.02, C.glass, passengerGlass, 0.013);
  }

  // ---- front: big curved windscreen, sign, swept headlights, bumper, mirrors -----------------
  const fz = (y: number) => (y < 1.12 ? ZF : ZF - ((y - 1.12) / (2.75 - 1.12)) * 0.07); // front face at height y
  const windscreen = (inset: number, lift: number, color: string, kind: number) => {
    const N = 10;
    const ya = 1.2 + inset;
    const yb = 2.66 - inset;
    // Slight wrap: the outer columns curve back toward the sides.
    const wrap = (x: number) => 0 * x; // flat: the body's rounded corners already give the wrap
    const P = (x: number, y: number) => [x, y, fz(y) + lift + wrap(x)];
    for (let i = 0; i < N; i++) {
      const xa = -W / 2 + 0.16 + inset + ((W - 0.32 - 2 * inset) * i) / N;
      const xb = -W / 2 + 0.16 + inset + ((W - 0.32 - 2 * inset) * (i + 1)) / N;
      k.geo(quad(P(xa, ya), P(xb, ya), P(xb, yb), P(xa, yb)), color, kind);
    }
  };
  windscreen(-0.06, 0.02, C.frame, 0);
  windscreen(0, 0.03, C.glass, liv.rapid ? 0 : 3);
  // Destination sign band above the windscreen.
  k.box(W - 0.42, 0.24, 0.03, 0, 2.86, fz(2.86) + 0.012, C.frame);
  k.box(W - 0.62, 0.15, 0.03, 0, 2.86, fz(2.86) + 0.02, '#ffb84a', 7);
  // Headlights: swept lenses at the lower corners, angled up toward the sides.
  for (const s of both) {
    k.box(0.5, 0.14, 0.04, s * 0.88, 0.86, ZF + 0.012, C.frame, 0, new THREE.Euler(0, 0, s * 0.18));
    k.box(0.42, 0.09, 0.04, s * 0.88, 0.86, ZF + 0.022, '#ffffff', 1, new THREE.Euler(0, 0, s * 0.18));
  }
  // A soft "smile" crease across the lower front.
  k.box(1.1, 0.04, 0.02, 0, 0.66, ZF + 0.008, C.grille);
  // Bumper (12.5 m over bumpers → 0.13 m proud of the body).
  k.box(W - 0.1, 0.3, 0.16, 0, Y0 + 0.16, ZF + 0.06, C.bumper);
  // Folded bike rack.
  k.box(1.5, 0.05, 0.45, 0, Y0 + 0.36, ZF + 0.32, C.frame);
  // Mirrors on arms reaching forward from the top corners.
  for (const s of both) {
    k.box(0.05, 0.05, 0.55, s * (W / 2 - 0.05), H - 0.12, ZF + 0.12, C.mirror, 0, new THREE.Euler(0.5, 0, 0));
    k.box(0.12, 0.42, 0.18, s * (W / 2 - 0.02), H - 0.6, ZF + 0.42, C.mirror);
  }

  // ---- roof: CNG enclosure (front two-thirds) and the sculpted rear engine cap ---------------
  const roofColor = liv.rapid ? liv.body : C.roofCap;
  k.geo(xcelsiorRoofFairing(AXLE_R + .9, ZF - 1, H), roofColor);
  const cap = new THREE.Shape();
  cap.moveTo(ZR + 0.25, H - 0.01);
  cap.lineTo(AXLE_R + 0.2, H - 0.01);
  cap.quadraticCurveTo(AXLE_R - 0.2, H + 0.26, AXLE_R - 0.8, H + 0.26);
  cap.lineTo(ZR + 0.5, H + 0.26);
  cap.quadraticCurveTo(ZR + 0.25, H + 0.24, ZR + 0.25, H - 0.01);
  k.geo(roofExtrusion(cap, W - .4, false), roofColor);

  // ---- rear: engine door, tail lights, route sign, bumper ------------------------------------
  k.box(W - 0.6, 0.9, 0.02, 0, 1.05, ZR - 0.006, C.grille);
  for (let i = 0; i < 5; i++) k.box(W - 0.8, 0.03, 0.02, 0, 0.75 + i * 0.15, ZR - 0.012, '#4a4e55');
  for (const s of both) {
    k.box(0.16, 0.62, 0.03, s * (W / 2 - 0.16), 1.05, ZR - 0.01, '#ffffff', 2);
    k.box(0.16, 0.12, 0.03, s * (W / 2 - 0.16), 1.45, ZR - 0.01, '#f2a230', 0);
  }
  k.box(W - 0.8, 0.22, 0.03, 0, 2.5, ZR - 0.01, C.frame);
  k.box(W - 1.0, 0.13, 0.03, 0, 2.5, ZR - 0.018, '#ffb84a', 7);
  k.box(W - 0.1, 0.26, 0.14, 0, Y0 + 0.14, ZR - 0.06, C.bumper);

  // ---- wheels: round tyres with rims; duals at the rear --------------------------------------
  // Tyres: an open tread band with ring sidewalls, so the dished rim can sit inside it.
  const tyre = (x: number, z: number, width: number) => {
    const t = new THREE.CylinderGeometry(TYRE_R, TYRE_R, width, 32, 1, true).rotateZ(Math.PI / 2);
    t.translate(x, TYRE_R, z);
    k.geo(t, C.tyre);
    for (const f of [-1, 1]) {
      const wall = new THREE.RingGeometry(0.29, TYRE_R, 32, 1).rotateY(Math.PI / 2);
      wall.translate(x + (f * width) / 2, TYRE_R, z);
      k.geo(wall, C.tyre);
    }
    const back = new THREE.CircleGeometry(0.3, 24).rotateY(Math.PI / 2); // closes the wheel's middle
    back.translate(x, TYRE_R, z);
    k.geo(back, C.well);
  };
  // Steel disc wheels: a grey dished face, a lighter lip, a dark hub centre with lug ring.
  const disc = (r: number, w: number, x: number, z: number, color: string, seg = 28) => {
    const g = new THREE.CylinderGeometry(r, r, w, seg).rotateZ(Math.PI / 2);
    g.translate(x, TYRE_R, z);
    k.geo(g, color);
  };
  for (const s of both) {
    const xo = s * (W / 2 - 0.2); // outer tyre centre; its face is at xo + s*0.15
    tyre(xo, AXLE_F, 0.3);
    tyre(xo, AXLE_R, 0.3);
    tyre(s * (W / 2 - 0.52), AXLE_R, 0.3); // inner dual
    for (const z of [AXLE_F, AXLE_R]) {
      const face = xo + s * 0.15;
      const lip = new THREE.RingGeometry(0.245, 0.3, 28, 1).rotateY(Math.PI / 2); // bright rim lip
      lip.translate(face - s * 0.002, TYRE_R, z);
      k.geo(lip, C.rimLip);
      disc(0.25, 0.02, face - s * 0.035, z, C.rim); // dished steel face, set back
      disc(0.15, 0.03, face - s * 0.025, z, C.hubRing, 20); // lug-nut ring
      disc(0.1, 0.04, face - s * 0.01, z, C.hub, 16); // dark hub centre
    }
  }
  return k.geometry();
}

function quad(a: number[], b: number[], c: number[], d: number[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
  return g;
}

/** Material: lights glow by `night`; headlights always on, tail lights red. */
export function busMaterial(night: { value: number }) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = night;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aKind;\nvarying float vKind;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvKind = aKind;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uNight;\nvarying float vKind;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        if (vKind > 1.5 && vKind < 2.5) diffuseColor.rgb = vec3(0.9, 0.08, 0.06);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float glow = 0.3 + 1.5 * uNight;
        if (vKind > 0.5 && vKind < 2.5) totalEmissiveRadiance += diffuseColor.rgb * glow;
        if (vKind > 2.5 && vKind < 3.5) totalEmissiveRadiance += vec3(1.0, 0.93, 0.78) * uNight * 0.6;
        if (vKind > 3.5 && vKind < 4.5) totalEmissiveRadiance += vec3(0.84, 0.92, 1.0) * uNight * 0.4;
        if (vKind > 6.5) totalEmissiveRadiance += diffuseColor.rgb * (0.5 + uNight);`,
      );
  };
  m.customProgramCacheKey = () => 'xcelsior';
  return m;
}
