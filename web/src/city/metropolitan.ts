import type { GroundGrid } from '../terrain/grid';
import { rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
const stone = '#c5beae',
  metal = '#686c6d',
  frame = '#aaada8';
const mainRoof = 386.2,
  shaftBase = 334.8;

function elevation(m: Shell, a: P2, b: P2) {
  const width = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const dx = (b[0] - a[0]) / width,
    dz = (b[1] - a[1]) / width;
  function plan(x: number, d: number): P2 {
    return [a[0] + dx * x + dz * d, a[1] + dz * x - dx * d];
  }
  function point(x: number, y: number, d: number) {
    const [u, v] = plan(x, d);
    return [u, y, v];
  }
  function panel(l: number, r: number, lo: number, hi: number, d: number, color: string, lit = false) {
    (lit ? m.lights : m.body).quad(point(l, lo, d), point(l, hi, d), point(r, hi, d), point(r, lo, d), color);
  }
  function strip(l: number, r: number, lo: number, hi: number, back: number, front: number, color: string) {
    m.prism([plan(l, back), plan(r, back), plan(r, front), plan(l, front)], lo, hi, color, color);
    m.body.quad(point(l, lo, back), point(r, lo, back), point(r, lo, front), point(l, lo, front), color);
  }
  return { width, plan, point, panel, strip };
}
type Face = ReturnType<typeof elevation>;

function towerFace(f: Face, bays: number) {
  const pitch = (f.width - 1.05) / bays;
  const random = rng(bays * 71);
  // The light aluminum uprights divide the graphite spandrels into continuous vertical ribbons.
  for (let i = 0; i < bays; i++) {
    const l = 0.52 + i * pitch,
      r = l + pitch;
    f.strip(l - 0.065, l + 0.065, shaftBase, 387, -0.05, 0.14, frame);
    for (let j = 0; j < 13; j++) {
      const sill = shaftBase + 1.25 + (j * (mainRoof - shaftBase)) / 13;
      const split = (l + r) / 2;
      for (const [x, X] of [
        [l + 0.19, split - 0.055],
        [split + 0.055, r - 0.19],
      ]) {
        const tint = random();
        f.panel(
          x,
          X,
          sill,
          sill + 2.12,
          0.025,
          tint < 0.34 ? '#586365' : tint < 0.69 ? '#434e50' : '#818788',
          random() < 0.13,
        );
        f.panel(x, X, sill + 0.62, sill + 0.675, 0.04, '#858a85');
      }
    }
  }
  f.strip(f.width - 0.595, f.width - 0.465, shaftBase, 387, -0.05, 0.14, frame);
  f.strip(0, f.width, 386.68, 387.04, -0.12, 0.11, '#777b79');
}

function podium(f: Face, marietta: boolean, base: number) {
  const { width: w, panel, strip } = f;
  // Recessed shopfronts under a stone beam. Clipped opening corners show the depth of the facing.
  const n = marietta ? 5 : 7,
    pitch = w / n;
  for (let i = 0; i < n; i++) {
    const l = i * pitch + 0.3,
      r = (i + 1) * pitch - 0.3,
      head = 324.5;
    strip(i * pitch, l, base, head + 0.26, -0.72, 0.23, stone);
    strip(r, (i + 1) * pitch, base, head + 0.26, -0.72, 0.23, stone);
    panel(l, r, base, head, -0.57, '#535c5a', i === 1 || (!marietta && i === 5));
    panel(l, r, head - 0.78, head - 0.68, -0.53, '#918d7e');
    panel((l + r) / 2 - 0.06, (l + r) / 2 + 0.06, base, head - 0.78, -0.52, '#6b6c65');
    for (const x of [l, r]) {
      const inner = x + (x === l ? 0.28 : -0.28);
      strip(Math.min(x, inner), Math.max(x, inner), head - 0.16, head + 0.15, -0.65, 0.22, stone);
    }
  }
  strip(0, w, 324.48, 332.75, -0.81, 0.22, stone);
  for (let x = 2.35; x < w - 0.15; x += 2.35) panel(x, x + 0.035, 325.4, 332.7, 0.226, '#a9a497');
  for (const y of [325.55, 329.05]) panel(0, w, y, y + 0.046, 0.23, '#a39f92');
  if (marietta) {
    for (const t of [0.46, 0.64, 0.82]) {
      const x = w * t;
      panel(x - 1.05, x + 1.05, 325.9, 332.78, 0.24, '#414646');
      panel(x - 1.05, x + 1.05, 329.05, 329.14, 0.26, '#787d77');
    }
  }
  strip(0, w, 332.72, 334.52, -0.6, 0.1, '#535855');
  for (let x = 0.44; x < w - 0.64; x += 2.7) {
    const edge = Math.min(w - 0.27, x + 2.51);
    panel(x, edge, 332.84, 334.44, 0.12, '#475253');
    strip(x - 0.1, x, 332.72, 334.52, 0.09, 0.2, stone);
  }
  strip(0, w, 334.52, shaftBase, -0.6, 0.32, '#d3ccba');
}

function cornerSign(m: Shell, front: Face, broad: Face) {
  // The square projecting sign has a face for each approach. Both Ms read from the street.
  const sides = [front, broad];
  for (const face of sides) {
    const start = face === front ? -0.64 : face.width - 1.84;
    face.strip(start, start + 2.48, 325.6, 328.18, 0.24, 0.77, '#494744');
    face.panel(start + 0.08, start + 2.4, 325.68, 328.1, 0.78, '#d2cdbb');
    const stroke = (x: number, y: number, X: number, Y: number, w: number) => {
      const p = (t: number, h: number) => face.point(start + t, h, 0.8);
      m.body.quad(p(x, y), p(x + w, y), p(X + w, Y), p(X, Y), '#383833');
    };
    stroke(0.39, 325.99, 0.39, 327.85, 0.105);
    stroke(0.42, 327.85, 1.2, 326.24, 0.17);
    stroke(1.2, 326.24, 1.96, 327.85, 0.105);
    stroke(1.92, 325.99, 1.92, 327.85, 0.18);
    for (const x of [0.43, 2.0]) face.panel(start + x - 0.22, start + x + 0.22, 325.93, 326.02, 0.81, '#383833');
  }
}

export function createMetropolitan(buildings: VBuilding[], grid: GroundGrid) {
  const m = landmarkShell(
    buildings,
    grid,
    'ae833b60-6228-4d0e-8098-ccec8a81c2f8',
    'The Metropolitan',
    [91.55, -96.11],
    [13.75, 15.87],
    [
      [2, 2],
      [19, 2],
      [3, 28],
      [24, 25],
    ],
  );
  if (!m || m.ring.length !== 6) return null;
  const expected: P2[] = [
    [0, 0],
    [21, 0],
    [26.91, 26.11],
    [3.82, 31.03],
    [1.38, 31.55],
    [0.6, 13.86],
  ];
  const [corner, east, rear, jog, west, mid] = expected.map(([u, v]) =>
    m.ring.find(([x, z]) => Math.hypot(x - u, z - v) < 0.7),
  );
  if (!corner || !east || !rear || !jog || !west || !mid) return null;
  const atV = (a: P2, b: P2, v: number): P2 => [a[0] + ((b[0] - a[0]) * (v - a[1])) / (b[1] - a[1]), v];
  const eastCut = atV(east, rear, 20.1),
    rearCut: P2 = [14.4, jog[1] + ((rear[1] - jog[1]) * (14.4 - jog[0])) / (rear[0] - jog[0])];
  const inner: P2 = [14.4, 20.1];
  const shaft = [corner, east, eastCut, inner, rearCut, jog, west, mid];
  m.prism([inner, eastCut, rear, rearCut], m.base, 342.0, '#908b7f', '#aaa496');
  const podiumCore: P2[] = shaft.map(([x, z]) => [x + (11 - x) * 0.08, z + (17 - z) * 0.062]);
  m.prism(podiumCore, m.base, shaftBase, '#696863', '#bbb6a8');
  m.prism(shaft, shaftBase, mainRoof, metal, '#a2a39c');
  for (let i = 0; i < shaft.length; i++) {
    const rim = elevation(m, shaft[i], shaft[(i + 1) % shaft.length]);
    rim.strip(0, rim.width, mainRoof, 387.0, -0.23, 0, '#767975');
  }
  const front = elevation(m, corner, east),
    broad = elevation(m, west, corner);
  podium(front, true, m.base);
  podium(broad, false, m.base);
  towerFace(front, 5);
  towerFace(broad, 8);
  for (const [a, b] of [
    [east, eastCut],
    [eastCut, inner],
    [inner, rearCut],
    [rearCut, jog],
    [jog, west],
  ]) {
    m.facade(a, b, 345, 385.8, 11, 3.15, 0.51, 0.57, ['#4d5150', '#525a59'], 0.08);
  }
  cornerSign(m, front, broad);
  // Two different mechanical levels and a narrow raised cover interrupt the main roof.
  const rect = (x: number, z: number, X: number, Z: number): P2[] => [
    [x, z],
    [X, z],
    [X, Z],
    [x, Z],
  ];
  m.prism(rect(9.35, 4.5, 17.5, 13.5), mainRoof, 388.15, '#92928a', '#aaa99e');
  m.prism(rect(11.1, 9.45, 15.8, 11.55), 388.15, 392.55, '#898c88', '#aaa99e');
  m.prism([[17.35, 3.8], atV(east, rear, 3.8), eastCut, [17.35, 20.1]], mainRoof, 388.5, '#898c86', '#b0afa3');
  m.prism(
    [[17.6, 4.05], atV(east, rear, 4.05), atV(east, rear, 16.55), [17.6, 16.55]],
    388.5,
    391.9,
    '#9b9b91',
    '#b5b5aa',
  );
  return m.finish('#efd9ac');
}
