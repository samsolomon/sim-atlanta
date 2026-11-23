import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

const id = 'a7e88f9b-fa39-42c0-9804-9117c9cf8a7c';
// City metres. The upper plan includes the east-facing light court.
const wings: P2[] = [
  [363.33, -58.14],
  [451.64, -57.94],
  [455.42, -51.07],
  [446.6, -38.6],
  [411.7, -38.7],
  [411.6, -32.6],
  [431.5, -18.1],
  [422.7, -5.99],
  [359.51, -43.02],
];
const brick = '#d3cabb',
  marble = '#dcd4c5',
  trim = '#c4b59d',
  glass = ['#67757a', '#53656d', '#718087'];
type Shell = NonNullable<ReturnType<typeof landmarkShell>>;

function elevation(m: Shell, a: P2, b: P2, court: boolean, apex: boolean) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    len = Math.hypot(dx, dz);
  const pt = (f: number, y: number, d: number) => [a[0] + dx * f + (dz * d) / len, y, a[1] + dz * f - (dx * d) / len];
  const band = (y: number, h: number, d: number, color: string) => {
    m.body.quad(pt(0, y, 0), pt(1, y, 0), pt(1, y, d), pt(0, y, d), color);
    m.body.quad(pt(0, y, d), pt(0, y + h, d), pt(1, y + h, d), pt(1, y, d), color);
    m.body.quad(pt(0, y + h, d), pt(1, y + h, d), pt(1, y + h, 0), pt(0, y + h, 0), color);
  };
  m.facade(a, b, m.base + 0.65, 327.6, 3, 4.8, 0.68, 0.84, ['#535c60', '#647173'], 0.18);
  band(328.0, 0.82, 0.39, trim);
  band(330.9, 0.43, 0.3, marble);
  const bays = Math.max(1, Math.round(len / (court ? 3.6 : 5.05)));
  for (let i = 0; i < bays; i++) {
    const t = (k: number): P2 => [a[0] + (dx * (i + k)) / bays, a[1] + (dz * (i + k)) / bays];
    if (court) m.facade(t(0.17), t(0.83), 331.35, 378.2, 13, 20, 0.99, 0.64, glass, 0.085);
    else {
      // The street elevations use paired sash within each buff brick bay.
      for (const center of apex && i !== 1 ? [0.5] : [0.315, 0.685])
        m.facade(t(center - 0.145), t(center + 0.145), 331.35, 378.2, 13, 20, 0.99, 0.66, glass, 0.095);
      const mid = (i + 0.5) / bays;
      m.body.quad(
        pt(mid - 0.1 / bays, 377.1, 0.12),
        pt(mid - 0.1 / bays, 379, 0.12),
        pt(mid + 0.1 / bays, 379, 0.12),
        pt(mid + 0.1 / bays, 377.1, 0.12),
        '#c4b397',
      );
    }
  }
  band(378.8, 0.34, 0.35, trim);
  band(379.63, 0.65, court ? 0.28 : 0.85, marble);
  if (!court) {
    const brackets = Math.round(len / 1.65);
    for (let i = 0; i < brackets; i++) {
      const l = (i + 0.32) / brackets,
        r = (i + 0.68) / brackets;
      m.body.quad(pt(l, 379.0, 0.19), pt(l, 379.69, 0.66), pt(r, 379.69, 0.66), pt(r, 379.0, 0.19), trim);
    }
  }
}

