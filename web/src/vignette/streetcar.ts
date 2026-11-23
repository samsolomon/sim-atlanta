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
const ROOF = 3.5;
const C = {
  body: '#2b3378', // royal/indigo blue
  violet: '#5a3c9e',
  teal: '#1fb0c4',
  lime: '#8bc63e',
  white: '#e9ecea',
  glass: '#1c2530',
  frame: '#11141a',
  skirt: '#24285c',
  bellows: '#2a2d32',
  roofKit: '#2d3270',
  dark: '#15181d',
  wheel: '#3e4246',
};

/** The whole car, rigid, in the car frame (lab use). */
export function s70Geometry({ leadingA = true, leadingB = false } = {}) {
  const b = new Builder(),
    windows = new Builder(),
    lamps = new Builder();
  const { end: endLen, centre, joint } = S70_SECTIONS;
  const half = S70_LENGTH / 2;
  const ring = (z: number, top = ROOF, w = W, base = 0.24) => [
    [-w + 0.08, base, z],
    [w - 0.08, base, z],
    [w, base + 0.12, z],
    [w, Math.min(3.0, top - 0.3), z],
    [w - 0.12, top - 0.2, z],
    [w - 0.42, top - 0.04, z],
    [0.45, top, z],
    [-0.45, top, z],
    [-w + 0.42, top - 0.04, z],
    [-w + 0.12, top - 0.2, z],
    [-w, Math.min(3.0, top - 0.3), z],
    [-w, base + 0.12, z],
  ];
  const panels = (side: string, top: string) => [C.skirt, C.skirt, side, side, top, top, top, top, top, side, side, C.skirt];
  const centreZ0 = -centre / 2,
    centreZ1 = centre / 2;
  loft(b, [ring(centreZ0), ring(centreZ1)], panels(C.body, C.body), true, true, C.bellows);
  for (const sign of [-1, 1]) {
    // Articulation end, start of the cab, top of the windscreen, windscreen foot, nose tip.
    const at = (d: number) => sign * d;
    const keys = [
      { ring: ring(at(centre / 2 + joint)), next: panels(C.body, C.body) },
      { ring: ring(at(half - 1.15)), next: panels(C.body, C.body) },
      { ring: ring(at(half - 0.55), 3.38, W - 0.03), next: panels(C.body, C.dark) }, // raked windscreen
      { ring: ring(at(half - 0.18), 1.55, W - 0.1, 0.26), next: panels(C.body, C.body) }, // rounded lower nose
      { ring: ring(at(half), 1.4, W - 0.24, 0.3), next: [] as string[] },
    ];
    // loft() wants rings in ascending z, so walk the cab at -z from the nose inward.
    for (let i = 0; i < keys.length - 1; i++) {
      const [r0, r1] = sign > 0 ? [keys[i].ring, keys[i + 1].ring] : [keys[i + 1].ring, keys[i].ring];
      const first = i === 0,
        last = i === keys.length - 2;
      const capRear = sign > 0 ? first : last,
        capFront = sign > 0 ? last : first;
      loft(b, [r0, r1], keys[i].next, capRear, capFront, (sign > 0) === capRear ? C.bellows : C.body);
    }
  }
  // Articulation bellows.
  // Each bellows is split at its joint, half to each neighbour, so a bend folds it from the middle.
  for (const sign of [-1, 1])
    for (const [z0, z1] of [[centre / 2, JOINT - 0.004], [JOINT + 0.004, centre / 2 + joint]])
      b.box(S70_WIDTH - 0.3, 2.9, z1 - z0, 0, 1.75, sign * (z0 + z1) / 2, C.bellows);

  /** Flat polygon on both side sheets from [z, y] points, lifted `eps` off the body. */
  const side = (builder: Builder, pts: [number, number][], color: string, eps: number) => {
    for (const s of [-1, 1]) {
      const v = pts.map(([z, y]) => [s * (W + eps), y, z]);
      let area = 0;
      for (let i = 0; i < v.length; i++) area += v[i][2] * v[(i + 1) % v.length][1] - v[(i + 1) % v.length][2] * v[i][1];
      if ((s > 0) === area > 0) v.reverse();
      for (let i = 1; i < v.length - 1; i++) builder.tri(v[0], v[i], v[i + 1], color);
    }
  };
  const rect = (builder: Builder, z0: number, z1: number, y0: number, y1: number, color: string, eps: number) =>
    side(builder, [[z0, y0], [z1, y0], [z1, y1], [z0, y1]], color, eps);

  // Window band: dark surround, glazing that lights at night, two double plug doors per end section.
  const winLo = 1.45,
    winHi = 2.65;
  const doors = [3.8, 6.45]; // door centres from the car centre, scaled from the data-sheet drawing
  const doorW = 1.3;
  for (const sign of [-1, 1]) {
    const a = sign * (centre / 2 + joint + 0.15),
      c = sign * (half - 2.3); // stop short of the cab side window
    const [z0, z1] = sign > 0 ? [a, c] : [c, a];
    rect(b, z0, z1, winLo - 0.06, winHi + 0.06, C.frame, 0.012);
    // Panes between the doors.
    const edges = [a, ...doors.flatMap((d) => [sign * (d - doorW / 2), sign * (d + doorW / 2)]), c].sort((p, q) => p - q);
    for (let i = 0; i < edges.length; i += 2) {
      const span = edges[i + 1] - edges[i];
      const n = Math.max(1, Math.round(span / 1.25));
      for (let k = 0; k < n; k++) {
        const p0 = edges[i] + (span * k) / n + 0.06,
          p1 = edges[i] + (span * (k + 1)) / n - 0.06;
        rect(windows, p0, p1, winLo, winHi, C.glass, 0.018);
      }
    }
    for (const d of doors) {
      const zc = sign * d;
      rect(b, zc - doorW / 2, zc + doorW / 2, 0.36, 2.62, C.frame, 0.016);
      for (const leaf of [-1, 1]) {
        const l0 = zc + (leaf < 0 ? -doorW / 2 + 0.05 : 0.02),
          l1 = zc + (leaf < 0 ? -0.02 : doorW / 2 - 0.05);
        rect(b, l0, l1, 0.4, 2.58, C.body, 0.02);
        rect(windows, l0 + 0.1, l1 - 0.1, 0.95, 2.45, C.glass, 0.024);
      }
    }
    // Cab side window by the driver.
    const cw = sign * (half - 1.85);
    rect(b, cw - 0.46, cw + 0.46, 1.24, 2.61, C.frame, 0.012);
    rect(windows, cw - 0.4, cw + 0.4, 1.3, 2.55, C.glass, 0.018);
  }
  // Centre section: a pair of windows, no doors.
  rect(b, -centre / 2 + 0.25, centre / 2 - 0.25, winLo - 0.06, winHi + 0.06, C.frame, 0.012);
  for (const zc of [-1.0, 1.0]) rect(windows, zc - 0.9, zc + 0.9, winLo, winHi, C.glass, 0.018);

  // Livery sweeps, anchored to the mid-section door as in the 2016–2020 photographs (shapes
  // estimated): a thin violet stripe and a teal band drop from the roof through that door, a lime
  // wedge tapers from the roof to the window head behind it, and violet, teal and lime bands sweep
  // from under the door down to the cab's bottom corner, widening as they go.
  const D = doors[1];
  const flat = half - 1.15; // the side sheet ends where the cab narrows
  for (const sign of [-1, 1]) {
    const Z = (pts: [number, number][]) => pts.map(([d, y]) => [sign * d, y] as [number, number]);
    const top = 3.12;
    side(b, Z([[D - 0.95, top], [D - 0.8, top], [D - 0.4, winHi], [D - 0.55, winHi]]), C.violet, 0.03);
    side(b, Z([[D - 0.75, top], [D + 0.15, top], [D + 0.5, winHi], [D - 0.35, winHi]]), C.teal, 0.03);
    side(b, Z([[D - 0.35, winHi], [D + 0.5, winHi], [D + 0.65, winLo], [D - 0.2, winLo]]), C.teal, 0.03);
    side(b, Z([[D + 0.3, top], [D + 2.6, top], [D + 3.1, winHi + 0.04], [D + 2.2, winHi + 0.04]]), C.lime, 0.03);
    // One shared run from under the door to the cab, so each band hangs exactly below the last.
    const r0 = D + 0.5,
      r1 = flat - 0.05;
    const tAt = (d: number) => (d - r0) / (r1 - r0);
    const span = (t: number) => 0.2 + 0.2 * t;
    const edge = (k: number, t: number) => Math.max(0.36, winLo - 0.04 - 0.35 * t - k * span(t)); // top of band k
    const starts = [r0, D + 1.3, D + 2.1];
    [C.violet, C.teal, C.lime].forEach((color, k) => {
      const steps = 6;
      for (let i = 0; i < steps; i++) {
        const za = starts[k] + ((r1 - starts[k]) * i) / steps,
          zb = starts[k] + ((r1 - starts[k]) * (i + 1)) / steps;
        const [ta, tb] = [tAt(za), tAt(zb)];
        // Band k's bottom is band k+1's top; both clamp at the skirt, so the quad never crosses itself.
        const quad: [number, number][] = [[za, edge(k, ta)], [zb, edge(k, tb)], [zb, edge(k + 1, tb)], [za, edge(k + 1, ta)]];
        if (edge(k, ta) - edge(k + 1, ta) < 0.005 && edge(k, tb) - edge(k + 1, tb) < 0.005) continue; // clamped away
        side(b, Z(quad), color, 0.03 + k * 0.003);
      }
    });
    // Low white pinstripe.
    rect(b, sign > 0 ? centre / 2 + joint : -flat, sign > 0 ? flat : -(centre / 2 + joint), 0.6, 0.63, C.white, 0.022);
  }

  // Cab fronts: windscreen glass, destination sign, lamps. Cab A (+z) leads by default.
  for (const sign of [-1, 1]) {
    const lead = sign > 0 ? leadingA : leadingB;
    const tail = !lead && (sign > 0 ? leadingB : leadingA);
    const zFoot = sign * (half - 0.18),
      zTop = sign * (half - 0.55);
    const screen = (x0: number, x1: number, y0: number, y1: number, color: string, builder: Builder, lift: number) => {
      const zAt = (y: number) => zFoot + ((zTop - zFoot) * (y - 1.55)) / (3.38 - 1.55) + sign * lift;
      const v = [
        [x0, y0, zAt(y0)],
        [x1, y0, zAt(y0)],
        [x1, y1, zAt(y1)],
        [x0, y1, zAt(y1)],
      ];
      if (sign < 0) v.reverse();
      builder.quad(v[0], v[1], v[2], v[3], color);
    };
    screen(-1.05, 1.05, 1.62, 3.15, '#2b3a4a', b, 0.012);
    screen(-0.75, 0.75, 2.85, 3.08, lead ? '#ffb347' : '#3a2a1a', lead ? lamps : b, 0.02); // destination sign
    screen(-0.95, -0.55, 1.68, 1.82, lead ? '#ffb347' : '#3a2a1a', lead ? lamps : b, 0.02); // run number
    const g = (builder: Builder, x: number, y: number, w: number, h: number, color: string) =>
      builder.box(w, h, 0.05, x, y, sign * (half - 0.025), color); // flush with the nose face
    for (const s of [-1, 1]) {
      g(lead ? lamps : tail ? lamps : b, s * 0.72, 1.02, 0.36, 0.16, lead ? '#fff3d6' : tail ? '#ff2a22' : '#4a4f55');
      // Corner markers on the windscreen head.
      (lead || tail ? lamps : b).box(0.1, 0.08, 0.05, s * 0.7, 3.28, sign * (half - 0.53), tail ? '#ff2a22' : lead ? '#fff3d6' : '#4a4f55');
    }
    (lead ? lamps : b).box(0.16, 0.16, 0.05, 0, 3.28, sign * (half - 0.53), lead ? '#fff6e0' : '#4a4f55'); // round top lamp
    // Single wiper parked on a slant across the screen, as in the 2016 photos; mirrors on stalks.
    {
      const zAt = (y: number) => zFoot + ((zTop - zFoot) * (y - 1.55)) / (3.38 - 1.55) + sign * 0.026;
      const v = [
        [0.62, 1.72, zAt(1.72)],
        [0.68, 1.72, zAt(1.72)],
        [0.3, 2.62, zAt(2.62)],
        [0.24, 2.62, zAt(2.62)],
      ];
      if (sign < 0) v.reverse();
      b.quad(v[0], v[1], v[2], v[3], C.dark);
    }
    for (const s of [-1, 1]) b.box(0.08, 0.32, 0.12, s * (W + 0.12), 2.5, sign * (half - 0.9), C.dark);
  }

  // Skirts hide the trucks; wheels peek out below. Power trucks near the cabs, plain truck centred.
  const wheel = new THREE.CylinderGeometry(0.3, 0.3, 0.12, 10).rotateZ(Math.PI / 2);
  for (const { z: tz, wheelbase: base } of S70_LAYOUT.trucks) {
    for (const x of [-0.72, 0.72])
      for (const dz of [-base / 2, base / 2]) {
        const gg = wheel.clone().translate(x, 0.3, tz + dz);
        b.addGeometry(gg, C.wheel);
        gg.dispose();
      }
  }
  wheel.dispose();

  // Roof: an HVAC unit on each end section, the folded pantograph on the centre section.
  for (const sign of [-1, 1]) b.box(1.7, S70_HEIGHT - ROOF, 3.2, 0, (ROOF + S70_HEIGHT) / 2, sign * 6.6, C.roofKit);
  b.box(1.2, 0.18, 1.6, 0, ROOF + 0.09, 0, '#3b3f45');
  // Single-arm pantograph raised to the wire, as in every in-service photograph. The data sheet
  // allows up to 7.01 m; 5.6 m is an estimate for Atlanta's contact wire.
  const arm = (z0: number, y0: number, z1: number, y1: number, w: number) => {
    const len = Math.hypot(z1 - z0, y1 - y0);
    const m = new THREE.Matrix4()
      .makeTranslation(0, (y0 + y1) / 2, (z0 + z1) / 2)
      .multiply(new THREE.Matrix4().makeRotationX(-Math.atan2(y1 - y0, z1 - z0)));
    b.box(w, 0.06, len, 0, 0, 0, '#55595e', m);
  };
  const knee = [0.95, 4.65] as const;
  arm(-0.55, ROOF + 0.2, knee[0], knee[1], 0.5);
  arm(knee[0], knee[1], -0.15, PANTOGRAPH - 0.05, 0.12);
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
