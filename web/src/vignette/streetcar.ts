/**
 * Atlanta Streetcar: Siemens S70, cars 1001–1004. Lab model, modelled from the Siemens Atlanta S70
 * data sheet and dated Atlanta photographs (docs/atlanta-streetcar.md). Generic look-alike: the
 * colours and sweeps are real, the wordmark and emblem are left off.
 *
 * Three steel body sections on six axles: a long end section with a cab at each end and a short
 * centre section carrying the pantograph. Bidirectional, so both ends are cabs. Origin at the car
 * centre on top of rail, +z toward cab A.
 */
import * as THREE from 'three';
import { Builder, loft } from './geom';
import { finishStockGeometry, passengerMaterial } from './crescent-stock';

/** Siemens data sheet: 24,110 mm over anticlimbers, 2,650 mm wide, 3,840 mm with the pantograph down. */
export const S70_LENGTH = 24.11;
export const S70_WIDTH = 2.65;
export const S70_HEIGHT = 3.84;
/** Raised pantograph head in the lab (estimate; the data sheet allows up to 7.01 m). */
export const PANTOGRAPH = 5.6;
/** Low-floor threshold above the rail. */
export const S70_FLOOR = 0.356;
/** Section lengths scaled from the data-sheet side drawing (estimates); two 0.3 m articulations. */
export const S70_SECTIONS = { end: 9.6, centre: 4.31, joint: 0.3 } as const;

const JOINT = S70_SECTIONS.centre / 2 + S70_SECTIONS.joint / 2; // 2.305 m, mid-bellows

/**
 * Car-frame layout for City, in car z (car centre at 0, +z toward cab A). Sections meet at the
 * joints, mid-bellows, and each bellows is split between its two neighbours.
 *
 * Kinematics, as on the real car: the centre section C rides on its own truck. Put both of its
 * `pivots` (the centre-truck axles) on the track and point local +z along their chord. Each end
 * section hangs from C at its joint and rides on its power truck. Take `pivots[0]` from C's placed
 * transform, put `pivots[1]` on the track, and aim along the line between them.
 */
export const S70_LAYOUT = {
  sections: {
    B: { from: -(S70_LENGTH / 2), to: -JOINT, pivots: [-JOINT, -8.2], hangsFrom: 'C' },
    C: { from: -JOINT, to: JOINT, pivots: [-0.9, 0.9], hangsFrom: null },
    A: { from: JOINT, to: S70_LENGTH / 2, pivots: [JOINT, 8.2], hangsFrom: 'C' },
  },
  joints: [-JOINT, JOINT],
  trucks: [
    { z: -8.2, wheelbase: 1.9, powered: true },
    { z: 0, wheelbase: 1.8, powered: false },
    { z: 8.2, wheelbase: 1.9, powered: true },
  ],
} as const;
export type S70SectionId = keyof typeof S70_LAYOUT.sections;
export const s70Material = passengerMaterial;

const W = S70_WIDTH / 2;
const ROOF = 3.45;
const BASE = 0.14; // skirt bottom, close to the rail
const WIN_LO = 1.35,
  WIN_HI = 2.75; // the glazing band
const C = {
  // Deep indigo leaning violet, sampled from car 1004 (Mar 2020); Sam preferred it to the brighter
  // daylight match. The grade darkens dark blues, so the input is lighter: it renders near #28217b.
  body: '#5a5694',
  violet: '#6c34bc',
  teal: '#1aa6bf',
  lime: '#86c23a',
  white: '#e9ecea',
  glass: '#6d8194', // reflective, reads lighter than the body as in the photos
  frame: '#101219',
  skirt: '#48447f',
  bellows: '#1c1d22',
  pod: '#5d5996',
  dark: '#15181d',
  wheel: '#3e4246',
  amber: '#ffb347',
};

