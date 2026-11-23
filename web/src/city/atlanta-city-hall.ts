import { AdditiveBlending, DoubleSide, Mesh, MeshBasicMaterial } from 'three';
import type { GroundGrid } from '../terrain/grid';
import { Builder, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

const id = '721de634-8a32-4beb-a8d8-089afe296f1b';
const cream = '#d8d3b8',
  marble = '#deddd0',
  olive = '#878c70',
  roof = '#b6b7a9';
const glass = ['#54676a', '#687778', '#727d78'];
type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
function rect(left: number, front: number, right: number, back: number): P2[] {
  return [
    [left, front],
    [right, front],
    [right, back],
    [left, back],
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
  colors: readonly string[],
  lit: number,
) {
  plan.forEach((a, i) => m.facade(a, plan[(i + 1) % plan.length], lo, hi, rows, bay, fill, 0.78, colors, lit));
}
// Pointed openings and projecting piers follow each face of the receding tower.
function towerTier(m: Shell, glow: Builder, plan: P2[], lo: number, hi: number, rows: number) {
  m.prism(plan, lo, hi, cream, roof);
  plan.forEach((a, i) => {
    const b = plan[(i + 1) % plan.length],
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz);
    const pt = (t: number, y: number, d: number) => [a[0] + t * dx + (d * dz) / len, y, a[1] + t * dz - (d * dx) / len];
    const n = Math.max(2, Math.round(len / 3.45));
    for (let j = 0; j < n; j++) {
      const left = (j + 0.2) / n,
        right = (j + 0.8) / n,
        mid = (j + 0.5) / n;
      m.body.quad(
        pt(left, lo, 0.055),
        pt(left, hi - 1.35, 0.055),
        pt(right, hi - 1.35, 0.055),
        pt(right, lo, 0.055),
        olive,
      );
      m.body.tri(pt(left, hi - 1.35, 0.055), pt(mid, hi - 0.45, 0.055), pt(right, hi - 1.35, 0.055), olive);
      const p = (t: number): P2 => [a[0] + t * dx, a[1] + t * dz];
      m.facade(p(left), p(right), lo + 0.16, hi - 1.38, rows, 8, 0.88, 0.76, glass, 0.105);
      // A folded face catches light on one side of each buttress.
      const t = j / n,
        w = 0.12 / n;
      m.body.quad(pt(t, lo, 0.29), pt(t, hi + 0.55, 0.29), pt(t + w, hi, 0.05), pt(t + w, lo, 0.05), marble);
      m.body.tri(pt(t, hi + 0.55, 0.29), pt(t + w, hi, 0.05), pt(t, hi + 0.93, 0.05), cream);
      const tint = j % 3 === 1 ? '#ffcc74' : '#ea9652';
      glow.quad(
        pt(t + 0.012 / n, lo + 0.38, 0.315),
        pt(t + 0.02 / n, hi - 0.55, 0.315),
        pt(t + 0.105 / n, hi - 0.64, 0.12),
        pt(t + 0.115 / n, lo + 0.38, 0.1),
        tint,
      );
    }
  });
}

function historicHall(m: Shell, glow: Builder) {
  const base: P2[] = [
    [0, 0],
    [46.85, 0],
    [46.7, 35.9],
    [30.4, 35.9],
    [30.4, 17.5],
    [16.55, 17.5],
    [16.55, 36.4],
    [-0.05, 36.4],
  ];
  m.prism(base, m.base, 327.2, marble, roof);
  windows(m, base, m.base + 0.65, 326.65, 3, 3.65, 0.63, glass, 0.16);
  const link = rect(16.55, 17.5, 30.4, 45.4);
  m.prism(link, m.base, 318.95, '#b8b7a4', roof);
  // Mitchell entrance porch, steps and three pointed bronze door surrounds.
  for (let i = 0; i < 6; i++) m.body.box(11.6, 0.22, 1.1, 23.3, 313.72 + i * 0.2, -6.0 + i * 0.85, marble);
  m.prism(rect(17.7, -1.45, 29.0, 0.05), m.base, 322.9, marble, roof);
  for (const u of [20.15, 23.35, 26.55]) {
    m.body.quad(
      [u - 1.12, 314.75, -1.48],
      [u - 1.12, 320.3, -1.48],
      [u + 1.12, 320.3, -1.48],
      [u + 1.12, 314.75, -1.48],
      '#615e51',
    );
    m.body.tri([u - 1.12, 320.3, -1.48], [u, 321.9, -1.48], [u + 1.12, 320.3, -1.48], '#66716a');
  }
  towerTier(m, glow, rect(9.35, 0.38, 38.45, 16.6), 327.2, 356.5, 7);
  towerTier(m, glow, rect(12.15, 0.78, 35.5, 16.2), 356.5, 364.65, 2);
  towerTier(m, glow, rect(15.55, 1.24, 32.55, 15.68), 364.65, 371.65, 2);
  const crown = rect(16.2, 1.85, 32.0, 15.0);
  crown.forEach(([u, v], i) => {
    const [x, z] = crown[(i + 1) % 4];
    m.body.tri([u, 371.65, v], [24.05, 376.15, 8.42], [x, 371.65, z], '#8c9a82');
  });
}

function trinityAnnex(m: Shell) {
  const plan: P2[] = [
    [-28.5, 28.5],
    [-10.3, 28.5],
    [-10.3, 45.25],
    [57.4, 45.4],
    [57.4, 29.0],
    [75.1, 29.2],
    [75.3, 64.2],
    [71.7, 64.2],
    [71.7, 71.8],
    [75.2, 71.8],
    [75.4, 94.4],
    [44.1, 94.5],
    [44, 90.5],
    [2.9, 90.4],
    [2.9, 93.9],
    [-28.5, 93.8],
    [-28.5, 71.1],
    [-24.8, 71.1],
    [-24.8, 64.1],
    [-28.5, 64.1],
  ];
  m.prism(plan, m.base, 327.25, '#d2cfb9', roof);
  windows(m, plan, m.base + 0.55, 326.85, 4, 3.35, 0.59, ['#516569', '#698283'], 0.12);
  const upper = rect(-22.8, 46, 69.9, 90.4);
  m.prism(upper, 327.25, 331.65, marble, '#91a59c');
  windows(m, upper, 327.45, 331.3, 1, 3.3, 0.65, glass, 0.12);
  m.prism(rect(-19.4, 49.0, 66.7, 87.1), 331.65, 333.85, cream, roof);
  for (const u of [-17.1, 43.0]) m.prism(rect(u, 63.0, u + 18.8, 78.2), 333.85, 336.9, '#a9aca1', '#b2b4a7');
  // Four glazed ridges span the center of the atrium, across the street axis.
  for (let j = 0; j < 4; j++) {
    const v = 46.1 + j * 9.6;
    for (const [a, h, b, k] of [
      [v, 333.85, v + 4.8, 337.35],
      [v + 4.8, 337.35, v + 9.6, 333.85],
    ])
      m.body.quad([12.2, h, a], [36.2, h, a], [36.2, k, b], [12.2, k, b], '#738f90');
  }
  const drum: P2[] = Array.from({ length: 29 }, (_, i) => [
    23.55 + 12.55 * Math.cos((Math.PI * i) / 28),
    90.2 + 11.6 * Math.sin((Math.PI * i) / 28),
  ]);
  m.prism(drum, m.base, 323.35, marble, '#b9baa8');
  // The glazed Trinity wall rises behind the pale semicircular entrance.
  m.facade([44, 90.5], [2.9, 90.4], 323.4, 331.5, 2, 1.65, 0.98, 0.97, ['#537780', '#67868a'], 0.095);
}

export function createAtlantaCityHall(buildings: VBuilding[], grid: GroundGrid) {
  const m = landmarkShell(
    buildings,
    grid,
    id,
    'Atlanta City Hall',
    [108.34, 526.86],
    [39.08, 25.84],
    [
      [2, 2],
      [45, 33],
      [23, 40],
      [-19, 83],
      [63, 33],
    ],
  );
  if (!m) return null;
  const glow = new Builder();
  historicHall(m, glow);
  trinityAnnex(m);
  const result = m.finish('#efd9ac');
  const material = new MeshBasicMaterial({
    vertexColors: true,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    opacity: 0,
  });
  const uplight = new Mesh(glow.geometry(), material);
  uplight.visible = false;
  result.group.add(uplight);
  return {
    ...result,
    setNight(night: number) {
      result.setNight(night);
      material.opacity = 0.86 * night;
      uplight.visible = night > 0.001;
    },
  };
}
