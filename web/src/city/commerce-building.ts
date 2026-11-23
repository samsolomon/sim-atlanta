import type { GroundGrid } from '../terrain/grid';
import { rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
const cream = '#d7d4c8',
  reveal = '#aea99a',
  screen = '#696658',
  bronze = '#99856b',
  glass = '#535e64';
const garageTop = 351.1,
  roof = 383.2;

function elevation(m: Shell, a: P2, b: P2) {
  const width = Math.hypot(b[0] - a[0], b[1] - a[1]),
    dx = (b[0] - a[0]) / width,
    dz = (b[1] - a[1]) / width;
  function plan(x: number, d: number): P2 {
    return [a[0] + dx * x + dz * d, a[1] + dz * x - dx * d];
  }
  function pt(x: number, y: number, d: number) {
    const [u, v] = plan(x, d);
    return [u, y, v];
  }
  function panel(l: number, r: number, lo: number, hi: number, d: number, color: string, lit = false) {
    (lit ? m.lights : m.body).quad(pt(l, lo, d), pt(l, hi, d), pt(r, hi, d), pt(r, lo, d), color);
  }
  function block(l: number, r: number, lo: number, hi: number, back: number, front: number, color: string) {
    m.prism([plan(l, front), plan(r, front), plan(r, back), plan(l, back)], lo, hi, color, color);
    m.body.quad(pt(l, lo, back), pt(r, lo, back), pt(r, lo, front), pt(l, lo, front), color);
  }
  // Four sloping reveals from the limestone-colored facing to the inset sash.
  function opening(l: number, r: number, lo: number, hi: number, lit: boolean) {
    const depth = -0.34,
      k = 0.15,
      corners = [
        [l, lo],
        [l, hi],
        [r, hi],
        [r, lo],
      ],
      inset = [
        [l + k, lo + k],
        [l + k, hi - k],
        [r - k, hi - k],
        [r - k, lo + k],
      ];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      m.body.quad(
        pt(corners[i][0], corners[i][1], 0),
        pt(corners[j][0], corners[j][1], 0),
        pt(inset[j][0], inset[j][1], depth),
        pt(inset[i][0], inset[i][1], depth),
        reveal,
      );
    }
    panel(l + k, r - k, lo + k, hi - k, depth, glass, lit);
    panel(l + k, r - k, hi - 0.54, hi - 0.46, depth + 0.025, '#899293');
  }
  return { width, pt, panel, block, opening };
}
type Face = ReturnType<typeof elevation>;

function offices(f: Face, bays: number) {
  const { width: w, panel } = f,
    left = w * 0.105,
    pitch = (w - 2 * left) / bays;
  const rand = rng(bays * 137);
  for (let j = 0; j < 5; j++) {
    const y = garageTop + j * 3.49,
      sill = y + 0.63,
      head = y + 2.58;
    panel(0, w, y, sill, 0, cream);
    panel(0, w, head, y + 3.49, 0, cream);
    let last = 0;
    for (let i = 0; i < bays; i++) {
      const x = left + (i + 0.5) * pitch,
        half = pitch * 0.245;
      panel(last, x - half, sill, head, 0, cream);
      f.opening(x - half, x + half, sill, head, rand() < 0.19);
      last = x + half;
    }
    panel(last, w, sill, head, 0, cream);
  }
}

// The large rectangular grille above the office windows is continuous around the public corner.
function upperGrille(f: Face) {
  const { width: w, panel } = f,
    l = w * 0.088,
    r = w - l,
    lo = 369.35,
    hi = 377.64;
  panel(0, w, garageTop + 5 * 3.49, lo, 0, cream);
  panel(0, l, lo, hi, 0, cream);
  panel(r, w, lo, hi, 0, cream);
  panel(l, r, lo, hi, -0.16, '#696c62');
  for (let x = l + 0.17; x < r - 0.06; x += 0.43) panel(x, x + 0.071, lo, hi, -0.1, '#aea99b');
  for (let y = lo + 0.19; y < hi - 0.05; y += 0.39) panel(l, r, y, y + 0.053, -0.06, '#a29e90');
  panel(0, w, hi, 379.18, 0, cream);
}

