import type { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import type { P2 } from '../vignette/geom';
import { landmarkShell } from './landmark-shell';

const id = '9bfb58f3-4fec-416b-a4e9-3b869d799cc2';
const origin: P2 = [156.21, -77.05],
  axis: P2 = [-20.69, -22.81];
type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
// u runs along Marietta, v along Peachtree toward 34 Peachtree.
const tower: P2[] = [
  [0, 0],
  [30.8, 0],
  [30.35, 16.4],
  [13.55, 16.4],
  [13.55, 28.35],
  [-0.45, 28.01],
];
const brick = '#c8ae8b',
  limestone = '#d5c3a5',
  terra = '#b59573',
  glass = ['#53656b', '#748188', '#697078', '#5f676a'];
const rectangle = (u: number, v: number, w: number, d: number): P2[] => [
  [u, v],
  [u + w, v],
  [u + w, v + d],
  [u, v + d],
];
function streetFace(m: Shell, a: P2, b: P2, bays: number) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    len = Math.hypot(dx, dz);
  const plan = (t: number): P2 => [a[0] + t * dx, a[1] + t * dz];
  const pt = (t: number, y: number, relief: number) => [
    a[0] + t * dx + (dz / len) * relief,
    y,
    a[1] + t * dz - (dx / len) * relief,
  ];
  const band = (y: number, h: number, d: number, color: string) => {
    m.body.quad(pt(0, y, 0), pt(1, y, 0), pt(1, y, d), pt(0, y, d), color);
    m.body.quad(pt(0, y, d), pt(0, y + h, d), pt(1, y + h, d), pt(1, y, d), color);
    m.body.quad(pt(0, y + h, d), pt(1, y + h, d), pt(1, y + h, 0), pt(0, y + h, 0), color);
  };
  m.facade(a, b, m.base + 0.45, 325.25, 1, 3.0, 0.84, 0.94, ['#484c49', '#6b716b'], 0.28);
  m.facade(a, b, 325.8, 329.4, 1, 2.05, 0.81, 0.91, ['#78847c', '#80918d'], 0.13);
  band(329.65, 0.32, 0.22, terra);
  const bottom = 330.25,
    top = 378.05,
    rows = 14;
  for (let i = 0; i < bays; i++) {
    const center = (i + 0.5) / bays;
    const paired = i >= 2 && i < bays - 2;
    for (const shift of paired ? [-0.158, 0.158] : [0]) {
      const w = (paired ? 0.135 : 0.182) / bays;
      m.facade(
        plan(center + shift / bays - w),
        plan(center + shift / bays + w),
        bottom,
        top,
        rows,
        50,
        0.997,
        0.66,
        glass,
        0.145,
      );
    }
    // Recessed sash panels, with a low-relief chevron in the spandrel.
    for (let j = 1; j < rows; j++) {
      if (!paired) continue;
      const y = bottom + (j * (top - bottom)) / rows - 0.32,
        w = 0.29 / bays;
      m.body.tri(
        pt(center - w, y + 0.31, 0.085),
        pt(center, y - 0.02, 0.12),
        pt(center + w, y + 0.31, 0.085),
        '#a38766',
      );
    }
    if (i > 0 && i < bays - 1) {
      const t = i / bays,
        w = 0.085 / bays;
      m.body.quad(pt(t - w, bottom, 0), pt(t - w, 377.95, 0.23), pt(t, 378.51, 0.37), pt(t, bottom, 0.18), limestone);
      m.body.quad(pt(t, bottom, 0.18), pt(t, 378.51, 0.37), pt(t + w, 377.95, 0.23), pt(t + w, bottom, 0), brick);
    }
    for (const y of [329.9, 378.15]) {
      const w = 0.3 / bays;
      m.body.quad(
        pt(center - w, y + 0.22, 0.09),
        pt(center, y + 0.49, 0.14),
        pt(center + w, y + 0.22, 0.09),
        pt(center, y, 0.14),
        terra,
      );
    }
  }
  band(378.82, 0.34, 0.32, limestone);
}

export function createWilliamOliver(buildings: VBuilding[], grid: GroundGrid) {
  const m = landmarkShell(buildings, grid, id, 'William-Oliver Building', origin, axis, [
    [1, 1],
    [29, 1],
    [1, 26],
  ]);
  if (!m) return null;
  m.prism(
    [
      [13.55, 16.4],
      [30.35, 16.4],
      [30.0, 28.74],
      [13.55, 28.35],
    ],
    m.base,
    326.7,
    '#b19a82',
    '#9c9689',
  );
  m.prism(tower, m.base, 329.72, '#b4967f', terra);
  m.prism(tower, 329.72, 379.15, brick, '#b5afa2');
  streetFace(m, tower[0], tower[1], 10);
  streetFace(m, tower[5], tower[0], 10);
  for (let i = 1; i < 5; i++) m.facade(tower[i], tower[i + 1], 330.2, 378.0, 14, 3.18, 0.5, 0.65, glass, 0.085);
  // The short projection in the rear court has a lower roof and a raised stair bay.
  const stair = rectangle(19.15, 16.38, 3.7, 8.7);
  m.prism(stair, 326.7, 375.18, '#ae9881', '#aaa69b');
  m.prism(rectangle(19.15, 16.38, 3.7, 5.3), 375.18, 382.2, '#ae9985', '#b5afa5');
  m.prism(rectangle(4.95, 11.1, 7.8, 12.45), 379.15, 387.4, '#ac9c89', '#c6beae');
  // Bronze entry canopy at the north end of the Peachtree frontage.
  m.body.box(2.35, 0.35, 5.45, -0.95, 324.0, 24.5, '#826c4f');
  m.body.box(0.22, 4.8, 0.22, -0.22, 321.55, 22.22, '#937a50');
  m.body.box(0.22, 4.8, 0.22, -0.22, 321.55, 26.78, '#937a50');
  return m.finish('#f4dbab');
}