/** Cross-section with rounded eaves: bottom, skirt chamfer, flat side, a quarter-round eave and roof. */
function ring(z: number, top = ROOF, w = W, base = BASE) {
  const r = Math.min(0.42, (top - base) * 0.3);
  const arc = [0, 30, 60, 90].map((a) => [w - r + r * Math.cos((a * Math.PI) / 180), top - r + r * Math.sin((a * Math.PI) / 180)]);
  return [
    [-w + 0.1, base, z],
    [w - 0.1, base, z],
    [w, base + 0.1, z],
    ...arc.map(([x, y]) => [x, y, z]),
    ...arc.reverse().map(([x, y]) => [-x, y, z]),
    [-w, base + 0.1, z],
  ];
}
/** Panel colours for ring(): skirt underneath, body everywhere else, `roof` on the crown. */
const panels = (side: string, roof = side) => [C.skirt, C.skirt, side, side, side, side, roof, side, side, side, side, C.skirt];
/** Surface x of the full body section at height y (follows the rounded eave). */
function surfaceX(y: number, top = ROOF, w = W) {
  const r = Math.min(0.42, (top - BASE) * 0.3);
  if (y <= top - r) return w;
  const s = Math.min(1, (y - (top - r)) / r);
  return w - r + r * Math.cos(Math.asin(s));
}