function parking(f: Face, broad: boolean) {
  const { width: w, panel, block } = f,
    count = broad ? 3 : 7,
    centers = Array.from({ length: count }, (_, i) => w * (broad ? 0.125 + 0.082 * i : 0.135 + i * 0.121));
  let last = 0;
  const lo = 325.22,
    sill = 326.18,
    half = w * (broad ? 0.02 : 0.025);
  panel(0, w, lo, sill, 0, cream);
  for (const x of centers) {
    panel(last, x - half, sill, garageTop, 0, cream);
    block(x - half, x - half + 0.09, sill, garageTop, -0.4, 0, reveal);
    block(x + half - 0.09, x + half, sill, garageTop, -0.4, 0, reveal);
    panel(x - half, x + half, sill, garageTop, -0.39, screen);
    for (let y = sill + 0.18; y < garageTop - 0.12; y += 0.45)
      panel(x - half, x + half, y, y + 0.083, -0.29, '#a59d8b');
    last = x + half;
  }
  panel(last, w, sill, garageTop, 0, cream);
}

function streetLevel(m: Shell, f: Face, broad: boolean) {
  const { width: w, block, panel, pt } = f,
    gate = broad ? w * 0.27 : 0,
    back = -1.1;
  block(gate, w, m.base, 325.22, -1.66, back, '#494947');
  for (let i = 0; i < 5; i++) {
    const l = gate + ((w - gate) * (i + 0.045)) / 5,
      r = gate + ((w - gate) * (i + 0.96)) / 5;
    panel(l, r, m.base + 0.76, 324.34, back + 0.045, '#5b6770', i % 3 === 1);
    panel(l, r, 323.96, 324.05, back + 0.09, '#857f70');
    panel((l + r) / 2 - 0.07, (l + r) / 2 + 0.07, m.base + 0.76, 324.34, back + 0.1, '#968c76');
  }
  block(gate, w + 0.04, 324.25, 325.22, -1.54, 1.02, '#253f68');
  // The office slab shelters an open vehicle entrance at the north end of Broad.
  if (!broad) return;
  block(0, gate, 324.69, 325.22, -6.3, 0, cream);
  for (const x of [0.52, gate - 0.44]) block(x - 0.29, x + 0.29, m.base, 324.76, -1.05, -0.36, cream);
  m.body.quad(
    pt(0.86, 320.95, 0.08),
    pt(gate - 0.8, 320.95, 0.08),
    pt(gate - 0.8, 322.13, -6.08),
    pt(0.86, 322.13, -6.08),
    '#736e62',
  );
  for (const x of [1.05, gate - 0.99])
    m.body.quad(
      pt(x, 321.01, 0.06),
      pt(x + 0.12, 321.01, 0.06),
      pt(x + 0.12, 322.18, -6.07),
      pt(x, 322.18, -6.07),
      '#cbac58',
    );
  m.lights.quad(
    pt(1.5, 324.67, -2.3),
    pt(2.9, 324.67, -2.3),
    pt(2.9, 324.67, -2.63),
    pt(1.5, 324.67, -2.63),
    '#efdfbc',
  );
  // A separate, round-ended blue hood above the glazed pedestrian doors.
  const x = w * 0.39,
    r = 1.75,
    y = 326.02;
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 12,
      b = ((i + 1) * Math.PI) / 12;
    const p = (angle: number, d: number) => pt(x + r * Math.cos(angle), y + r * Math.sin(angle) * 0.74, d);
    m.body.tri(pt(x, y, 1.4), p(a, 1.4), p(b, 1.4), '#304c74');
    m.body.quad(p(a, 1.4), p(b, 1.4), p(b, -0.04), p(a, -0.04), '#39597c');
  }
  // The hood carries the white street number, read left to right from Broad.
  for (const level of [0.25, 0.45, 0.65]) panel(x + 0.05, x + 0.27, y + level, y + level + 0.045, 1.415, '#fff2d2');
  panel(x + 0.045, x + 0.094, y + 0.25, y + 0.69, 1.415, '#fff2d2');
  panel(x - 0.3, x - 0.25, y + 0.25, y + 0.69, 1.415, '#fff2d2');
  panel(x - 0.3, x - 0.06, y + 0.45, y + 0.495, 1.415, '#fff2d2');
  panel(x - 0.105, x - 0.058, y + 0.45, y + 0.69, 1.415, '#fff2d2');
  for (const side of [-1, 1]) {
    const x0 = x + side * 0.55;
    panel(x0 - 0.5, x0 + 0.5, 320.68, 323.94, -0.93, '#a9936b');
    panel(x0 - 0.39, x0 + 0.39, 320.99, 323.72, -0.89, glass);
  }
  // A pale transom and a short display counter distinguish the recessed shop windows from the doors.
  panel(w * 0.535, w * 0.935, 323.72, 324.22, -0.87, '#d3cab7');
  for (let i = 0; i < 5; i++) {
    const c = w * (0.565 + i * 0.077);
    panel(c - 0.48, c + 0.48, 321.91, 322.31, -0.96, i % 2 ? '#a2734d' : '#af9e72');
  }
  // The sculptural metal plaque has an open framework which stands clear of the blank wall.
  const mid = w * 0.66;
  for (let i = 0; i < 8; i++) {
    const offset = (i - 3.5) * 0.46,
      span = 1.7 - 0.045 * Math.abs(offset);
    block(mid + offset - 0.045, mid + offset + 0.045, 329.8 - span, 329.8 + span, 0.08, 0.3, bronze);
  }
  for (let i = 0; i < 7; i++)
    block(
      mid - 1.85 + 0.14 * Math.abs(3 - i),
      mid + 1.85 - 0.11 * Math.abs(3 - i),
      328.39 + i * 0.46,
      328.52 + i * 0.46,
      0.21,
      0.38,
      bronze,
    );
  for (let i = 0; i < 9; i++) {
    const angle = (i * 2 * Math.PI) / 9,
      next = ((i + 1) * 2 * Math.PI) / 9;
    const rim = (a: number, r: number) => pt(mid + 0.22 + r * Math.cos(a), 329.86 + r * Math.sin(a), 0.41);
    m.body.quad(rim(angle, 0.92), rim(next, 0.92), rim(next, 0.58), rim(angle, 0.58), '#af9d7b');
  }
  m.body.quad(
    pt(mid - 0.83, 329.12, 0.44),
    pt(mid - 0.69, 329.01, 0.44),
    pt(mid + 0.73, 330.59, 0.44),
    pt(mid + 0.6, 330.69, 0.44),
    bronze,
  );
}