function rotunda(m: Shell) {
  const x = 358.26,
    z = -51.35;
  const ring = (radius: number, n = 28): P2[] =>
    Array.from({ length: n }, (_, i) => [
      x + radius * Math.cos((2 * Math.PI * i) / n),
      z + radius * Math.sin((2 * Math.PI * i) / n),
    ]);
  const drum = ring(4.03, 24);
  m.prism(drum, m.base, 325.9, '#817565', marble);
  for (let i = 0; i < drum.length; i++) {
    m.facade(
      drum[i],
      drum[(i + 1) % drum.length],
      m.base + 0.5,
      324.5,
      2,
      3,
      0.965,
      0.91,
      ['#927f62', '#978d75'],
      0.88,
    );
  }
  const circle = (cx: number, cz: number, r: number): P2[] =>
    Array.from({ length: 10 }, (_, j) => [cx + r * Math.cos((j * Math.PI) / 5), cz + r * Math.sin((j * Math.PI) / 5)]);
  for (let i = 0; i < 12; i++) {
    const phi = (2 * Math.PI * i) / 12,
      cx = x + 4.6 * Math.cos(phi),
      cz = z + 4.6 * Math.sin(phi);
    m.prism(circle(cx, cz, 0.38), m.base, 325.85, marble, marble);
    m.prism(circle(cx, cz, 0.55), 325.37, 325.85, trim, marble);
  }
  m.prism(ring(5.12), 325.85, 326.48, marble, trim);
  const dome = (i: number, j: number) => {
    const theta = (i * 2 * Math.PI) / 28,
      phi = (j * Math.PI) / 12;
    return [
      x + 4.85 * Math.cos(phi) * Math.cos(theta),
      326.48 + 2.12 * Math.sin(phi),
      z + 4.85 * Math.cos(phi) * Math.sin(theta),
    ];
  };
  for (let i = 0; i < 28; i++)
    for (let j = 0; j < 6; j++)
      m.body.quad(dome(i, j), dome(i + 1, j), dome(i + 1, j + 1), dome(i, j + 1), i % 7 === 0 ? '#718a7c' : '#82998a');
}

export function createHurtBuilding(buildings: VBuilding[], grid: GroundGrid) {
  const m = landmarkShell(
    buildings,
    grid,
    id,
    'Hurt Building',
    [0, 0],
    [1, 0],
    [
      [358, -51],
      [365, -51],
      [448, -51],
      [421, -12],
    ],
  );
  if (!m) return null;
  m.prism(wings, m.base, 330.9, marble, trim);
  m.prism(wings, 330.9, 379.65, brick, '#99978e');
  for (let i = 0; i < wings.length; i++)
    elevation(m, wings[i], wings[(i + 1) % wings.length], i >= 3 && i <= 5, i === wings.length - 1);
  // The base crosses the east entrance to the court. The terraces step down toward its blind end.
  for (const [plan, h] of [
    [
      [
        [411.6, -38.7],
        [419, -38.7],
        [419, -27.2],
        [411.6, -32.6],
      ],
      317.5,
    ],
    [
      [
        [419, -38.7],
        [424, -38.7],
        [424, -23.6],
        [419, -27.2],
      ],
      322.1,
    ],
    [
      [
        [424, -38.7],
        [430, -38.7],
        [430, -19.2],
        [424, -23.6],
      ],
      325.2,
    ],
    [
      [
        [430, -38.7],
        [446.6, -38.6],
        [431.5, -18.1],
        [430, -19.2],
      ],
      329.2,
    ],
  ] as [P2[], number][]) {
    m.prism(plan, m.base, h, marble, '#aca899');
  }
  m.facade([446.6, -38.6], [431.5, -18.1], m.base + 0.55, 328.6, 3, 4.6, 0.69, 0.8, ['#56646b', '#647377'], 0.14);
  m.prism(
    [
      [386, -51.7],
      [409.6, -44.3],
      [407.3, -29.4],
      [382.2, -36.4],
    ],
    379.65,
    386.85,
    '#9f9788',
    '#a9a596',
  );
  m.prism(
    [
      [373, -48.7],
      [381.8, -48.4],
      [381.1, -42.5],
      [372.4, -43.1],
    ],
    379.65,
    382.8,
    '#a49e93',
    '#c1bcb2',
  );
  rotunda(m);
  return m.finish('#f3dcad');
}