/** The whole car, rigid, in the car frame (lab use). */
export function s70Geometry({ leadingA = true, leadingB = false } = {}) {
  const b = new Builder(),
    windows = new Builder(),
    lamps = new Builder();
  const { centre, joint } = S70_SECTIONS;
  const half = S70_LENGTH / 2;
  const flat = half - 1.3; // the full section ends here; the nose narrows beyond it

  // Bodies: the centre section, then each end section with its sloped, rounded nose.
  loft(b, [ring(-centre / 2), ring(centre / 2)], panels(C.body), true, true, C.bellows);
  for (const sign of [-1, 1]) {
    const at = (d: number) => sign * d;
    const keys = [
      { ring: ring(at(centre / 2 + joint)), next: panels(C.body) },
      { ring: ring(at(flat)), next: panels(C.body) },
      { ring: ring(at(half - 0.75), 3.3, W - 0.05), next: panels(C.body, C.dark) }, // big raked windscreen
      { ring: ring(at(half - 0.2), 1.5, W - 0.14, 0.18), next: panels(C.body) }, // rounded lower nose
      { ring: ring(at(half), 1.22, W - 0.32, 0.22), next: [] as string[] },
    ];
    for (let i = 0; i < keys.length - 1; i++) {
      const [r0, r1] = sign > 0 ? [keys[i].ring, keys[i + 1].ring] : [keys[i + 1].ring, keys[i].ring];
      const first = i === 0,
        last = i === keys.length - 2;
      const capRear = sign > 0 ? first : last,
        capFront = sign > 0 ? last : first;
      loft(b, [r0, r1], keys[i].next, capRear, capFront, (sign > 0) === capRear ? C.bellows : C.body);
    }
  }
  // Dark bellows, split at each joint so a bend folds them from the middle.
  for (const sign of [-1, 1])
    for (const [z0, z1] of [[centre / 2, JOINT - 0.004], [JOINT + 0.004, centre / 2 + joint]])
      b.box(S70_WIDTH - 0.24, ROOF - 0.45, z1 - z0, 0, (ROOF + 0.25) / 2, sign * (z0 + z1) / 2, C.bellows);

  /** Polygon on both body sides from [z, y] points, following the eave curve, `eps` proud. */
  const skin = (builder: Builder, pts: [number, number][], color: string, eps: number) => {
    for (const s of [-1, 1]) {
      const v = pts.map(([z, y]) => [s * (surfaceX(y) + eps), y, z]);
      let area = 0;
      for (let i = 0; i < v.length; i++) area += v[i][2] * v[(i + 1) % v.length][1] - v[(i + 1) % v.length][2] * v[i][1];
      if ((s > 0) === area > 0) v.reverse();
      for (let i = 1; i < v.length - 1; i++) builder.tri(v[0], v[i], v[i + 1], color);
    }
  };
  const rect = (builder: Builder, z0: number, z1: number, y0: number, y1: number, color: string, eps: number) =>
    skin(builder, [[z0, y0], [z1, y0], [z1, y1], [z0, y1]], color, eps);

  /**
   * A sweep: a band whose centre follows a cubic Bézier through `p` ([d, y], d from the car centre
   * toward this cab) and whose width runs from w0 to w1. Sampled finely so it reads as one smooth curve.
   */
  /** Clip a polygon in (d, y) to lo <= y <= hi (Sutherland–Hodgman against two horizontal lines). */
  const clipY = (poly: [number, number][], lo: number, hi: number) => {
    const cut = (pts: [number, number][], keep: (y: number) => boolean, at: number) => {
      const out: [number, number][] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i],
          c = pts[(i + 1) % pts.length];
        const ka = keep(a[1]),
          kc = keep(c[1]);
        if (ka) out.push(a);
        if (ka !== kc) {
          const t = (at - a[1]) / (c[1] - a[1]);
          out.push([a[0] + (c[0] - a[0]) * t, at]);
        }
      }
      return out;
    };
    return cut(cut(poly, (y) => y >= lo, lo), (y) => y <= hi, hi);
  };
  const sweep = (sign: number, p: [number, number][], w0: number, w1: number, color: string, eps: number, wMid = (w0 + w1) / 2, shift = 0, yMax = ROOF - 0.04) => {
    const n = 24;
    const at = (t: number) => {
      const u = 1 - t;
      const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
      return [0, 1].map((i) => k.reduce((acc, c, j) => acc + c * p[j][i], 0)) as [number, number];
    };
    const width = (t: number) => (t < 0.5 ? w0 + (wMid - w0) * t * 2 : wMid + (w1 - wMid) * (t - 0.5) * 2);
    const edge: [number, number][][] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const c = at(t),
        c2 = at(Math.min(1, t + 0.01)),
        c1 = at(Math.max(0, t - 0.01));
      const tx = c2[0] - c1[0],
        ty = c2[1] - c1[1],
        len = Math.hypot(tx, ty) || 1;
      const nx = -ty / len,
        ny = tx / len;
      const h = width(t) / 2;
      c[0] += nx * shift;
      c[1] += ny * shift;
      const clampD = (d: number) => Math.min(flat - 0.02, d);
      edge.push([
        [clampD(c[0] + nx * h), c[1] + ny * h],
        [clampD(c[0] - nx * h), c[1] - ny * h],
      ]);
    }
    const tint = new THREE.Color(color).lerp(new THREE.Color('#1a2030'), 0.5).getStyle();
    for (let i = 0; i < n; i++) {
      const [a0, a1] = edge[i],
        [b0, b1] = edge[i + 1];
      const quad: [number, number][] = [a0, b0, b1, a1];
      const body = clipY(quad, BASE + 0.14, yMax);
      if (body.length >= 3) skin(b, body.map(([d, y]) => [sign * d, y] as [number, number]), color, eps);
      // Where the band crosses the window band it is film on glass: a tinted copy sits over the glazing.
      const glass = clipY(quad, WIN_LO, Math.min(WIN_HI, yMax));
      if (glass.length >= 3) skin(b, glass.map(([d, y]) => [sign * d, y] as [number, number]), tint, 0.049);
    }
  };
  /**
   * A fan of three parallel bands (lime, teal, violet, in that order) along one gentle curve. `side`
   * says which way the later bands step off the first: +1 or -1 along the curve's normal.
   */
  const fan = (sign: number, p: [number, number][], side: 1 | -1, yMax = ROOF - 0.04) => {
    const bands: [string, number][] = [[C.lime, 0.7], [C.teal, 0.7], [C.violet, 0.7]];
    let offset = 0;
    bands.forEach(([color, w], k) => {
      const shift = side * (offset + w / 2);
      // Above the door leaves and their glass (0.04-0.046), so the stripes run across the doors as the vinyl does.
      sweep(sign, p, w, w, color, 0.047 + k * 0.0003, w, shift, yMax);
      offset += w;
    });
  };

  // Livery, after car 1003 (Jun 2017) and Sam's markup of a side view: on each cab section three
  // broad straight stripes, lime, light cyan and violet, adjacent and parallel, rising from the low
  // front by the nose to the roof line behind the first double door and crossing the window band
  // (tinted over the glass). Mirrored at the other end; the centre section is plain. Positions are
  // estimates.
  const D = 6.45; // first double door from the cab
  for (const sign of [-1, 1]) {
    const lowFront: [number, number] = [flat - 0.15, 0.2],
      upperRear: [number, number] = [D - 1.3, ROOF + 0.2];
    const lerp = (t: number): [number, number] => [lowFront[0] + (upperRear[0] - lowFront[0]) * t, lowFront[1] + (upperRear[1] - lowFront[1]) * t];
    // Capped where the flat side meets the curved eave, which reads as the roof line from the side.
    fan(sign, [lowFront, lerp(1 / 3), lerp(2 / 3), upperRear], 1, ROOF - 0.44);
    const [p0, p1] = sign > 0 ? [centre / 2 + joint, flat] : [-flat, -(centre / 2 + joint)];
    rect(b, p0, p1, 0.6, 0.625, C.white, 0.016); // low white pinstripe
  }

  // Glazing: one large, nearly continuous band with thin pillars; doors with tall glass panels and an
  // amber indicator above. Glass sits over the sweeps, as the graphics stop at the glass.
  const winLo = WIN_LO,
    winHi = WIN_HI,
    pillar = 0.07;
  const doors = [3.8, D];
  const doorW = 1.3;
  for (const sign of [-1, 1]) {
    const a = centre / 2 + joint + 0.12,
      c = flat - 0.05;
    const runs: [number, number][] = [];
    let start = a;
    for (const d of doors) {
      runs.push([start, d - doorW / 2 - 0.06]);
      start = d + doorW / 2 + 0.06;
    }
    runs.push([start, c - 0.95]); // then the driver's window
    for (const [r0, r1] of runs) {
      rect(b, sign * r0, sign * r1, winLo - 0.05, winHi + 0.05, C.frame, 0.034);
      const n = Math.max(1, Math.round((r1 - r0) / 1.45));
      for (let k = 0; k < n; k++) {
        const z0 = r0 + ((r1 - r0) * k) / n + pillar / 2,
          z1 = r0 + ((r1 - r0) * (k + 1)) / n - pillar / 2;
        rect(windows, sign * z0, sign * z1, winLo, winHi, C.glass, 0.04);
      }
    }
    // Driver's side window.
    rect(b, sign * (c - 0.88), sign * (c - 0.02), winLo - 0.05, winHi + 0.05, C.frame, 0.034);
    rect(windows, sign * (c - 0.84), sign * (c - 0.06), winLo + 0.05, winHi, C.glass, 0.04);
    for (const d of doors) {
      const zc = sign * d;
      rect(b, zc - doorW / 2, zc + doorW / 2, BASE + 0.2, 2.86, C.frame, 0.036);
      for (const leaf of [-1, 1]) {
        const l0 = zc + (leaf < 0 ? -doorW / 2 + 0.04 : 0.015),
          l1 = zc + (leaf < 0 ? -0.015 : doorW / 2 - 0.04);
        rect(b, l0, l1, BASE + 0.24, 2.82, C.body, 0.04);
        rect(windows, l0 + 0.07, l1 - 0.07, 0.62, 2.68, C.glass, 0.046);
      }
      rect(lamps, zc - 0.32, zc + 0.32, 2.95, 3.0, C.amber, 0.04); // door indicator strip
    }
  }
  // Centre section: two large panes, no doors.
  rect(b, -centre / 2 + 0.2, centre / 2 - 0.2, winLo - 0.05, winHi + 0.05, C.frame, 0.034);
  for (const [z0, z1] of [[-centre / 2 + 0.25, -pillar / 2], [pillar / 2, centre / 2 - 0.25]]) rect(windows, z0, z1, winLo, winHi, C.glass, 0.04);

  // Cab fronts: big raked windscreen with the destination sign along its head, run number, wiper,
  // headlights low on the nose, a round top lamp and corner markers. Cab A (+z) leads by default.
  for (const sign of [-1, 1]) {
    const lead = sign > 0 ? leadingA : leadingB;
    const tail = !lead && (sign > 0 ? leadingB : leadingA);
    const zTop = sign * (half - 0.75),
      zFoot = sign * (half - 0.2);
    const zAt = (y: number, lift: number) => zFoot + ((zTop - zFoot) * (y - 1.5)) / (3.3 - 1.5) + sign * lift;
    const screen = (pts: [number, number][], color: string, builder: Builder, lift: number) => {
      const v = pts.map(([x, y]) => [x, y, zAt(y, lift)]);
      if (sign < 0) v.reverse();
      for (let i = 1; i < v.length - 1; i++) builder.tri(v[0], v[i], v[i + 1], color);
    };
    const box2 = (x0: number, y0: number, x1: number, y1: number): [number, number][] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    screen(box2(-1.02, 1.58, 1.02, 3.2), '#46586a', b, 0.014);
    screen(box2(-0.78, 2.9, 0.78, 3.12), lead ? C.amber : '#3a2a1a', lead ? lamps : b, 0.022); // destination sign
    screen(box2(-0.95, 1.66, -0.6, 1.8), lead ? C.amber : '#3a2a1a', lead ? lamps : b, 0.022); // run number
    screen([[0.6, 1.66], [0.66, 1.66], [0.28, 2.6], [0.22, 2.6]], C.dark, b, 0.026); // parked wiper
    const nose = (builder: Builder, x: number, y: number, w: number, h: number, color: string) =>
      builder.box(w, h, 0.05, x, y, sign * (half - 0.025), color);
    for (const s of [-1, 1]) {
      nose(lead || tail ? lamps : b, s * 0.66, 0.92, 0.34, 0.15, lead ? '#fff3d6' : tail ? '#ff2a22' : '#4a4f55');
      (lead || tail ? lamps : b).box(0.1, 0.07, 0.05, s * 0.72, 3.24, sign * (half - 0.73), tail ? '#ff2a22' : lead ? '#fff3d6' : '#4a4f55');
      b.box(0.07, 0.3, 0.12, s * (W + 0.1), 2.55, sign * (half - 1.0), C.dark); // mirror / camera stalk
    }
    (lead ? lamps : b).box(0.16, 0.16, 0.05, 0, 3.24, sign * (half - 0.73), lead ? '#fff6e0' : '#4a4f55');
  }

  // Wheels, mostly hidden by the low skirt.
  const wheel = new THREE.CylinderGeometry(0.3, 0.3, 0.12, 10).rotateZ(Math.PI / 2);
  for (const { z: tz, wheelbase } of S70_LAYOUT.trucks)
    for (const x of [-0.72, 0.72])
      for (const dz of [-wheelbase / 2, wheelbase / 2]) {
        const g = wheel.clone().translate(x, 0.3, tz + dz);
        b.addGeometry(g, C.wheel);
        g.dispose();
      }
  wheel.dispose();

  // Roof fairings: long, low, rounded pods over the HVAC on each end section, a flatter one on the
  // centre section under the pantograph. Tops stay within the published 3.84 m.
  const pod = (z0: number, z1: number, w: number, h: number) => {
    const sec = (z: number, s: number) => {
      const ww = w * s,
        hh = h * s;
      return [
        [-ww, ROOF - 0.02, z],
        [ww, ROOF - 0.02, z],
        [ww, ROOF + hh * 0.55, z],
        [ww * 0.72, ROOF + hh, z],
        [-ww * 0.72, ROOF + hh, z],
        [-ww, ROOF + hh * 0.55, z],
      ];
    };
    const taper = Math.min(0.7, (z1 - z0) / 4);
    loft(b, [sec(z0, 0.55), sec(z0 + taper, 1), sec(z1 - taper, 1), sec(z1, 0.55)], [C.pod, C.pod, C.pod, C.pod, C.pod, C.pod], true, true, C.pod);
  };
  for (const sign of [-1, 1]) {
    const [z0, z1] = sign > 0 ? [4.4, 9.2] : [-9.2, -4.4];
    pod(z0, z1, 0.95, S70_HEIGHT - ROOF);
  }
  pod(-1.5, 1.5, 0.8, 0.16);

  // Single-arm pantograph raised to the wire, as in every in-service photograph. The data sheet
  // allows up to 7.01 m; the working height here is an estimate.
  const arm = (z0: number, y0: number, z1: number, y1: number, w: number) => {
    const len = Math.hypot(z1 - z0, y1 - y0);
    const m = new THREE.Matrix4()
      .makeTranslation(0, (y0 + y1) / 2, (z0 + z1) / 2)
      .multiply(new THREE.Matrix4().makeRotationX(-Math.atan2(y1 - y0, z1 - z0)));
    b.box(w, 0.06, len, 0, 0, 0, '#55595e', m);
  };
  arm(-0.55, ROOF + 0.2, 0.95, 4.65, 0.5);
  arm(0.95, 4.65, -0.15, PANTOGRAPH - 0.05, 0.12);
  b.box(1.5, 0.05, 0.2, 0, PANTOGRAPH, -0.15, '#2f3236'); // collector head

  return finishStockGeometry(b, windows, lamps);
}

