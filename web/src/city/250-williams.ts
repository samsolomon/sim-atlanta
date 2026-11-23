import { Color, CylinderGeometry } from 'three';
import type { GroundGrid } from '../terrain/grid';
import type { Builder, P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

const id = 'b13d3a92-ab62-4c26-812f-543d3597f3dc';
const width = 117.1,
  depth = 123.1,
  roofY = 351.22,
  cornerY = 346.85,
  soffit = 318.75;
const rim = '#d8d2c3',
  concrete = '#aca99d',
  gravel = '#b1ada2';
type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
type Side = 'park' | 'williams' | 'baker' | 'portman';
const sides: Side[] = ['baker', 'williams', 'portman', 'park'];
const length = (side: Side) => (side === 'park' || side === 'williams' ? depth : width);
// Walk clockwise in plan. Positive offset always points into the building.
function point(side: Side, along: number, y: number, inset: number) {
  switch (side) {
    case 'baker':
      return [along, y, inset];
    case 'williams':
      return [width - inset, y, along];
    case 'portman':
      return [width - along, y, depth - inset];
    case 'park':
      return [inset, y, depth - along];
  }
}
function face(batch: Builder, side: Side, a: number, b: number, lo: number, hi: number, inset: number, color: string) {
  batch.quad(
    point(side, a, lo, inset),
    point(side, a, hi, inset),
    point(side, b, hi, inset),
    point(side, b, lo, inset),
    color,
  );
}
function shelf(m: Shell, side: Side, a: number, b: number, outer: number, inner: number, top: number, thick: number) {
  const p = (s: number, y: number, d: number) => point(side, s, y, d);
  face(m.body, side, a, b, top - thick, top, outer, concrete);
  for (const y of [top, top - thick])
    m.body.quad(p(a, y, outer), p(b, y, outer), p(b, y, inner), p(a, y, inner), y === top ? rim : '#b1aa98');
  for (const s of [a, b])
    m.body.quad(p(s, top, outer), p(s, top, inner), p(s, top - thick, inner), p(s, top - thick, outer), concrete);
}
function column(m: Shell, x: number, z: number, lo: number, hi: number, r: number) {
  const geo = new CylinderGeometry(r, r, hi - lo, 10, 1);
  geo.translate(x, (lo + hi) / 2, z);
  m.body.addGeometry(geo, '#d0cabe');
  geo.dispose();
}

// Tones follow the broad sky, trees and blocks reflected in each elevation. At night
// entire short runs of panes share a lit room, as in the dated street photograph.
function glassTints(low: string, high: string) {
  const dark = new Color(low),
    sky = new Color(high);
  return Array.from(
    { length: 48 },
    (_, i) =>
      '#' +
      dark
        .clone()
        .lerp(sky, i / 47)
        .getHexString(),
  );
}
const blue = glassTints('#708b92', '#b5d0d4');
const shaded = glassTints('#607d84', '#a3babe');
const nightRuns = [
  [1, 3, 11],
  [1, 20, 27],
  [3, 10, 24],
  [5, 29, 36],
  [6, 3, 15],
  [6, 22, 27],
];
function glazing(m: Shell, side: Side, a: number, b: number, lo: number, hi: number, inset: number) {
  const bays = Math.round((b - a) / 1.65),
    rows = Math.max(1, Math.round((hi - lo) / 1.43));
  const palette = side === 'park' || side === 'portman' ? blue : shaded;
  const phase = { park: 2, baker: 7, portman: 4, williams: 12 }[side];
  face(m.body, side, a, b, lo, hi, inset, '#afbab8');
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < bays; i++) {
      const l = a + ((b - a) * i) / bays,
        r = a + ((b - a) * (i + 1)) / bays;
      const floor = lo + ((hi - lo) * j) / rows,
        top = lo + ((hi - lo) * (j + 1)) / rows;
      const u = (l + r) / 2,
        y = (top + floor) / 2;
      const skyline = 327 + 2.7 * Math.sin(phase + u * 0.063) + ((u > 29 && u < 44) || (u > 83 && u < 96) ? 4.2 : 0);
      const sky = Math.min(1, Math.max(0, (y - skyline + 4) / 12));
      const cloud = Math.sin(u * 0.043 + phase + (y - 320) * 0.16);
      const tone = Math.round(47 * (0.19 + 0.48 * sky + 0.18 * cloud + 0.045 * Math.cos(0.31 * u)));
      const story = Math.floor((y - 318.7) / 4.32),
        room = (Math.floor((u + phase) / 2.7) + phase) % 46;
      const lit =
        y - 318.7 - story * 4.32 < 2.85 && nightRuns.some(([s, start, end]) => s === story && room >= start && room < end);
      face(lit ? m.lights : m.body, side, l + 0.044, r - 0.044, floor + 0.035, top - 0.035, inset - 0.039, palette[tone]);
    }
}
function terrace(m: Shell, side: Side, a: number, b: number) {
  // A full-height opening between the lower glass belt and offices overlooks the park.
  const top = 325.55,
    floor = 319.55;
  glazing(m, side, a, b, floor, top, 5.3);
  shelf(m, side, a, b, 0, 5.4, floor, 0.48);
  shelf(m, side, a, b, 0, 5.4, top, 0.43);
  for (const u of [a, b])
    m.body.quad(
      point(side, u, floor, 0.02),
      point(side, u, top, 0.02),
      point(side, u, top, 5.3),
      point(side, u, floor, 5.3),
      concrete,
    );
  for (let u = a + 4.4; u < b - 1; u += 8.5) {
    const [x, , z] = point(side, u, 0, 2.2);
    column(m, x, z, floor, top - 0.43, 0.4);
  }
  for (const y of [floor + 0.36, floor + 0.78, floor + 1.06]) face(m.body, side, a, b, y, y + 0.075, 0.13, '#839094');
  for (let u = a + 0.14; u < b; u += 1.55) face(m.body, side, u, u + 0.055, floor, floor + 1.1, 0.13, '#85918f');
}
function curtain(m: Shell, side: Side) {
  const span = length(side),
    a = span / 2 - 18.7,
    b = span / 2 + 18.7;
  // The corners terminate one storey below the main roof. Narrow returns make the step visible edge-on.
  const limits = [0, 19.45, a, b, span - 19.45, span];
  for (let i = 0; i < limits.length - 1; i++) {
    const l = limits[i],
      r = limits[i + 1],
      recessed = side === 'park' && i === 2;
    glazing(m, side, l, r, recessed ? 325.55 : soffit, i === 0 || i === 4 ? cornerY : roofY, 0);
  }
  if (side === 'park') terrace(m, side, a, b);
  shelf(m, side, 0, a, 0, 6, soffit, 0.58);
  shelf(m, side, b, span, 0, 6, soffit, 0.58);
  if (side !== 'park') shelf(m, side, a, b, 0, 6, soffit, 0.58);
  for (const [l, r, hi] of [
    [0, 19.45, cornerY],
    [19.45, span - 19.45, roofY],
    [span - 19.45, span, cornerY],
  ]) {
    shelf(m, side, l, r, -0.04, 0.48, hi + 0.85, 0.85);
  }
}
// Narrow perimeter offsets around the four roof notches, traced from the county aerial.
function crown(m: Shell) {
  const step: P2[] = [
    [0, 19.45],
    [1.8, 19.45],
    [1.8, 8],
    [8, 8],
    [8, 1.8],
    [19.45, 1.8],
    [19.45, 0],
  ];
  const plan: P2[] = [
    ...step,
    ...step
      .slice()
      .reverse()
      .map(([x, z]): P2 => [width - x, z]),
    ...step.map(([x, z]): P2 => [width - x, depth - z]),
    ...step
      .slice()
      .reverse()
      .map(([x, z]): P2 => [x, depth - z]),
  ];
  m.prism(plan, cornerY, roofY, '#66858a', gravel);
  for (const [dx, dz] of [
    [0, 0],
    [width, 0],
    [width, depth],
    [0, depth],
  ]) {
    const corner = (x: number, z: number): P2 => [dx === 0 ? x : dx - x, dz === 0 ? z : dz - z];
    const ledge = [corner(0, 0), ...step.map(([x, z]) => corner(x, z))];
    m.prism(ledge, cornerY - 0.28, cornerY, '#b1afa5', gravel);
  }
}
function podium(m: Shell, side: Side) {
  const span = length(side),
    end = span - 3,
    west = side === 'park',
    east = side === 'williams';
  const lower = west ? 311.55 : 312.8;
  face(m.body, side, 3, end, lower, soffit, 5.4, '#a9afa8');
  if (west) {
    face(m.body, side, 3, end, m.base, lower, 4.8, '#a6ada8');
    for (let s = 14; s < end - 10; s += 1.12) {
      face(m.body, side, s, s + 0.13, m.base, lower - 0.3, 4.67, '#798789');
    }
  } else if (!east) {
    const a = span * 0.33,
      b = span * 0.67;
    face(m.body, side, 3, a, m.base, lower, 5.4, '#adb1a8');
    face(m.body, side, b, end, m.base, lower, 5.4, '#adb1a8');
    for (const u of [a, b])
      m.body.quad(
        point(side, u, m.base, 5.4),
        point(side, u, lower, 5.4),
        point(side, u, lower, 9.2),
        point(side, u, m.base, 9.2),
        concrete,
      );
    shelf(m, side, a, b, 5.4, 9.2, lower, 0.28);
  }
  // Park-grade glazing sits above the lower pavement. On Williams it meets the sidewalk.
  const sill = east ? 310.85 : lower + 0.15;
  for (let s = 3; s < end; s += 2.4) {
    face(m.body, side, s, Math.min(end, s + 2.31), sill, soffit - 0.64, 5.31, '#49666b');
    if ((s > span * 0.35 && s < span * 0.7) || Math.floor(s / 9) % 4 === 0) {
      face(m.lights, side, s + 0.08, Math.min(end, s + 2.2), sill + 0.35, soffit - 1.12, 5.25, '#809c9d');
    }
    face(m.body, side, s, Math.min(end, s + 2.3), sill + 2.7, sill + 2.79, 5.2, '#788987');
  }
  if (east) {
    // Solid stone bays interrupt the glazing on the Williams Street drop-off.
    for (const mid of [span * 0.39, span * 0.62]) {
      face(m.body, side, mid - 4.2, mid + 4.2, m.base, 316.3, 4.75, '#c8c4b4');
      shelf(m, side, mid - 4.2, mid + 4.2, 4.75, 5.45, 316.3, 0.12);
    }
    for (const mid of [span * 0.28, span * 0.73]) {
      for (let i = 0; i < 4; i++) {
        const a = mid - 2.55 + i * 1.28;
        face(m.body, side, a, a + 1.23, 310.93, 313.6, 5.13, '#bdc9c5');
        face(m.lights, side, a + 0.074, a + 1.15, 311.05, 313.49, 5.09, '#657d79');
        face(m.body, side, a + 0.92, a + 0.97, 311.8, 312.38, 5.05, '#ddd9c7');
      }
    }
  }
  for (let s = 4.2; s < span; s += 9.75) {
    const [x, , z] = point(side, s, 0, 2.35);
    column(m, x, z, m.base, soffit - 0.48, 0.55);
  }
  if (west || east) {
    const a = west ? 8 : span * 0.25,
      b = west ? span - 8 : span * 0.78,
      top = east ? 316.95 : lower;
    shelf(m, side, a, b, -0.9, 5.4, top, 0.55);
    // Broad, visibly coffered drop-off canopy.
    for (let s = a + 1; s < b; s += 3.15) shelf(m, side, s, s + 0.29, -0.8, 5.15, top - 0.52, 0.28);
  } else {
    // Open concrete fins frame the central street recesses on Baker and Portman.
    const a = span * 0.33,
      b = span * 0.67;
    face(m.body, side, a, b, lower - 0.65, lower, -0.15, concrete);
    for (let s = a; s < b; s += 2.45) shelf(m, side, s, s + 0.37, -0.15, 5.35, lower, 0.63);
    for (const u of [a + 1, a + 10, b - 10, b - 1]) {
      face(m.body, side, u, u + 7.2, m.base + 0.15, lower - 1.05, 9.15, '#444d4b');
    }
  }
}
function ridge(m: Shell, cx: number, cz: number, long: number, half: number, alongZ: boolean, crest: number) {
  const vert = (v: number, u: number, y: number) => (alongZ ? [cx + u, y, cz + v] : [cx + v, y, cz + u]);
  const eave = 351.58;
  for (const sign of [-1, 1]) {
    const surface = (v: number, u: number, raise = 0) => vert(v, sign * u, crest + ((eave - crest) * u) / half + raise);
    m.body.quad(surface(-long / 2, 0), surface(-long / 2, half), surface(long / 2, half), surface(long / 2, 0), '#536a71');
    for (let v = -long / 2; v < long / 2 - 0.12; v += 2.1) {
      m.body.quad(
        surface(v, 0, 0.04),
        surface(v, half, 0.04),
        surface(v + 0.11, half, 0.04),
        surface(v + 0.11, 0, 0.04),
        '#b3c1be',
      );
    }
    for (const f of [0.35, 0.7])
      m.body.quad(
        surface(-long / 2, half * f, 0.03),
        surface(-long / 2, half * f + 0.085, 0.03),
        surface(long / 2, half * f + 0.085, 0.03),
        surface(long / 2, half * f, 0.03),
        '#849796',
      );
    for (const v of [-long / 2, long / 2])
      m.body.tri(vert(v, 0, crest), vert(v, 0, eave), vert(v, sign * half, eave), '#809394');
  }
}
function rooflights(m: Shell) {
  ridge(m, 58.5, 61.3, 97, 7.25, true, 356.35);
  ridge(m, 58.5, 61.3, 79.8, 3.55, false, 354.9);
  const center: P2[] = [];
  for (let i = 0; i < 32; i++) {
    const t = (i * Math.PI) / 16,
      r = 5.0 + 1.35 * Math.cos(4 * t);
    center.push([58.5 + r * Math.cos(t), 61.3 + r * Math.sin(t)]);
  }
  m.prism(center, 354.9, 359.83, '#c9c8be', '#c2bbae');
  for (const [x, z] of [
    [26.4, 94.7],
    [91.4, 28.1],
  ]) {
    for (let i = 0; i < 24; i++) {
      const p = (t: number, r: number, y: number) => [x + r * Math.cos(t), y, z + r * Math.sin(t)];
      const a = (i * Math.PI) / 12,
        b = ((i + 1) * Math.PI) / 12;
      m.body.tri(p(0, 0, 352.5), p(a, 5.35, 351.37), p(b, 5.35, 351.37), '#65767a');
      m.body.tri(p(0, 0, 352.53), p(a, 5.35, 351.4), p(a + 0.017, 5.35, 351.4), '#c9c8ba');
    }
  }
  // Low rooftop volumes carry the public skyline beyond the two circular rooflights.
  for (const [x, z, w, d, h] of [
    [20, 34, 5.2, 43, 4.6],
    [75, 103, 7, 26, 3.5],
    [94, 100, 15, 19, 4.8],
    [102, 66, 5, 22, 2.4],
  ]) {
    m.body.box(w, h, d, x, roofY + h / 2, z, '#9b9d95');
    m.body.box(w + 0.22, 0.16, d + 0.22, x, roofY + h, z, '#c6c2b5');
  }
}
export function createWilliams250(buildings: VBuilding[], grid: GroundGrid) {
  const m = landmarkShell(
    buildings,
    grid,
    id,
    '250 Williams Street',
    [-29.95, -922.7],
    [117.1, 0.65],
    [
      [2, 2],
      [width - 2, 2],
      [2, depth - 2],
      [width - 2, depth - 2],
    ],
  );
  if (!m) return null;
  const core = (d: number): P2[] => [
    [d, d],
    [width - d, d],
    [width - d, depth - d],
    [d, depth - d],
  ];
  m.prism(core(9.2), m.base, soffit, '#7f8581', gravel);
  m.prism(core(5.5), soffit, cornerY, '#839296', gravel);
  crown(m);
  rooflights(m);
  for (const side of sides) {
    curtain(m, side);
    podium(m, side);
  }
  return m.finish('#e4d3a2');
}
