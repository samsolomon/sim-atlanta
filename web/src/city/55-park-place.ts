import type { GroundGrid } from '../terrain/grid';
import { rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

const site = '731be9d3-8574-4c40-91dd-7940bc38067e';
type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
const stone = '#d8d0bd',
  edge = '#e2dbc9',
  roof = '#bcb9ad',
  seam = '#a99f8e';
const panes = ['#384342', '#46504e', '#52605d', '#546368'];
const lobbyTop = 327.75,
  pitch = 3.993;
function rect(left: number, north: number, right: number, south: number): P2[] {
  return [
    [left, north],
    [right, north],
    [right, south],
    [left, south],
  ];
}

// Deep punched openings and two fine reveals repeat across the precast bays.
function elevation(m: Shell, a: P2, b: P2, bays: number, random: () => number) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    len = Math.hypot(dx, dz);
  const p = (s: number, y: number, d: number) => [a[0] + (s * dx + d * dz) / len, y, a[1] + (s * dz - d * dx) / len];
  for (let f = 0; f < 18; f++) {
    const y = lobbyTop + f * pitch,
      lo = y + 0.77,
      hi = y + 3.07;
    for (const offset of [0.32, 3.54]) {
      m.body.quad(
        p(0, y + offset, 0.06),
        p(0, y + offset + 0.095, 0.06),
        p(len, y + offset + 0.095, 0.06),
        p(len, y + offset, 0.06),
        seam,
      );
    }
    for (let j = 0; j < bays; j++) {
      const l = ((j + 0.13) * len) / bays,
        r = ((j + 0.87) * len) / bays,
        mid = (l + r) / 2;
      m.body.quad(p(l - 0.1, lo - 0.12, 0.31), p(l, lo, 0.1), p(r, lo, 0.1), p(r + 0.1, lo - 0.12, 0.31), edge);
      m.body.quad(p(l, hi, 0.1), p(l - 0.1, hi + 0.13, 0.31), p(r + 0.1, hi + 0.13, 0.31), p(r, hi, 0.1), '#999484');
      m.body.quad(p(l - 0.1, lo - 0.12, 0.31), p(l - 0.1, hi + 0.13, 0.31), p(l, hi, 0.1), p(l, lo, 0.1), '#aca798');
      const batch = random() < 0.18 ? m.lights : m.body;
      batch.quad(
        p(l, lo, 0.08),
        p(l, hi, 0.08),
        p(r, hi, 0.08),
        p(r, lo, 0.08),
        panes[Math.floor(random() * panes.length)],
      );
      m.body.quad(
        p(mid - 0.042, lo, 0.13),
        p(mid - 0.042, hi, 0.13),
        p(mid + 0.042, hi, 0.13),
        p(mid + 0.042, lo, 0.13),
        '#6a6c63',
      );
    }
  }
}
function glazing(
  m: Shell,
  u: number,
  north: number,
  south: number,
  lo: number,
  hi: number,
  rows: number,
  occupancy: number,
) {
  m.facade([u, south], [u, north], lo, hi, rows, (south - north) / 9, 0.975, 0.95, panes, occupancy);
}
function wings(m: Shell) {
  const random = rng(55019);
  // Continuous north and south elevations frame two three-bay pylons on Park Place.
  for (const [north, south] of [
    [0, 19.3],
    [36.9, 55.3],
  ]) {
    const plan = rect(0, north, 54.85, south);
    m.prism(plan, m.base, 399.61, stone, roof);
    elevation(m, plan[3], plan[0], 3, random);
    elevation(m, plan[1], plan[2], 3, random);
    const westLobby: P2[] = [
      [0, south],
      [0, north],
    ];
    m.facade(westLobby[0], westLobby[1], 321.9, lobbyTop, 1, 5.9, 0.76, 0.92, panes, 0.24);
  }
  elevation(m, [8.1, 19.3], [0, 19.3], 1, random);
  elevation(m, [0, 36.9], [8.1, 36.9], 1, random);
  elevation(m, [0, 0], [54.85, 0], 9, random);
  elevation(m, [54.85, 55.3], [0, 55.3], 9, random);
  for (const [a, b] of [
    [
      [0, 0],
      [54.85, 0],
    ],
    [
      [54.85, 55.3],
      [0, 55.3],
    ],
  ] as [P2, P2][]) {
    m.facade(a, b, 320.6, lobbyTop, 1, 6.2, 0.72, 0.8, panes, 0.15);
  }
  // The eastern service core has largely blind walls and a higher rectangular roof.
  m.prism(rect(31.0, 19.3, 54.9, 36.9), m.base, 399.61, stone, roof);
  m.prism(rect(44.85, 6.3, 60.25, 49.6), m.base, 399.65, stone, roof);
  m.prism(rect(45.4, 6.4, 60.2, 41.7), 399.65, 405.87, stone, '#bbbdb2');
  m.prism(rect(45.9, 42.55, 53.65, 49.35), 399.65, 405.05, '#aaaea6', '#b7bbb1');
  for (const v of [43.9, 47.05]) {
    m.body.box(2.7, 2.25, 2.55, 57.3, 400.76, v, '#a8b0a7');
    m.body.box(1.7, 0.12, 1.65, 57.3, 401.95, v, '#717f75');
  }
  for (let k = 0; k < 10; k++) {
    const h = 323.2 + 7.96 * k;
    m.body.box(0.065, 0.12, 43.18, 60.28, h, 27.95, seam);
  }
}
function atriums(m: Shell) {
  const n = 19.3,
    s = 36.9;
  // Recessing the two glazed halls between the projecting office bands exposes the reveals.
  const band = (u: number, lo: number, hi: number, floors: number) => {
    m.prism(rect(u, n, 19.3, s), lo, hi, stone, roof);
    m.body.quad([u, lo, n], [19.3, lo, n], [19.3, lo, s], [u, lo, s], '#c1bba9');
    for (let j = 0; j < floors; j++) {
      const h = lo + (j * (hi - lo)) / floors,
        top = lo + ((j + 1) * (hi - lo)) / floors;
      glazing(m, u, n, s, h + 0.72, top - 0.63, 1, 0.28);
      m.body.box(0.21, 0.16, s - n, u - 0.08, top - 0.26, (n + s) / 2, edge);
    }
  };
  const hall = (u: number, lo: number, hi: number, rows: number) => {
    m.prism(rect(u, n, 19.3, s), lo, hi, '#3c4748', roof);
    glazing(m, u, n, s, lo + 0.12, hi - 0.15, rows, 0.32);
    // Strips of occupied space read through the glass across the paired atriums at dusk.
    const y = lo + (hi - lo) * 0.65;
    for (let j = 0; j < 7; j++) {
      const v = n + 0.55 + j * 2.36;
      m.lights.quad(
        [u - 0.1, y, v],
        [u - 0.1, y + 0.49, v],
        [u - 0.1, y + 0.49, v + 2.1],
        [u - 0.1, y, v + 2.1],
        '#8a8769',
      );
    }
    // Slender framing separates the dark glass into tall vertical lights.
    for (let j = 1; j < 6; j++)
      m.body.box(0.24, hi - lo, 0.095, u - 0.13, (lo + hi) / 2, n + (j * (s - n)) / 6, '#495452');
  };
  hall(3.2, m.base, lobbyTop, 2);
  for (let j = 0; j < 5; j++) {
    const top = 321.72 + j * 0.18;
    m.body.box(0.67, top - 320.75, 14.4, -1.2 + j * 0.65, (top + 320.75) / 2, 28.1, stone);
  }
  band(1.1, lobbyTop, 339.65, 3);
  hall(7.8, 339.65, 350.65, 3);
  band(1.6, 350.65, 372.18, 5);
  hall(8.0, 372.18, 379.5, 2);
  // The measured roof rises in roughly four-metre steps behind the Park Place elevation.
  for (const [u, lo, hi] of [
    [1.55, 379.5, 383.48],
    [3.1, 383.48, 387.46],
    [4.65, 387.46, 391.44],
    [6.15, 391.44, 395.42],
    [7.7, 395.42, 399.57],
  ]) {
    band(u, lo, hi, 1);
  }
  // The aerial shows a dark rectangular skylight, with a mid-height return through the glazing.
  m.prism(rect(19.3, n, 31.0, s), m.base, 359.52, '#616662', '#76796f');
  m.prism(rect(19.22, n, 31.05, s), 399.46, 399.76, '#96978d', '#495858');
  for (let j = 1; j < 5; j++) m.body.box(0.09, 0.09, s - n, 19.22 + j * 2.37, 399.81, (n + s) / 2, '#697270');
  for (let j = 1; j < 6; j++) m.body.box(11.83, 0.1, 0.08, 25.14, 399.81, n + j * 2.93, '#697270');
  m.prism(rect(14.8, n - 0.4, 16.45, s + 0.4), 399.57, 401.18, '#a4a89c', '#bbbeb1');
}
export function createFiftyFiveParkPlace(buildings: VBuilding[], grid: GroundGrid) {
  const m = landmarkShell(
    buildings,
    grid,
    site,
    '55 Park Place',
    [377.29, -256.91],
    [54.76, 1.34],
    [
      [3, 3],
      [3, 52],
      [13, 28],
      [58, 47],
    ],
  );
  if (!m) return null;
  wings(m);
  atriums(m);
  return m.finish('#f4ca82');
}
