/**
 * MARTA CQ400 (Stadler, 4-car sets with open gangways), modelled from reference photos.
 *
 * - Matte light-grey body with a softly rounded roof.
 * - Cab car: a raked, rounded nose lofted from the body section, its face one dark mask framed
 *   by the grey sides; a wide driver's pane and an offset end door with its own window; a
 *   destination display across the top; a flush line-colour light down both mask edges that
 *   turns in under the windows; corner light clusters (white leading, red tail); grey bumper
 *   blocks with vents; and a lit bar where the operator's wordmark sits (we show no logos).
 * - Sides: dark windows with rounded corners, three door pairs with line-colour indicator bars,
 *   and the floor-height stripe: a teal/gold/orange chevron at each nose, then a band that runs
 *   blue → gold → orange along the set.
 * - Open gangway bellows between cars of a set; bogies and an equipment skirt below; roof HVAC.
 *
 * Dimensions are estimates (about 75 ft long, 10.5 ft wide); proportions follow photos.
 * Every car faces +z; origin at the centre of the car, top of rail.
 *
 * Per-vertex `aKind` (read by `cq400Material`):
 *   0 fixed colour   1 headlight (lit when leading)   2 tail light (lit at the tail)
 *   3 glass (warm interior glow at night)   5 line-colour LED (always lit)
 *   6 name-bar (white leading, red tail, dark in the middle of a train)   7 destination display
 *   8 corner light cluster (white leading, red tail)
 */
import * as THREE from 'three';

export const CAR_LENGTH = 22.9;
export const CAR_GAP = 0.9; // gangway between cars
const W = 3.2;
const FLOOR = 1.12;
const ROOF = 3.78;

export const LINE_COLORS = { red: '#d1282f', gold: '#e0b129', blue: '#1474c4', green: '#13a44f' } as const;
export type MartaLine = keyof typeof LINE_COLORS;

const C = {
  body: '#c3c7ca', // matte light grey (reads warmer in sun)
  bodyShade: '#b2b6ba',
  roof: '#aeb2b6',
  mask: '#15181d', // the dark front mask
  frontGlass: '#36404d',
  seam: '#2e333b',
  vent: '#121418',
  coupler: '#3a3d42',
  glass: '#1d232b',
  frame: '#2b3038',
  under: '#34373d',
  bogie: '#2a2c31',
  wheel: '#55585e',
  gangway: '#3b3e44',
  hvac: '#a9adb2',
  door: '#bfc3c6',
  teal: '#1fa79b',
  gold: '#efbd2f',
  orange: '#ec8a2b',
  blue: '#2f6fc0',
};

/** Body cross-section (x across, y up), counter-clockwise, top of rail at y = 0. */
const SECTION: [number, number][] = [
  [-W / 2 + 0.12, FLOOR - 0.25],
  [W / 2 - 0.12, FLOOR - 0.25],
  [W / 2, FLOOR + 0.1],
  [W / 2, 3.15],
  [W / 2 - 0.12, 3.45],
  [W / 2 - 0.42, 3.66],
  [W / 2 - 0.9, ROOF],
  [-W / 2 + 0.9, ROOF],
  [-W / 2 + 0.42, 3.66],
  [-W / 2 + 0.12, 3.45],
  [-W / 2, 3.15],
  [-W / 2, FLOOR + 0.1],
];

