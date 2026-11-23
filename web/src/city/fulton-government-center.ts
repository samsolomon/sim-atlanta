import { CanvasTexture, Group, Mesh, MeshLambertMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
const mainId = '8ce87973-e33f-4f88-aa5d-2d557abf5bc5';
const mitchellId = '4f4d729c-a11b-48de-937e-93af0c7916ec';
const stone = '#d3cdc2',
  granite = '#9a8a7c',
  metal = '#96aba9',
  frame = '#e0dfd2';
const officeGlass = ['#485b66', '#465761', '#586976', '#62717b'];
const atriumGlass = ['#819c99', '#8ca8a3', '#74918d', '#98aaa0'];
const axis: P2 = [Math.cos((33.6 * Math.PI) / 180), Math.sin((33.6 * Math.PI) / 180)];
function rect(l: number, n: number, r: number, s: number): P2[] {
  return [
    [l, n],
    [r, n],
    [r, s],
    [l, s],
  ];
}
function windows(
  m: Shell,
  plan: P2[],
  lo: number,
  hi: number,
  rows: number,
  bay: number,
  fill: number,
  height: number,
  glass = officeGlass,
) {
  plan.forEach((a, i) => m.facade(a, plan[(i + 1) % plan.length], lo, hi, rows, bay, fill, height, glass, 0.085));
}

// The pitched bays repeat in both street directions. Roof and end faces share a single profile.
function gable(
  m: Shell,
  alongU: boolean,
  start: number,
  end: number,
  left: number,
  right: number,
  eave: number,
  peak: number,
  roof: string,
  endColor: string,
  flat = 0,
) {
  const mid = (left + right) / 2;
  const point = (s: number, t: number, y: number) => (alongU ? [s, y, t] : [t, y, s]);
  const profile = [
    [left, eave],
    [mid - flat, peak],
    [mid + flat, peak],
    [right, eave],
  ];
  for (let i = 1; i < 4; i++) {
    const [a, y] = profile[i - 1],
      [b, Y] = profile[i];
    if (a !== b) m.body.quad(point(start, a, y), point(end, a, y), point(end, b, Y), point(start, b, Y), roof);
  }
  for (const s of [start, end]) {
    m.body.tri(point(s, left, eave), point(s, mid - flat, peak), point(s, right, eave), endColor);
    if (flat) m.body.tri(point(s, mid - flat, peak), point(s, mid + flat, peak), point(s, right, eave), endColor);
  }
}

function officeTower(m: Shell) {
  const lower = rect(-78.6, -38.0, 9.8, -18);
  m.prism(lower, m.base, 324.4, granite, stone);
  windows(m, lower, 313, 324.3, 2, 5.45, 0.66, 0.74);
  for (let x = -78.6; x < 9.7; x += 5.5) {
    m.prism(rect(x, -40.8, x + 0.92, -38), m.base, 324.4, granite, stone);
  }
  m.body.box(88.4, 0.25, 2.85, -34.4, 324.42, -39.4, stone);
  const upper = rect(-78.6, -40.8, 9.8, -17.7);
  m.prism(upper, 324.4, 351.75, stone, stone);
  windows(m, upper, 324.6, 351.55, 7, 4.85, 0.94, 0.9);
  for (let u = -78.5; u < 10; u += 9.8) m.body.box(0.38, 27.8, 0.3, u, 338.0, -40.85, stone);
  // Punched stone frame on the plaza side, with the projecting band of dark glass at its east end.
  const court = rect(-69.9, -23, -13, -10.7);
  m.prism(court, 321.4, 356.1, stone, stone);
  windows(m, court, 322, 355.85, 8, 5.65, 0.71, 0.64);
  const bay = rect(-13.0, -22, 8.8, -15.1);
  m.prism(bay, 323.25, 352.1, '#586672', metal);
  windows(m, bay, 324.4, 351.75, 8, 2.6, 0.98, 0.87);
  m.prism(rect(-79, -37.7, 10.2, -20.5), 351.7, 357.9, stone, metal);
  gable(m, true, -83.5, 13.8, -37.5, -20.6, 357.9, 366.25, '#8aa5a4', stone);
  for (const end of [-83.5, 10.0]) {
    const cap = rect(end, -37.6, end + 3.8, -20.6);
    m.prism(cap, m.base, 357.91, stone, stone);
    windows(m, cap, 316, 356.9, 10, 4, 0.58, 0.56);
    const x = end < 0 ? end - 0.08 : end + 3.88;
    for (let i = 0; i < 3; i++) {
      const y = 324.5 + i * 10.6;
      const projected = rect(x - (end < 0 ? 1.0 : 0), -33.9, x + (end < 0 ? 0 : 1.0), -24.35);
      m.prism(projected, y, y + 10.0, '#485963', '#596d74');
      windows(m, projected, y + 0.3, y + 9.85, 3, 2.5, 0.95, 0.87);
    }
    const opening = (z: number, y: number, w: number, h: number) =>
      m.body.quad([x, y, z], [x, y + h, z], [x, y + h, z + w], [x, y, z + w], '#535d61');
    opening(-29.8, 360.0, 1.75, 2.7);
    for (const z of [-33, -30.5, -28, -25.5]) opening(z, 358.25, 1.05, 0.88);
  }
}

function atrium(m: Shell) {
  const l = -70,
    r = -12.95,
    n = -10.83,
    s = 26.1;
  const plan: P2[] = [
    [l, n],
    [r, n],
    [r, s],
    [-50.1, s],
    [-50.1, 8],
    [l, 8],
  ];
  m.prism(plan, m.base, 318.9, granite, stone);
  windows(m, plan, 315.25, 318.72, 1, 4.5, 0.69, 0.76);
  m.prism(plan, 318.9, 334.6, '#c6cdbe', metal);
  windows(m, plan, 318.95, 334.5, 5, 2.35, 0.95, 0.95, atriumGlass);
  // Warm light is visible below the atrium glass in the county's evening photograph.
  for (let i = 0; i < 6; i++) {
    const z = n + 3.65 + i * 5.55;
    m.body.box(0.23, 0.42, 0.53, r + 0.09, 318.15, z, '#857c6c');
    m.lights.quad(
      [r + 0.22, 317.99, z - 0.19],
      [r + 0.22, 318.32, z - 0.19],
      [r + 0.22, 318.32, z + 0.19],
      [r + 0.22, 317.99, z + 0.19],
      '#eddbac',
    );
  }
  const pitch = (s - n) / 4;
  for (let i = 0; i < 4; i++) {
    const a = n + i * pitch,
      b = a + pitch,
      mid = (a + b) / 2;
    const back = i < 2 ? l : -50.1;
    gable(m, true, back, r, a, b, 334.6, 339.4, '#afbfbd', '#8ca9a3');
    for (const x of [r + 0.1, back - 0.1]) {
      const strip = (a: number, A: number, b: number, B: number, width: number, color: string) =>
        m.body.quad([x, A, a - width], [x, B, b - width], [x, B, b + width], [x, A, a + width], color);
      for (const z of [a, mid, b]) m.body.box(0.24, z === mid ? 20.4 : 15.8, 0.22, x, z === mid ? 329.1 : 326.8, z, frame);
      strip(a, 334.56, mid, 339.42, 0.15, frame);
      strip(mid, 339.42, b, 334.56, 0.15, frame);
      strip(a, 334.58, mid, 337.44, 0.11, frame);
      strip(mid, 337.44, b, 334.58, 0.11, frame);
      strip(a, 331.65, mid, 334.6, 0.075, frame);
      strip(mid, 334.6, b, 331.65, 0.075, frame);
    }
    for (let u = back + 4; u < r; u += 5.45) gable(m, true, u, u + 0.105, a, b, 334.64, 339.44, frame, frame);
  }
}

function lowWing(
  m: Shell,
  alongU: boolean,
  start: number,
  end: number,
  left: number,
  right: number,
  count: number,
  eave: number,
  peak: number,
  arcade = false,
) {
  const plan = alongU ? rect(start, left, end, right) : rect(left, start, right, end);
  const middle = eave - 7.15;
  const basePlan = arcade ? rect(left, start, right - 3.7, end) : plan;
  m.prism(basePlan, m.base, middle, granite, stone);
  windows(m, basePlan, middle - 5.45, middle - 0.24, 1, 6.1, 0.41, 0.52);
  if (arcade) {
    for (let z = start + 0.1; z < end; z += 5.2)
      m.prism(rect(right - 1.12, z, right, z + 0.93), m.base, middle + 0.1, granite, stone);
    m.body.quad(
      [right - 3.7, middle, start],
      [right, middle, start],
      [right, middle, end],
      [right - 3.7, middle, end],
      stone,
    );
  }
  m.prism(plan, middle, eave, stone, stone);
  windows(m, plan, middle + 0.15, eave - 0.18, 2, 3.4, 0.66, 0.81);
  for (let i = 0; i < count; i++) {
    const a = left + ((right - left) * i) / count,
      b = left + ((right - left) * (i + 1)) / count;
    gable(m, alongU, start, end, a, b, eave, peak, metal, stone, 1.15);
    const z = (a + b) / 2,
      y = eave + 1.3;
    for (const p of [start - 0.035, end + 0.035]) {
      const at = (a: number, b: number) => (alongU ? [p, b, a] : [a, b, p]);
      m.body.quad(at(z - 1.02, y), at(z, y + 1.05), at(z + 1.02, y), at(z, y - 1.05), '#54616a');
    }
  }
}

function southBuildings(m: Shell, south: Shell) {
  lowWing(m, false, 8.3, 37.2, -78, -50.1, 3, 331.95, 335.5);
  lowWing(m, false, 26.1, 54.1, -46.2, -18.25, 3, 328.1, 331.48);
  lowWing(m, false, 26.15, 77.1, -13.85, 14.05, 3, 324.12, 327.55);
  lowWing(m, false, 39, 77.1, 14.05, 23.1, 1, 324.12, 327.55, true);
  // The rounded wall opens onto the plaza between the assembly wing and the atrium.
  const arc: P2[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI + (i * Math.PI) / 12;
    arc.push([-0.22 + 10.38 * Math.cos(a), 26.15 + 10.38 * Math.sin(a)]);
  }
  m.prism(arc, m.base, 321.92, '#bdbaac', '#b1b59f');
  lowWing(south, true, -77.85, -50.35, 58.5, 85.5, 3, 328.15, 331.4);
  lowWing(south, false, 58.1, 85.7, -46.35, -27.35, 2, 328.15, 331.4);
  lowWing(south, false, 67.1, 85.7, -27.35, -18.1, 1, 328.15, 331.4);
  south.prism(rect(-50.35, 59.0, -46.35, 85.15), south.base, 328.17, stone, '#b6b6a9');
}

function plaza(m: Shell, grid: GroundGrid) {
  // Street-facing steps climb from the brick pavement to the glazed public entrance.
  const terrace = (l: number, r: number, top: number) => m.prism(rect(l, -10.75, r, 16.2), m.base, top, granite, '#bda895');
  terrace(-13.1, 5.0, 315.58);
  for (let i = 0; i < 5; i++) terrace(5 + i * 0.6, 5.6 + i * 0.6, 315.58 - 0.17 * (i + 1));
  terrace(8, 13.0, 314.73);
  for (let i = 0; i < 8; i++) terrace(13 + i * 0.6, 13.6 + i * 0.6, 314.73 - 0.17 * (i + 1));
  // The curb follows the sloping Pryor sidewalk. Join the lower stair to that grade.
  const grade = (u: number, v: number) =>
    grid.sample(axis[0] * u - axis[1] * v, 300 + axis[1] * u + axis[0] * v) ?? m.base + 0.35;
  for (let u = 17.8; u < 27; u += 2) {
    const U = Math.min(27, u + 2);
    for (let v = -17.5; v < 21; v += 2) {
      const V = Math.min(21, v + 2);
      const point = (x: number, z: number) => [x, Math.max(grade(x, z) + 0.1, 313.37 - 0.125 * (x - 17.8)), z];
      m.body.quad(point(u, v), point(U, v), point(U, V), point(u, V), '#b49883');
    }
  }
  for (const z of [-7.3, 11.6]) {
    for (const [u, U, lo, hi] of [
      [5, 8, 315.58, 314.73],
      [13, 17.8, 314.73, 313.37],
    ]) {
      for (const x of [u, (u + U) / 2, U]) {
        const y = lo + ((hi - lo) * (x - u)) / (U - u);
        m.body.box(0.09, 0.95, 0.09, x, y + 0.475, z, '#615e54');
      }
      m.body.quad([u, lo + 0.9, z], [u, lo + 1.0, z], [U, hi + 1.0, z], [U, hi + 0.9, z], '#686760');
    }
  }
  // Open granite portico. The gabled entrance sign faces Pryor.
  for (const z of [-17.15, -11.4]) {
    for (let x = -12.3; x < 24; x += 6.9) m.prism(rect(x, z, x + 1.12, z + 0.96), m.base, 320.35, granite, stone);
    m.prism(rect(-12.6, z, 24.15, z + 0.94), 319.65, 321, granite, stone);
  }
  gable(m, true, -12.45, 24.13, -17.32, -10.5, 321, 324.3, '#a4bab5', frame);
  for (let x = -12; x < 24; x += 3) gable(m, true, x, x + 0.13, -17.32, -10.5, 321.06, 324.36, frame, frame);
  // The light metal web is visible at the sides of the covered approach.
  for (const z of [-17.2, -10.57])
    for (let x = -12.35; x < 22; x += 3.0) {
      m.body.quad([x, 320.92, z], [x + 0.2, 320.92, z], [x + 1.59, 319.69, z], [x + 1.38, 319.69, z], frame);
      m.body.quad([x + 1.38, 319.69, z], [x + 1.6, 319.69, z], [x + 3.04, 320.92, z], [x + 2.81, 320.92, z], frame);
    }
  for (const z of [-17.3, -11.4]) m.prism(rect(22.45, z, 24.18, z + 1.05), m.base, 321.1, granite, stone);
  m.body.box(0.18, 1.02, 6.2, 24.2, 320.46, -13.88, '#4e5455');
}

function bridge(m: Shell) {
  // The glass span crosses Pryor to the Justice Center at the existing courthouse block.
  const pier = rect(15.0, 28.75, 23.1, 37.2);
  m.prism(pier, m.base, 328.2, stone, stone);
  windows(m, pier, 316.8, 327.5, 2, 2.3, 0.57, 0.79);
  gable(m, true, 15, 23.1, 28.75, 37.2, 328.2, 332.15, metal, stone);
  const span = rect(23.0, 30.22, 53.14, 35.73);
  m.prism(span, 318.0, 319.04, granite, stone);
  m.body.quad([23, 318, 30.22], [53.14, 318, 30.22], [53.14, 318, 35.73], [23, 318, 35.73], '#b9ae9c');
  m.prism(span, 319.04, 323.31, '#9b9f97', metal);
  windows(m, span, 319.1, 323.29, 1, 2.13, 0.94, 0.98);
  gable(m, true, 23, 53.14, 30.22, 35.73, 323.31, 324.04, metal, metal);
}

function countySeal(m: Shell, point: (u: number, y: number) => number[], radius: number) {
  for (let i = 0; i < 28; i++) {
    const a = (i * Math.PI) / 14,
      b = ((i + 1) * Math.PI) / 14;
    const p = (angle: number, r: number) => point(Math.cos(angle) * r, Math.sin(angle) * r);
    m.body.quad(p(a, radius), p(b, radius), p(b, radius * 0.89), p(a, radius * 0.89), frame);
  }
  const tree = [
    [-0.11, -0.59],
    [0.11, -0.59],
    [0.11, -0.23],
    [0.42, -0.14],
    [0.6, 0.07],
    [0.44, 0.13],
    [0.46, 0.31],
    [0.27, 0.34],
    [0.16, 0.53],
    [0, 0.46],
    [-0.22, 0.55],
    [-0.3, 0.37],
    [-0.52, 0.31],
    [-0.48, 0.15],
    [-0.61, 0.07],
    [-0.44, -0.14],
    [-0.12, -0.23],
  ];
  for (let i = 0; i < tree.length; i++) {
    const [x, y] = tree[i],
      [X, Y] = tree[(i + 1) % tree.length];
    m.body.tri(point(0, -0.15 * radius), point(x * radius, y * radius), point(X * radius, Y * radius), frame);
  }
}
function lettering(
  group: Group,
  text: string,
  width: number,
  height: number,
  x: number,
  y: number,
  z: number,
  rotation: number,
) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.font = 'bold 77px Arial';
  ctx.fillStyle = '#f4f0e7';
  ctx.textAlign = 'center';
  ctx.fillText(text, 512, 78, 1005);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  const mat = new MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false });
  mat.addEventListener('dispose', () => tex.dispose());
  const face = new Mesh(new PlaneGeometry(width, height), mat);
  face.position.set(x, y, z);
  face.rotation.y = rotation;
  group.add(face);
}
export function createFultonGovernmentCenter(buildings: VBuilding[], grid: GroundGrid) {
  const m = landmarkShell(buildings, grid, mainId, 'Fulton County Government Center', [0, 300], axis, [
    [-32, -29],
    [-42, 1],
    [5, 61],
  ]);
  const south = landmarkShell(buildings, grid, mitchellId, 'Government Center · Mitchell wing', [0, 300], axis, [
    [-66, 71],
    [-32, 79],
    [-22, 77],
  ]);
  if (!m || !south) return null;
  officeTower(m);
  atrium(m);
  southBuildings(m, south);
  plaza(m, grid);
  bridge(m);
  countySeal(m, (x, y) => [32.1 + x, 321.19 + y, 35.845], 1.46);
  countySeal(m, (t, y) => [24.27, 322.03 + y, -13.88 + t], 1.05);
  const main = m.finish('#e7d5ac'),
    wing = south.finish('#e7d5ac');
  const group = new Group();
  group.name = 'Fulton County Government Center';
  group.add(main.group, wing.group);
  lettering(main.group, 'GOVERNMENT CENTER', 6.15, 0.89, 24.31, 320.45, -13.87, Math.PI / 2);
  lettering(main.group, 'FULTON', 9.9, 1.62, 38, 322.18, 35.82, 0);
  lettering(main.group, 'COUNTY', 9.95, 1.62, 38, 320.72, 35.82, 0);
  return {
    group,
    buildings: main.buildings.filter((b) => b.id !== mitchellId),
    setNight(night: number) {
      main.setNight(night);
      wing.setNight(night);
    },
  };
}
