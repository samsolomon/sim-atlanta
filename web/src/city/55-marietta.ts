import type { GroundGrid } from '../terrain/grid';
import { rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
const site = '57b15807-8d28-41b6-99c4-82bfb7a56eb9';
const stone = '#bdbab1',
  frame = '#d4d2c7',
  roof = '#aaa99f';
const glass = ['#657781', '#6e818c', '#758791', '#526975', '#586e77'];
const lowerRoof = 397.7,
  upperRoof = 406.22;
function rect(u: number, v: number, x: number, z: number): P2[] {
  return [
    [u, v],
    [x, v],
    [x, z],
    [u, z],
  ];
}
function ribbon(m: Shell, a: P2, b: P2, lo: number, hi: number, rows: number, random: () => number) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    len = Math.hypot(dx, dz),
    count = Math.max(1, Math.round(len / 1.62));
  const p = (s: number, h: number, d: number) => [a[0] + (s * dx + d * dz) / len, h, a[1] + (s * dz - d * dx) / len];
  const pitch = (hi - lo) / rows;
  for (let j = 0; j < rows; j++) {
    const sill = lo + (j + 0.17) * pitch,
      head = lo + (j + 0.65) * pitch;
    m.body.quad(
      p(0, sill - 0.08, 0.1),
      p(0, head + 0.09, 0.1),
      p(len, head + 0.09, 0.1),
      p(len, sill - 0.08, 0.1),
      '#4d5759',
    );
    for (let k = 0; k < count; k++) {
      const l = (k * len) / count + 0.035,
        r = ((k + 1) * len) / count - 0.035;
      const batch = random() < 0.075 ? m.lights : m.body;
      batch.quad(
        p(l, sill, 0.135),
        p(l, head, 0.135),
        p(r, head, 0.135),
        p(r, sill, 0.135),
        glass[Math.floor(random() * glass.length)],
      );
    }
    m.body.quad(
      p(0, sill - 0.12, 0.18),
      p(0, sill - 0.04, 0.18),
      p(len, sill - 0.04, 0.18),
      p(len, sill - 0.12, 0.18),
      frame,
    );
  }
}
function facades(m: Shell) {
  const random = rng(551955);
  // The Marietta ribbons run in two long fields. On Forsyth they stop at broad stone piers.
  for (const [v0, v1] of [
    [0.55, 30.7],
    [31.6, 56.65],
  ]) {
    ribbon(m, [0.3, v1], [0.3, v0], 331.72, lowerRoof, 18, random);
    ribbon(m, [33.15, v0], [33.15, v1], 331.72, lowerRoof, 18, random);
  }
  for (const [u0, u1] of [
    [3.4, 7.65],
    [10.8, 22.9],
    [26.0, 29.45],
  ]) {
    ribbon(m, [u1, 60.72], [u0, 60.72], 331.72, lowerRoof, 18, random);
  }
  // On the Fairlie end the main window field is narrower and divided into regular groups.
  for (const [u0, u1] of [
    [3.4, 8.3],
    [12.2, 22.3],
    [26.4, 29.9],
  ]) {
    ribbon(m, [u0, 0.12], [u1, 0.12], 331.72, lowerRoof, 18, random);
  }
  const tower = rect(1.0, 31.0, 32.95, 56.95);
  m.prism(tower, lowerRoof, upperRoof, stone, roof);
  ribbon(m, [1, 56.55], [1, 31.4], lowerRoof, upperRoof, 2, random);
  ribbon(m, [32.95, 31.4], [32.95, 56.55], lowerRoof, upperRoof, 2, random);
  ribbon(m, [7.2, 31.0], [23.6, 31.0], lowerRoof, upperRoof, 2, random);
  ribbon(m, [23.6, 56.95], [7.2, 56.95], lowerRoof, upperRoof, 2, random);
  // The slim outer corner turns back from the long facade to the lower Forsyth shoulder.
  for (const u of [0.3, 33.15]) {
    const a: P2 = [u, 57.18],
      b: P2 = [u, 60.52];
    ribbon(m, u < 1 ? b : a, u < 1 ? a : b, 331.72, lowerRoof, 18, random);
  }
}
function crown(m: Shell) {
  // Parapets trace the two roof levels. The upper screen is plain in the current street photographs.
  for (const [p, h] of [
    [rect(0.3, 0.12, 33.15, 60.72), lowerRoof],
    [rect(1, 31, 32.95, 56.95), upperRoof],
  ] as [P2[], number][]) {
    p.forEach(([u, v], i) => {
      const [x, z] = p[(i + 1) % 4];
      m.body.box(Math.abs(x - u) + 0.2, 0.76, Math.abs(z - v) + 0.2, (u + x) / 2, h + 0.32, (v + z) / 2, frame);
    });
  }
  m.prism(rect(15.35, 30.05, 32.88, 50.6), upperRoof, 408.34, '#aaa9a1', '#b9bbb2');
  // Two taller screen walls read above the roof from Five Points.
  m.prism(rect(15.36, 30.03, 32.94, 30.52), 408.34, 412.36, stone, frame);
  m.prism(rect(32.42, 30.05, 32.94, 50.64), 408.34, 412.36, stone, frame);
  m.prism(rect(15.36, 50.1, 32.9, 50.6), 408.34, 410.1, '#b0b1aa', roof);
  m.prism(rect(20.8, 25.7, 24.45, 30.4), lowerRoof, 411.9, '#acada5', '#bbbbb1');
  // Simplified roof volumes retain the silhouette seen above the lower wing.
  for (const [u, v, w, d, h] of [
    [5.8, 12, 3.1, 4.2, 402.3],
    [5.3, 22.1, 2.4, 8.2, 401.2],
    [20, 7.9, 4.9, 3.7, 402.1],
    [19.5, 15.1, 4.2, 3.7, 402.3],
  ]) {
    m.prism(rect(u, v, u + w, v + d), lowerRoof, h, '#a2a6a1', '#b5b8b0');
  }
}
function entrance(m: Shell) {
  const n = 30.8,
    s = 56.95;
  const footprint: P2[] = [
    [0.3, 0.12],
    [33.15, 0.12],
    [33.15, 60.72],
    [0.3, 60.72],
    [0.3, s],
    [2.42, s],
    [2.42, n],
    [0.3, n],
  ];
  m.prism(footprint, m.base, 331.72, stone, roof);
  m.prism(rect(0.3, 0.12, 33.15, 60.72), 331.72, lowerRoof, stone, roof);
  m.body.quad([0.3, 331.72, n], [2.42, 331.72, n], [2.42, 331.72, s], [0.3, 331.72, s], '#a8a697');
  for (const v of [n, 39.52, 48.2, s]) {
    m.body.box(2.17, 331.72 - m.base, 1.02, 1.37, (331.72 + m.base) / 2, v, frame);
  }
  m.facade([2.42, s], [2.42, n], 322.25, 327.45, 1, 1.47, 0.94, 0.95, glass, 0.32);
  m.facade([2.42, s], [2.42, n], 328.2, 330.93, 1, 1.47, 0.94, 0.94, glass, 0.12);
  // The present address sits on the transom above the middle entrance.
  for (const v of [43.32, 43.93]) {
    for (const dy of [0, 0.36, 0.72]) m.body.box(0.075, 0.104, 0.44, 2.28, 327.68 + dy, v, '#414442');
    m.body.box(0.075, 0.37, 0.095, 2.28, 328.23, v - 0.18, '#414442');
    m.body.box(0.075, 0.37, 0.095, 2.28, 327.86, v + 0.18, '#414442');
  }
  m.facade([0.3, 30.65], [0.3, 2.5], 322.1, 325.8, 1, 2.25, 0.9, 0.94, glass, 0.12);
  m.facade([32, 60.72], [1.05, 60.72], 322.15, 326.2, 1, 4.6, 0.66, 0.88, glass, 0.1);
}
export function createFultonBank(buildings: VBuilding[], grid: GroundGrid) {
  const m = landmarkShell(
    buildings,
    grid,
    site,
    '55 Marietta Street',
    [15.92, -233.6],
    [25.36, -21.77],
    [
      [3, 3],
      [30, 4],
      [3, 56],
      [30, 57],
    ],
  );
  if (!m) return null;
  entrance(m);
  facades(m);
  crown(m);
  return m.finish('#f2d8b5');
}