class Kit {
  pos: number[] = [];
  col: number[] = [];
  kind: number[] = [];
  private c = new THREE.Color();
  tri(a: number[], b: number[], d: number[], color: string, kind: number) {
    this.c.set(color);
    this.pos.push(...a, ...b, ...d);
    for (let i = 0; i < 3; i++) {
      this.col.push(this.c.r, this.c.g, this.c.b);
      this.kind.push(kind);
    }
  }
  quad(a: number[], b: number[], c: number[], d: number[], color: string, kind: number) {
    this.tri(a, b, c, color, kind);
    this.tri(a, c, d, color, kind);
  }
  geo(g: THREE.BufferGeometry, color: string, kind: number, m?: THREE.Matrix4) {
    const gg = g.index ? g.toNonIndexed() : g;
    if (m) gg.applyMatrix4(m);
    const p = gg.attributes.position.array;
    this.c.set(color);
    for (let i = 0; i < p.length; i++) this.pos.push(p[i]);
    for (let i = 0; i < p.length / 3; i++) {
      this.col.push(this.c.r, this.c.g, this.c.b);
      this.kind.push(kind);
    }
  }
  box(w: number, h: number, l: number, x: number, y: number, z: number, color: string, kind = 0, m?: THREE.Matrix4) {
    const g = new THREE.BoxGeometry(w, h, l);
    g.translate(x, y, z);
    this.geo(g, color, kind, m);
  }
  /** Extrude the body section along z from z0 to z1. */
  section(z0: number, z1: number, color: string) {
    const sh = new THREE.Shape(SECTION.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: z1 - z0, bevelEnabled: false });
    g.translate(0, 0, z0);
    this.geo(g, color, 0);
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

/**
 * The cab nose as one continuous surface: z = zb + F(x, y) over the body section. It is rounded
 * in plan (the corners sweep back), nearly upright below the windscreen and raked toward the
 * roof. The dark mask, the windscreen, the lights and the grey corner wraps all lie on this one
 * surface, so nothing floats or sticks out. Simplified for diorama scale: one shield-shaped
 * windscreen (no end door) and one continuous line-colour chevron.
 */
const NOSE_LEN = 2.1;
const CAB_WIN_BACK = 1.35; // cab side window centre, measured back from where the nose starts
const Y_BOT = FLOOR - 0.25;

/** Half-width of the body section at height y. */
function halfWidth(y: number) {
  const right = SECTION.filter(([x]) => x > 0).sort((p, q) => p[1] - q[1]);
  if (y <= right[0][1]) return right[0][0];
  for (let i = 1; i < right.length; i++) {
    const [x0, y0] = right[i - 1];
    const [x1, y1] = right[i];
    if (y <= y1) return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0 || 1);
  }
  return right[right.length - 1][0];
}

function noseDepth(x: number, y: number) {
  const ax = Math.min(1, Math.abs(x) / (W / 2));
  const t = Math.min(1, Math.max(0, (y - 1.5) / (ROOF - 1.5)));
  // Profile photos: upright up to the light line, then a straight rake back to the roof,
  // with only a small round-over where it meets the roof.
  const rake = 0.1 + (NOSE_LEN - 0.3) * t + 0.15 * Math.pow(t, 6);
  const plan = 1 - 0.12 * Math.pow(ax, 2.0) - 0.18 * Math.pow(ax, 8); // slightly rounded corners
  const chin = y < 1.0 ? (1.0 - y) * 0.6 : 0; // a slight tuck under the bumper line
  return Math.max(0.02, (NOSE_LEN - rake - chin) * plan);
}

/** The chevron light's path on the face: down each mask edge, then in to meet below the screen. */
function chevronPath(): [number, number][] {
  const side: [number, number][] = [];
  for (let y = 3.46; y >= 1.98; y -= 0.08) side.push([W / 2 - 0.18 - (3.46 - y) * 0.02, y]);
  const x0 = side[side.length - 1][0];
  for (let i = 1; i <= 10; i++) {
    const f = i / 10;
    side.push([x0 * (1 - f), 1.98 - 0.16 * f]); // in and slightly down to the centre
  }
  const left = side.map(([x, y]) => [-x, y] as [number, number]).reverse();
  return [...left, ...side.slice(1)];
}

