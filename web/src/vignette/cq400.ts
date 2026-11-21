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
  coupler: '#b8392d',
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
 * The cab nose, lofted from the body section at z = zb to the tip at z = zb + LEN.
 * Higher points rake back (windscreen slope) and the sides tuck in (wraparound corners).
 */
const NOSE_LEN = 1.75;
function noseShape(y: number, x: number) {
  const t = Math.min(1, Math.max(0, (y - 1.85) / (ROOF - 1.85))); // 0 below the windscreen → 1 at roof
  const rake = 0.05 + t * 0.35 + t * t * 1.15 + (y < 1.05 ? (1.05 - y) * 0.4 : 0); // anticlimber tucks under too
  const ax = Math.abs(x) / (W / 2);
  const tuck = 1 - 0.32 * ax * ax * (0.6 + 0.4 * t); // rounder plan-view corners, more so up top
  return { dz: (NOSE_LEN - rake) * tuck, sx: 0.97 - 0.05 * t };
}

function addNose(k: Kit, zb: number, line: string) {
  const ring = SECTION.map(([x, y]) => {
    const { dz, sx } = noseShape(y, x);
    return [x * sx, y, zb + dz];
  });
  // Loft: body end → nose ring. This is the grey shell that wraps round the cab corners.
  for (let i = 0; i < SECTION.length; i++) {
    const j = (i + 1) % SECTION.length;
    const a = [SECTION[i][0], SECTION[i][1], zb];
    const b = [SECTION[j][0], SECTION[j][1], zb];
    k.quad(a, b, ring[j], ring[i], C.body, 0);
  }
  // The front face: one dark mask from the bumpers to the roof curve.
  const poly = clipY(SECTION, FLOOR - 0.25, ROOF + 0.01);
  const v2 = poly.map(([x, y]) => new THREE.Vector2(x, y));
  const at = (p: [number, number], lift = 0) => {
    const { dz, sx } = noseShape(p[1], p[0]);
    return [p[0] * sx, p[1], zb + dz + lift];
  };
  for (const t of THREE.ShapeUtils.triangulateShape(v2, [])) k.tri(at(poly[t[0]]), at(poly[t[1]]), at(poly[t[2]]), C.mask, 0);

  /** A flush panel on the raked, rounded front between x0..x1, y0..y1 (follows the surface). */
  const face = (x0: number, x1: number, y0: number, y1: number, color: string, kind: number, lift = 0.012, nx = 6, ny = 3) => {
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < ny; j++) {
        const xa = x0 + ((x1 - x0) * i) / nx;
        const xb = x0 + ((x1 - x0) * (i + 1)) / nx;
        const ya = y0 + ((y1 - y0) * j) / ny;
        const yb = y0 + ((y1 - y0) * (j + 1)) / ny;
        k.quad(at([xa, ya], lift), at([xb, ya], lift), at([xb, yb], lift), at([xa, yb], lift), color, kind);
      }
  };
  // Cab side windows, just behind the nose on each side.
  for (const s2 of [-1, 1]) {
    k.box(0.03, 1.12, 1.15, s2 * (W / 2 + 0.006), 2.62, zb - 0.85, C.frame, 0);
    k.box(0.04, 1.0, 1.02, s2 * (W / 2 + 0.01), 2.62, zb - 0.85, C.glass, 3);
  }
  // Windows: the driver's wide pane on the left, the end door (offset right) with its own window.
  // Glass reads a touch lighter and bluer than the mask, with a thin frame, as in photos.
  face(-1.4, 0.2, 2.02, 3.2, C.seam, 0, 0.008);
  face(0.32, 1.34, 2.02, 3.2, C.seam, 0, 0.008);
  face(-1.36, 0.16, 2.06, 3.16, C.frontGlass, 3, 0.014);
  face(0.36, 1.3, 2.06, 3.16, C.frontGlass, 3, 0.014);
  // (The end door's seams are left out at diorama scale; the two panes and the light carry it.)
  // Destination display across the top of the mask.
  face(-1.15, 1.15, 3.3, 3.5, '#ffb84a', 7, 0.015, 8, 1);
  // Line-colour light: down both outer edges of the mask, then in under the windows.
  for (const s of [-1, 1]) {
    const xo = s * (W / 2 - 0.13);
    face(Math.min(xo, xo - s * 0.08), Math.max(xo, xo - s * 0.08), 1.86, 3.5, line, 5, 0.018, 1, 10);
  }
  // Under the driver's pane (long, dipping slightly toward the centre) and under the door window.
  for (let i = 0; i < 6; i++) {
    const xa = -1.45 + (i * 1.5) / 6;
    const xb = -1.45 + ((i + 1) * 1.5) / 6;
    const ya = 1.94 - (i / 6) * 0.06;
    const yb = 1.94 - ((i + 1) / 6) * 0.06;
    k.quad(at([xa, ya - 0.04], 0.018), at([xb, yb - 0.04], 0.018), at([xb, yb + 0.04], 0.018), at([xa, ya + 0.04], 0.018), line, 5);
  }
  face(0.42, 1.18, 1.86, 1.94, line, 5, 0.018, 4, 1);
  // Light clusters at the lower outer corners: white when leading, red at the tail.
  for (const s of [-1, 1]) face(s > 0 ? 1.3 : -1.42, s > 0 ? 1.42 : -1.3, 1.32, 1.8, '#ffffff', 8, 0.02, 1, 3);
  // Lower front: grey bumper blocks wrapping the corners, each with a dark vent; the name panel
  // between them (where the wordmark sits; we show only a lit bar); the coupler below.
  const zf = (y: number) => zb + noseShape(y, 0).dz;
  for (const s of [-1, 1]) {
    const cx = s * 1.18;
    // Flush-ish: the grey wraps the corner and stands only a little proud of the mask.
    k.box(0.9, 0.5, 0.3, cx, FLOOR - 0.12, zf(FLOOR) - 0.13, C.body, 0);
    k.box(0.48, 0.24, 0.04, cx, FLOOR - 0.12, zf(FLOOR) + 0.03, C.vent, 0);
    for (let v = 0; v < 4; v++) k.box(0.48, 0.022, 0.045, cx, FLOOR - 0.21 + v * 0.06, zf(FLOOR) + 0.04, C.mask, 0);
  }
  k.box(1.25, 0.42, 0.3, 0, FLOOR - 0.1, zf(FLOOR) - 0.14, C.mask, 0);
  k.box(0.78, 0.14, 0.04, 0, FLOOR - 0.06, zf(FLOOR) + 0.02, '#ffffff', 6);
  k.box(0.42, 0.3, 0.55, 0, 0.72, zf(FLOOR) + 0.1, C.coupler, 0);
  k.box(0.3, 0.16, 0.3, 0, 0.62, zf(FLOOR) + 0.42, '#8a8f94', 0);
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
  for (const z of [-6.2, 5.0]) {
    k.box(1.9, 0.34, 3.2, 0, ROOF + 0.17, z - (spec.cab ? 0.6 : 0), C.hvac, 0);
    k.box(1.4, 0.04, 2.4, 0, ROOF + 0.36, z - (spec.cab ? 0.6 : 0), '#7d8287', 0);
  }
  // Doors (three pairs a side) with line-colour indicator bars above.
  const doors = spec.cab ? [-7.6, -0.6, 6.0] : [-7.2, 0, 7.2];
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
    const edges = [-h + 0.8, ...doors.flatMap((d) => [d - 1.0, d + 1.0]), noseStart - (spec.cab ? 0.9 : 0.8)];
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