export function createCommerceBuilding(buildings: VBuilding[], grid: GroundGrid) {
  const m = landmarkShell(
    buildings,
    grid,
    'c4d0fd71-eba0-46b2-b551-1e840e220b6e',
    'Bennett A. Brown Commerce Building',
    [93.47, -153.54],
    [20.89, -19.85],
    [
      [2, 2],
      [26, 2],
      [0, 21],
      [26, 22],
    ],
  );
  if (!m || m.ring.length !== 4) return null;
  const corners: P2[] = [
    [0, 0],
    [28.82, 0],
    [28.02, 25.19],
    [-4.07, 23.18],
  ];
  const aligned = corners.map(([x, z]) => m.ring.find((p) => Math.hypot(x - p[0], z - p[1]) < 1));
  const [d, c, b, a] = aligned;
  if (!d || !c || !b || !a) return null;
  // Position setbacks as fractions of the trapezoid so its parapets follow the actual streets.
  const uv = (u: number, v: number): P2 => {
    const interp = (i: 0 | 1) => (1 - v) * (d[i] + u * (c[i] - d[i])) + v * (a[i] + u * (b[i] - a[i]));
    return [interp(0), interp(1)];
  };
  const rect = (u: number, v: number, U: number, V: number) => [uv(u, v), uv(U, v), uv(U, V), uv(u, V)];
  m.prism(rect(0.045, 0.04, 0.976, 0.73), m.base, 325.22, '#56534e', '#868173');
  m.prism(rect(0.035, 0.03, 0.967, 0.965), 325.22, 379.17, '#bdbbb1', '#b9b5a9');
  const broadWalk = elevation(m, b, a);
  const len = Math.hypot(20.89, 19.85);
  const pave = (x: number, depth: number) => {
    const [u, , v] = broadWalk.pt(x, 0, depth);
    const y = grid.sample(93.47 + (20.89 * u + 19.85 * v) / len, -153.54 + (-19.85 * u + 20.89 * v) / len);
    return [u, (y ?? m.base + 0.35) + 0.13, v];
  };
  for (let i = 0; i < 10; i++) {
    const l = (broadWalk.width * i) / 10,
      r = (broadWalk.width * (i + 1)) / 10;
    const inside = i >= 3 ? -1.32 : 0.12;
    m.body.quad(pave(l, inside), pave(r, inside), pave(r, 2.36), pave(l, 2.36), i >= 3 ? '#a58872' : '#ada99f');
    m.body.quad(pave(l, 2.36), pave(r, 2.36), pave(r, 2.55), pave(l, 2.55), '#bcb4a4');
  }
  const marietta = elevation(m, a, d);
  for (const [f, isBroad] of [
    [broadWalk, true],
    [marietta, false],
  ] as const) {
    streetLevel(m, f, isBroad);
    parking(f, isBroad);
    offices(f, isBroad ? 9 : 7);
    upperGrille(f);
  }
  for (const [p, q] of [
    [d, c],
    [c, b],
  ]) {
    const f = elevation(m, p, q);
    f.panel(0, f.width, m.base, 379.18, 0, '#c6c4ba');
    m.facade(p, q, garageTop, 368.55, 5, 3.35, 0.47, 0.55, [glass, '#616d71'], 0.11);
    f.panel(f.width * 0.11, f.width * 0.89, 369.5, 377.6, 0.08, '#85877b');
  }
  // A continuous soffit under the parking floors, including the recessed shopfronts.
  m.body.quad([a[0], 325.22, a[1]], [b[0], 325.22, b[1]], [c[0], 325.22, c[1]], [d[0], 325.22, d[1]], cream);
  m.prism([d, c, b, a], 379.17, 379.35, cream, '#b4b2a7');
  m.prism(
    [uv(0.025, 0.012), uv(0.98, 0.012), uv(0.98, 0.69), uv(0.82, 0.69), uv(0.82, 0.93), uv(0.025, 0.93)],
    379.35,
    381.85,
    '#c7c4b7',
    '#b9b6aa',
  );
  m.prism(rect(0.035, 0.016, 0.817, 0.899), 381.85, roof, cream, '#bbb9ad');
  const equipment: P2[] = [
    [6.5, 10.3],
    [18.9, 10.3],
    [18.9, 19.3],
    [6.5, 19.3],
  ];
  m.prism(equipment, roof, 387.4, '#abb0a5', '#cbc9ba');
  const drum: P2[] = Array.from({ length: 16 }, (_, i) => [
    12.8 + 4.1 * Math.cos((i * Math.PI) / 8),
    15.0 + 3.93 * Math.sin((i * Math.PI) / 8),
  ]);
  m.prism(drum, 387.4, 389.62, '#a7ab9f', '#c9cbbf');
  return m.finish('#f3dbab');
}