function addNose(k: Kit, zb: number, line: string) {
  const NU = 28;
  const NV = 24;
  const pt = (u: number, v: number) => {
    const y = Y_BOT + (ROOF - Y_BOT) * v;
    const x = u * halfWidth(y);
    return [x, y, zb + noseDepth(x, y)];
  };
  const at = (x: number, y: number, lift = 0) => [x, y, zb + noseDepth(x, y) + lift];
  const region = (x: number, y: number, u: number) => {
    const ax = Math.abs(x);
    if (Math.abs(u) > 0.94) return C.body; // grey wraps round the corners
    if (y < 1.32 && ax > 0.74) {
      // Bumper blocks: grey, part of the same surface, each with a dark vent.
      if (y > 0.97 && y < 1.2 && ax > 0.94 && ax < 1.4) return C.vent;
      return C.body;
    }
    return C.mask;
  };
  // Front surface.
  for (let i = 0; i < NU; i++)
    for (let j = 0; j < NV; j++) {
      const u0 = -1 + (2 * i) / NU;
      const u1 = -1 + (2 * (i + 1)) / NU;
      const a = pt(u0, j / NV);
      const b = pt(u1, j / NV);
      const c = pt(u1, (j + 1) / NV);
      const d = pt(u0, (j + 1) / NV);
      k.quad(a, b, c, d, region((a[0] + b[0] + c[0] + d[0]) / 4, (a[1] + d[1]) / 2, (u0 + u1) / 2), 0);
    }
  // Shell walls: from the body end (z = zb) out to the front surface, all round the outline.
  const wall = (p: number[], q: number[], color: string) => k.quad([p[0], p[1], zb], [q[0], q[1], zb], q, p, color, 0);
  for (let j = 0; j < NV; j++) {
    wall(pt(1, j / NV), pt(1, (j + 1) / NV), C.body);
    wall(pt(-1, (j + 1) / NV), pt(-1, j / NV), C.body);
  }
  for (let i = 0; i < NU; i++) {
    const u0 = -1 + (2 * i) / NU;
    const u1 = -1 + (2 * (i + 1)) / NU;
    wall(pt(u1, 1), pt(u0, 1), C.body);
    wall(pt(u0, 0), pt(u1, 0), C.under);
  }

  /** A flush panel on the front surface between x0..x1, y0..y1. */
  const face = (x0: number, x1: number, y0: number, y1: number, color: string, kind: number, lift = 0.012, nx = 6, ny = 3) => {
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < ny; j++) {
        const xa = x0 + ((x1 - x0) * i) / nx;
        const xb = x0 + ((x1 - x0) * (i + 1)) / nx;
        const ya = y0 + ((y1 - y0) * j) / ny;
        const yb = y0 + ((y1 - y0) * (j + 1)) / ny;
        k.quad(at(xa, ya, lift), at(xb, ya, lift), at(xb, yb, lift), at(xa, yb, lift), color, kind);
      }
  };
  // The nose's grey side panel: a slanted window following the rake, and a seam where the
  // nose meets the body.
  for (const s2 of [-1, 1]) {
    const x = s2 * (W / 2 + 0.012);
    const front = (y: number) => zb + noseDepth(s2 * (W / 2 - 0.02), y) - 0.22;
    const NY = 6;
    for (let j = 0; j < NY; j++) {
      const ya = 2.18 + (0.86 * j) / NY;
      const yb = 2.18 + (0.86 * (j + 1)) / NY;
      for (const [inset, color, kind] of [[0, C.frame, 0], [0.05, C.glass, 3]] as [number, string, number][]) {
        const fa = front(ya) - inset;
        const fb = front(yb) - inset;
        const xx = x + s2 * inset * 0.1;
        k.quad([xx, ya + inset * 0.6, fa - 0.78 + inset * 2], [xx, ya + inset * 0.6, fa], [xx, yb - inset * 0.6, fb], [xx, yb - inset * 0.6, fb - 0.78 + inset * 2], color, kind);
      }
    }
    k.box(0.03, 2.3, 0.035, x, 2.3, zb - 0.02, C.seam, 0);
  }
  // The cab's one side window, centred in the grey section between the nose and first door.
  for (const s2 of [-1, 1]) {
    k.box(0.03, 1.16, 1.2, s2 * (W / 2 + 0.006), 2.6, zb - CAB_WIN_BACK, C.frame, 0);
    k.box(0.04, 1.04, 1.06, s2 * (W / 2 + 0.01), 2.6, zb - CAB_WIN_BACK, C.glass, 3);
  }
  // One shield-shaped windscreen: full width at the top, tapering toward the chevron's point.
  const shield = (lift: number, inset: number, color: string, kind: number) => {
    const NX = 14;
    const NY = 8;
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        const v0 = j / NY;
        const v1 = (j + 1) / NY;
        const P = (u: number, v: number) => {
          const y = 2.12 + inset + (3.18 - inset - (2.12 + inset)) * v;
          const half = (W / 2 - 0.34 - inset) * (0.62 + 0.38 * v);
          // The bottom edge dips toward the centre, echoing the chevron.
          const yy = y - (1 - v) * (1 - Math.abs(u)) * 0.12;
          return at(u * half, yy, lift);
        };
        const u0 = -1 + (2 * i) / NX;
        const u1 = -1 + (2 * (i + 1)) / NX;
        k.quad(P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1), color, kind);
      }
  };
  shield(0.008, -0.04, C.seam, 0);
  shield(0.014, 0, C.frontGlass, 3);
  // Destination display across the top of the mask.
  face(-1.12, 1.12, 3.3, 3.5, '#ffb84a', 7, 0.035, 12, 3);
  // The line-colour chevron: one continuous lit band.
  const path = chevronPath();
  const hw = 0.045;
  for (let i = 1; i < path.length; i++) {
    const [xa, ya] = path[i - 1];
    const [xb, yb] = path[i];
    const dx = xb - xa;
    const dy = yb - ya;
    const l = Math.hypot(dx, dy) || 1;
    const nx = (-dy / l) * hw;
    const ny = (dx / l) * hw;
    k.quad(at(xa - nx, ya - ny, 0.018), at(xb - nx, yb - ny, 0.018), at(xb + nx, yb + ny, 0.018), at(xa + nx, ya + ny, 0.018), line, 5);
  }
  // Light clusters at the lower outer corners: white when leading, red at the tail.
  for (const s2 of [-1, 1]) face(s2 > 0 ? 1.26 : -1.38, s2 > 0 ? 1.38 : -1.26, 1.38, 1.8, '#ffffff', 8, 0.02, 1, 4);
  // Vent slats on the bumpers, and the lit bar where the wordmark sits (no logo).
  for (const s2 of [-1, 1]) for (let v = 0; v < 3; v++) face(s2 > 0 ? 0.96 : -1.38, s2 > 0 ? 1.38 : -0.96, 1.01 + v * 0.06, 1.03 + v * 0.06, C.bodyShade, 0, 0.016, 4, 1);
  face(-0.4, 0.4, 1.02, 1.16, '#ffffff', 6, 0.016, 4, 1);
  // Coupler below the nose (the one part that really does stick out).
  const zf = zb + noseDepth(0, Y_BOT);
  k.box(0.42, 0.3, 0.55, 0, 0.72, zf + 0.05, C.coupler, 0);
  k.box(0.3, 0.16, 0.3, 0, 0.62, zf + 0.37, '#8a8f94', 0);
}

