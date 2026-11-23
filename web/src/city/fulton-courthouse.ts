import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
const site = '0a4a8480-d8f4-40bf-9346-853c053cd064';
const ashlar = '#cbc4b5',
  trim = '#e4dbca',
  roof = '#a39f91';
const windows = ['#556063', '#697477', '#56656a'];
const glazing = ['#354f63', '#47677b', '#526e7c'];
function rect(u: number, v: number, x: number, z: number): P2[] {
  return [
    [u, v],
    [x, v],
    [x, z],
    [u, z],
  ];
}
function facade(m: Shell, plan: P2[], lo: number, hi: number, rows: number, bay: number, glass = false) {
  plan.forEach((a, i) =>
    m.facade(
      a,
      plan[(i + 1) % plan.length],
      lo,
      hi,
      rows,
      bay,
      glass ? 0.96 : 0.5,
      glass ? 0.92 : 0.72,
      glass ? glazing : windows,
      glass ? 0.095 : 0.13,
    ),
  );
}
// Tapered shafts with a spreading capital and square abacus stand clear of the windows.
function column(m: Shell, v: number) {
  const u = 0.82;
  m.body.box(2.75, 0.52, 2.75, u, 325.02, v, trim);
  const rings = [
    [325.28, 1.22],
    [325.85, 1.08],
    [326.16, 0.93],
    [342.0, 0.77],
    [342.28, 0.96],
    [343.22, 1.27],
    [343.44, 1.31],
  ];
  for (let j = 1; j < rings.length; j++) {
    const [h0, r0] = rings[j - 1],
      [h1, r1] = rings[j];
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8,
        b = ((i + 1) * Math.PI) / 8;
      const p = (angle: number, h: number, r: number) => [u + r * Math.cos(angle), h, v + r * Math.sin(angle)];
      m.body.quad(p(a, h0, r0), p(a, h1, r1), p(b, h1, r1), p(b, h0, r0), i % 2 ? '#c7bead' : trim);
    }
  }
  m.body.box(2.83, 0.43, 2.83, u, 343.65, v, trim);
}
function slaton(m: Shell) {
  const perimeter: P2[] = [
    [0, 0],
    [41, 0],
    [41, 15],
    [38.9, 15],
    [38.9, 41.9],
    [34.5, 41.9],
    [34.5, 48.8],
    [41.2, 48.8],
    [41.2, 68],
    [0, 68],
  ];
  m.prism(perimeter, m.base, 324.85, ashlar, trim);
  facade(m, perimeter, m.base + 0.7, 324.5, 3, 4.35);
  for (const h of [315.0, 319.5, 324.4]) {
    m.body.box(0.38, 0.38, 68, -0.13, h, 34, trim);
    m.body.box(41, 0.38, 0.38, 20.5, h, -0.13, trim);
  }
  const middle: P2[] = [...perimeter, [0, 54.8], [3.05, 54.8], [3.05, 13.2], [0, 13.2]];
  m.prism(middle, 324.85, 343.85, ashlar, roof);
  facade(m, middle, 325.2, 343.5, 5, 4.4);
  for (let i = 0; i < 6; i++) column(m, 16.4 + i * 7.04);
  m.prism(perimeter, 343.85, 351.4, ashlar, roof);
  facade(m, perimeter, 346.7, 351.05, 1, 4.35);
  // Projecting entablature, shadow line and individually spaced dentils.
  for (const [height, depth, thickness] of [
    [344.25, 0.55, 0.6],
    [345.62, 0.88, 0.64],
    [351.24, 0.49, 0.48],
  ]) {
    m.body.box(depth * 2, thickness, 68 + 2 * depth, 0, height, 34, trim);
    m.body.box(41 + 2 * depth, thickness, depth * 2, 20.5, height, 0, trim);
    m.body.box(41 + 2 * depth, thickness, depth * 2, 20.5, height, 68, trim);
  }
  for (let v = 0.75; v < 68; v += 1.35) m.body.box(0.51, 0.46, 0.55, -0.34, 345.02, v, trim);
  for (let u = 0.75; u < 41; u += 1.35) m.body.box(0.55, 0.46, 0.51, u, 345.02, -0.34, trim);
  // MLK side pavilion, with the tympanum one plane behind its moulding.
  const pediment = (left: number, right: number, base: number, peak: number, v: number, color: string) =>
    m.body.tri([left, base, v], [(left + right) / 2, peak, v], [right, base, v], color);
  pediment(6.2, 34.8, 345.97, 350.4, -0.68, trim);
  pediment(8.2, 32.8, 346.27, 349.55, -0.7, '#b9ae9a');
  // The three arched entries share a raised landing and a short flight from Pryor.
  m.body.box(1.2, 1.55, 17.6, -0.56, 312.45, 34, ashlar);
  for (let j = 0; j < 5; j++) {
    const top = 312.32 + 0.18 * j;
    m.body.box(0.57, top - 311.4, 17.6, -3.62 + j * 0.55, (top + 311.4) / 2, 34, trim);
  }
  for (const v of [28.1, 34, 39.9]) {
    const u = -0.35,
      half = 1.8,
      spring = 317.6;
    m.body.quad([u, 311.6, v - half], [u, spring, v - half], [u, spring, v + half], [u, 311.6, v + half], '#514e46');
    for (let j = 0; j < 10; j++) {
      const p = (a: number, r: number, x: number) => [x, spring + r * Math.sin(a), v + r * Math.cos(a)];
      const a = (Math.PI * j) / 10,
        b = (Math.PI * (j + 1)) / 10;
      m.body.tri([u, spring, v], p(a, half, u), p(b, half, u), '#636968');
      m.body.quad(p(a, half, u - 0.05), p(a, 2.14, u - 0.05), p(b, 2.14, u - 0.05), p(b, half, u - 0.05), trim);
    }
  }
  for (const v of [23.8, 44.2]) {
    m.body.box(0.37, 3.05, 0.37, -1.35, 313.15, v, '#464b47');
    for (let j = 0; j < 6; j++) {
      const p = (i: number, h: number, r: number) => [
        -1.35 + r * Math.cos((i * Math.PI) / 3),
        h,
        v + r * Math.sin((i * Math.PI) / 3),
      ];
      m.lights.quad(p(j, 314.67, 0.27), p(j, 315.35, 0.36), p(j + 1, 315.35, 0.36), p(j + 1, 314.67, 0.27), '#d9b97e');
      m.body.tri(p(j, 315.36, 0.39), [-1.35, 315.64, v], p(j + 1, 315.36, 0.39), '#555349');
    }
  }
  // The high roof wraps the Pryor elevation and returns along both end wings.
  const ridge: P2[] = [
    [4, 4],
    [37, 4],
    [37, 16],
    [19, 16],
    [19, 51],
    [37, 51],
    [37, 64],
    [4, 64],
  ];
  m.prism(ridge, 351.4, 353.8, '#a9a393', roof);
  const top: P2[] = [
    [8, 7],
    [34.5, 7],
    [34.5, 13.5],
    [17, 13.5],
    [17, 54],
    [34.5, 54],
    [34.5, 61],
    [8, 61],
  ];
  for (let i = 0; i < ridge.length; i++) {
    const j = (i + 1) % ridge.length;
    const p = ([u, v]: P2, y: number) => [u, y, v];
    m.body.quad(p(ridge[i], 353.8), p(top[i], 356.8), p(top[j], 356.8), p(ridge[j], 353.8), '#a9a496');
  }
  m.prism(top, 353.8, 356.8, roof, '#acaa9f');
  m.prism(rect(23.2, 28, 29.6, 40.8), 351.4, 357.4, '#a6a59a', '#bdbdb2');
  m.prism(rect(41.2, 62.2, 47.6, 68), m.base, 346.35, '#b2afa1', roof);
}
function bridge(m: Shell, from: number, to: number, front: number, back: number, top: number) {
  const plan = rect(from, front, to, back),
    bottom = top - 4;
  m.prism(plan, bottom, top, '#bcc1b8', roof);
  facade(m, plan, bottom + 0.4, top - 0.3, 1, 2.35, true);
  m.body.quad([from, bottom, front], [to, bottom, front], [to, bottom, back], [from, bottom, back], '#aaa99d');
}
function justiceTower(m: Shell) {
  const plan: P2[] = [
    [53.6, -2.1],
    [84.9, -2],
    [84.9, -4.6],
    [92.5, -4.6],
    [92.4, 48.4],
    [101.6, 48.4],
    [101.6, 121.9],
    [62.5, 121.9],
    [62.5, 73.7],
    [52.6, 73.7],
    [52.6, 63.9],
    [55.6, 63.9],
    [55.6, 26],
    [53.6, 26],
  ];
  m.prism(plan, m.base, 352.05, '#56646f', '#acb7b3');
  facade(m, plan, m.base + 0.4, 351.6, 11, 2.2, true);
  // Pale end piers and the change of plane distinguish the long glazed frontage.
  for (const [x, v, w, d] of [
    [91.65, -3.2, 1.9, 3.0],
    [91.8, 46.8, 1.9, 3.8],
    [100.85, 50, 2.0, 4.2],
    [100.85, 120.0, 2.1, 4.2],
    [63.65, 120, 2.5, 4.2],
  ]) {
    m.prism(rect(x - w / 2, v - d / 2, x + w / 2, v + d / 2), m.base, 352.15, '#d2d2c5', '#d7d7cc');
  }
  m.prism(rect(57.1, 48.7, 62.5, 62.7), 352.05, 358.9, '#9fa8a4', '#b5bcb3');
  bridge(m, 40.9, 53.7, 6.6, 14, 350.35);
  bridge(m, 38.8, 55.65, 21.9, 26, 347.3);
}
export function createFultonCourthouse(buildings: VBuilding[], grid: GroundGrid) {
  const m = landmarkShell(
    buildings,
    grid,
    site,
    'Fulton County Courthouse',
    [62.91, 299.84],
    [34.32, 22.47],
    [
      [3, 3],
      [37, 60],
      [62, 10],
      [98, 118],
    ],
  );
  if (!m) return null;
  slaton(m);
  justiceTower(m);
  return m.finish('#f1ce91');
}