/**
 * The car split into its three bodies so City can bend it through curves. Each `geometry` is in its
 * own frame: railhead y = 0, z = 0 at the section's `centre`. `centre` and `pivots` are car-frame z;
 * a pivot's section-local z is `pivot - centre`. See S70_LAYOUT for how to place them. Triangles go to
 * a section by their centroid's car z.
 */
export function s70Sections(opts: { leadingA?: boolean; leadingB?: boolean } = {}) {
  const whole = s70Geometry(opts);
  const pos = whole.getAttribute('position'),
    col = whole.getAttribute('color'),
    light = whole.getAttribute('stockLight');
  const ids = ['B', 'C', 'A'] as const;
  const out = ids.map(() => ({ pos: [] as number[], col: [] as number[], light: [] as number[] }));
  const split = JOINT;
  for (let t = 0; t < pos.count; t += 3) {
    const cz = (pos.getZ(t) + pos.getZ(t + 1) + pos.getZ(t + 2)) / 3;
    const k = cz < -split ? 0 : cz > split ? 2 : 1;
    const sec = S70_LAYOUT.sections[ids[k]];
    const centreZ = (sec.from + sec.to) / 2;
    for (let v = t; v < t + 3; v++) {
      out[k].pos.push(pos.getX(v), pos.getY(v), pos.getZ(v) - centreZ);
      out[k].col.push(col.getX(v), col.getY(v), col.getZ(v));
      out[k].light.push(light.getX(v));
    }
  }
  whole.dispose();
  return ids.map((id, k) => {
    const sec = S70_LAYOUT.sections[id];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(out[k].pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(out[k].col, 3));
    g.setAttribute('stockLight', new THREE.Float32BufferAttribute(out[k].light, 1));
    g.computeVertexNormals();
    return { id, geometry: g, centre: (sec.from + sec.to) / 2, pivots: sec.pivots };
  });
}