/** Clip a polygon to the horizontal band y0 ≤ y ≤ y1. */
function clipY(poly: [number, number][], y0: number, y1: number): [number, number][] {
  const clip = (pts: [number, number][], keep: (p: [number, number]) => boolean, yy: number) => {
    const out: [number, number][] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if (keep(a)) out.push(a);
      if (keep(a) !== keep(b)) {
        const t = (yy - a[1]) / (b[1] - a[1]);
        out.push([a[0] + (b[0] - a[0]) * t, yy]);
      }
    }
    return out;
  };
  return clip(clip(poly, (p) => p[1] >= y0, y0), (p) => p[1] <= y1, y1);
}

/** Floor-height stripe segment on both sides from z0 to z1. */
function stripe(k: Kit, z0: number, z1: number, color: string) {
  for (const s of [-1, 1]) k.box(0.03, 0.15, z1 - z0, s * (W / 2 + 0.01), 1.36, (z0 + z1) / 2, color, 0);
}

/** The short blue/yellow/orange chevrons on the rounded cab end, leading into the long stripe. */
function chevron(k: Kit, zStart: number, dir: 1 | -1) {
  const cols = [C.blue, C.gold, C.orange]; // from the nose: blue, yellow, orange
  for (let i = 0; i < 3; i++) {
    for (const s of [-1, 1]) {
      const zc = zStart - dir * (0.25 + i * 0.36);
      // A parallelogram: skew the box so its ends slant like the real chevron.
      const g = new THREE.BoxGeometry(0.03, 0.15, 0.34);
      const skew = new THREE.Matrix4().set(1, 0, 0, 0, 0, 1, 0, 0, 0, dir * 0.9, 1, 0, 0, 0, 0, 1);
      g.applyMatrix4(skew);
      g.translate(s * (W / 2 + 0.012), 1.36, zc);
      k.geo(g, cols[i], 0);
    }
  }
}

export interface CarSpec {
  cab: boolean; // a driving end at +z
  /** Position of this car's middle in the set (0 front … 1 rear), for the stripe colours. */
  u0: number;
  u1: number;
}

/**
 * Stripe colour along the set. Photos show blue behind each nose shading to gold and orange
 * further back; we make the set symmetric (blue at both ends, orange in the middle) because
 * either end can lead.
 */
function stripeColor(u: number) {
  const d = Math.min(u, 1 - u) * 2; // 0 at the set's ends, 1 in the middle
  return d < 0.55 ? C.blue : d < 0.8 ? C.gold : C.orange;
}

export function cq400Geometry(spec: CarSpec, line: string) {
  const k = new Kit();
  const L = CAR_LENGTH;
  const h = L / 2;
  const noseStart = spec.cab ? h - NOSE_LEN : h;
  k.section(-h, noseStart, C.body);
  if (spec.cab) addNose(k, noseStart, line);
  // Gangway bellows: full-height at the non-cab end(s), so a set reads as one walk-through train.
  k.box(W - 0.35, 2.6, CAR_GAP / 2 + 0.05, 0, 2.3, -h - CAR_GAP / 4, C.gangway, 0);
  if (!spec.cab) k.box(W - 0.35, 2.6, CAR_GAP / 2 + 0.05, 0, 2.3, h + CAR_GAP / 4, C.gangway, 0);
  // Roof: a darker cap strip and two HVAC pods.
  k.box(W - 1.9, 0.04, noseStart + h - 1.2, 0, ROOF + 0.01, (noseStart - h) / 2, C.roof, 0);
  // Roof equipment sits under smooth, low fairings: only slight bumps show.
  for (const z of [-6.2, 4.6]) {
    k.box(1.7, 0.09, 3.4, 0, ROOF + 0.045, z - (spec.cab ? 0.6 : 0), C.roof, 0);
    k.box(1.3, 0.05, 2.8, 0, ROOF + 0.11, z - (spec.cab ? 0.6 : 0), C.roof, 0);
  }
  // Doors (three pairs a side) with line-colour indicator bars above.
  const doors = spec.cab ? [-8.4, -1.6, 5.2] : [-7.2, 0, 7.2];
  for (const s of [-1, 1]) {
    const x = s * (W / 2 + 0.006);
    for (const dz of doors) {
      k.box(0.03, 2.05, 1.62, x, FLOOR + 1.05, dz, C.door, 0);
      k.box(0.035, 1.0, 0.36, x, 2.55, dz - 0.4, C.glass, 3);
      k.box(0.035, 1.0, 0.36, x, 2.55, dz + 0.4, C.glass, 3);
      k.box(0.04, 2.05, 0.04, x, FLOOR + 1.05, dz, C.frame, 0); // centre seam
      k.box(0.04, 0.06, 1.05, s * (W / 2 + 0.02), 3.24, dz, line, 5); // indicator bar
    }
    // Windows: dark, with a frame, in the bays between doors (3 per bay, fewer at the ends).
    // On a cab car the bay between the last door and the nose is plain grey with only the
    // cab's own side window (drawn with the nose), so it gets no passenger windows.
    const edges = [-h + 0.8, ...doors.flatMap((d) => [d - 1.0, d + 1.0]), noseStart - (spec.cab ? 0.9 : 0.8)];
    if (spec.cab) edges.splice(edges.length - 2, 2);
    for (let b = 0; b < edges.length; b += 2) {
      const z0 = edges[b];
      const z1 = edges[b + 1];
      const span = z1 - z0;
      if (span < 1.2) continue;
      const n = span > 4.5 ? 3 : span > 2.6 ? 2 : 1;
      const wl = Math.min(1.25, (span - 0.4 * (n + 1)) / n);
      const gap = (span - n * wl) / (n + 1);
      for (let i = 0; i < n; i++) {
        const zc = z0 + gap + wl / 2 + i * (wl + gap);
        k.box(0.03, 1.06, wl + 0.1, x, 2.56, zc, C.frame, 0);
        k.box(0.04, 0.94, wl, x + s * 0.004, 2.56, zc, C.glass, 3);
      }
    }
  }
  // Stripe: chevron behind the nose, then the colour band along the car.
  const zA = -h + 0.2;
  const zB = spec.cab ? noseStart - 1.4 : h - 0.2;
  if (spec.cab) chevron(k, noseStart - 0.1, 1);
  const segs = 6;
  for (let i = 0; i < segs; i++) {
    const a = zA + ((zB - zA) * i) / segs;
    const b = zA + ((zB - zA) * (i + 1)) / segs;
    const u = spec.u1 + (spec.u0 - spec.u1) * ((i + 0.5) / segs); // +z is toward the front of the set
    stripe(k, a, b, stripeColor(u));
  }
  // Underframe skirt, equipment and bogies.
  k.box(W - 0.4, 0.5, L - 5.5, 0, FLOOR - 0.45, -0.4, C.under, 0);
  const wheel = new THREE.CylinderGeometry(0.42, 0.42, 0.13, 12).rotateZ(Math.PI / 2);
  for (const bz of [-7.75, 7.0]) {
    k.box(2.1, 0.32, 2.5, 0, 0.8, bz, C.bogie, 0);
    for (const s of [-1, 1]) {
      k.box(0.16, 0.38, 2.75, s * 1.0, 0.55, bz, C.bogie, 0);
      for (const wz of [-1.05, 1.05]) {
        const g = wheel.clone();
        g.translate(s * 0.74, 0.42, bz + wz);
        k.geo(g, C.wheel, 0);
      }
    }
  }
  return k.geometry();
}

/**
 * Material for one car. `role`: 1 = the leading cab end (white lights and name bar),
 * −1 = the tail end (red), 0 = no lit end (middle cars, or cabs coupled inside a train).
 */
export function cq400Material(line: string, role: { value: number }, night: { value: number }, clip?: THREE.Plane[]) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, clippingPlanes: clip ?? null });
  const lineCol = { value: new THREE.Color(line) };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uRole: role, uNight: night, uLine: lineCol });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aKind;\nvarying float vKind;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvKind = aKind;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uRole;\nuniform float uNight;\nuniform vec3 uLine;\nvarying float vKind;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float lead = step(0.5, uRole);
        float tail = step(0.5, -uRole);
        if (vKind > 0.5 && vKind < 1.5) diffuseColor.rgb = mix(vec3(0.35), vec3(1.0, 0.97, 0.88), lead);
        else if (vKind > 1.5 && vKind < 2.5) diffuseColor.rgb = mix(vec3(0.25, 0.08, 0.08), vec3(1.0, 0.12, 0.1), tail);
        else if (vKind > 4.5 && vKind < 5.5) diffuseColor.rgb = uLine;
        else if (vKind > 5.5 && vKind < 6.5) diffuseColor.rgb = lead > 0.5 ? vec3(1.0) : tail > 0.5 ? vec3(1.0, 0.1, 0.08) : vec3(0.18);
        else if (vKind > 7.5) diffuseColor.rgb = lead > 0.5 ? vec3(1.0, 0.97, 0.9) : tail > 0.5 ? vec3(1.0, 0.1, 0.08) : vec3(0.22);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float glow = 0.35 + 1.5 * uNight;
        if (vKind > 0.5 && vKind < 1.5) totalEmissiveRadiance += diffuseColor.rgb * lead * glow;
        if (vKind > 1.5 && vKind < 2.5) totalEmissiveRadiance += diffuseColor.rgb * tail * glow;
        if (vKind > 2.5 && vKind < 3.5) totalEmissiveRadiance += vec3(1.0, 0.93, 0.78) * uNight * 0.7;
        if (vKind > 4.5 && vKind < 5.5) totalEmissiveRadiance += uLine * (0.8 + 1.4 * uNight);
        if (vKind > 5.5 && vKind < 6.5) totalEmissiveRadiance += diffuseColor.rgb * max(lead, tail) * glow;
        if (vKind > 6.5 && vKind < 7.5) totalEmissiveRadiance += diffuseColor.rgb * step(0.5, abs(uRole)) * (0.5 + uNight);
        if (vKind > 7.5) totalEmissiveRadiance += diffuseColor.rgb * max(lead, tail) * glow;`,
      );
  };
  m.customProgramCacheKey = () => 'cq400';
  return m;
}

/** The cars of a train: 4-car sets [cab, mid, mid, cab-reversed]; `sets` = 1 (4 cars) or 2 (8). */
export function cq400Consist(sets: 1 | 2) {
  const cars: { spec: CarSpec; flip: boolean; litEnd: boolean }[] = [];
  for (let sI = 0; sI < sets; sI++) {
    const first = sI === 0;
    const last = sI === sets - 1;
    cars.push({ spec: { cab: true, u0: 0, u1: 0.25 }, flip: false, litEnd: first });
    cars.push({ spec: { cab: false, u0: 0.25, u1: 0.5 }, flip: false, litEnd: false });
    cars.push({ spec: { cab: false, u0: 0.5, u1: 0.75 }, flip: false, litEnd: false });
    // The rear cab is the same car turned around: its stripe runs the other way along the set.
    cars.push({ spec: { cab: true, u0: 0, u1: 0.25 }, flip: true, litEnd: last });
  }
  return cars;
}
