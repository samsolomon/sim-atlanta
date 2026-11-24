import type { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import type { P2 } from '../vignette/geom';
import { surfaces } from '../materials';
import { landmarkShell } from './landmark-shell';

// u runs south along Peachtree. v runs west along Ellis toward Carnegie Way.
export function createDavisons(buildings: VBuilding[], grid: GroundGrid) {
  const s = landmarkShell(
    buildings,
    grid,
    '3b44d236-c74c-40cc-bf2b-7a42547418fe',
    "Davison's department store",
    [358.1, -593.95],
    [-0.0138, 1],
    [
      [2, 2],
      [77, 70],
      [4, 90],
    ],
  );
  if (!s) return null;
  const { body, lights } = s;
  const brick = '#a47460',
    stone = '#d6c6aa',
    glass = '#384047';
  const masonry = { wall: surfaces.brick(), roof: surfaces.asphaltRoof() };
  const rect = (u: number, v: number, w: number, d: number): P2[] => [
    [u, v],
    [u + w, v],
    [u + w, v + d],
    [u, v + d],
  ];
  s.prism(s.ring, s.base, 355.3, brick, '#807e78', masonry);
  // The 1948 rear addition has a lower roof and a chamfer at Carnegie Way.
  s.prism(
    [
      [0, 0],
      [79.91, 0],
      [80.28, 53],
      [0.46, 53],
    ],
    355.25,
    365.2,
    brick,
    '#8a8780',
    masonry,
  );
  s.prism(rect(2, 35, 73, 12), 365.2, 370.1, '#a39383', '#96938b');
  for (const [u, v, w, d, h] of [
    [11, 13, 8, 5, 373],
    [40, 16, 9, 6, 371],
    [26, 37, 12, 5, 377],
    [51, 55, 19, 16, 362],
  ]) {
    const base = v > 53 ? 355.3 : v > 35 ? 370.1 : 365.2;
    s.prism(rect(u, v, w, d), base, h, '#99958c', '#aaa69e');
  }
  // The major arches continue around the Peachtree/Ellis corner. Rear bays
  // descend with Ellis; the shared north wall against the Westin stays quiet.
  function frontage(a: P2, along: P2, outward: P2, length: number, bays: number) {
    const pt = (t: number, y: number, d: number) => [
      a[0] + along[0] * t + outward[0] * d,
      y,
      a[1] + along[1] * t + outward[1] * d,
    ];
    function panel(l: number, r: number, low: number, high: number, depth: number, color: string, lit = false) {
      (lit ? lights : body).quad(pt(l, low, depth), pt(l, high, depth), pt(r, high, depth), pt(r, low, depth), color);
    }
    const pitch = length / bays;
    for (let i = 0; i < bays; i++) {
      const center = (i + 0.5) * pitch,
        radius = pitch * 0.39;
      const [u, , v] = pt(center, 0, 0);
      const sill = grid.sample(358.1 - 0.0138 * u - 0.9999 * v, -593.95 + 0.9999 * u - 0.0138 * v);
      if (sill === null) continue;
      const spring = 336.2;
      panel(center - radius, center + radius, sill, spring, 0.12, glass);
      for (let j = 0; j < 10; j++) {
        const a0 = (j * Math.PI) / 10,
          a1 = ((j + 1) * Math.PI) / 10;
        const arc = (angle: number, r: number, d: number) =>
          pt(center + r * Math.cos(angle), spring + r * Math.sin(angle), d);
        body.tri(pt(center, spring, 0.12), arc(a0, radius, 0.12), arc(a1, radius, 0.12), glass);
        body.quad(
          arc(a0, radius, 0.21),
          arc(a0, radius + 0.32, 0.21),
          arc(a1, radius + 0.32, 0.21),
          arc(a1, radius, 0.21),
          stone,
        );
      }
      for (const t of [center - radius, center + radius]) panel(t - 0.16, t + 0.16, sill, spring, 0.21, stone);
      for (const t of [center - radius / 2, center, center + radius / 2])
        panel(t - 0.055, t + 0.055, sill, spring + radius * 0.72, 0.18, '#776e5e');
      panel(center - radius, center + radius, spring - 0.12, spring, 0.19, '#a59b88');
      if (outward[1] < 0 && (i === 2 || i === bays - 2)) {
        for (const dx of [-0.8, 0.8])
          panel(center + dx - 0.68, center + dx + 0.68, sill, sill + 2.9, 0.19, '#8c8178', true);
        const z = -1.4;
        body.box(pitch * 0.94, 0.65, 2.7, center, sill + 4, z, '#5b5149');
        lights.box(pitch * 0.9, 0.34, 0.08, center, sill + 4, z - 1.36, i === 2 ? '#e1b18d' : '#d5dce2');
      }
    }
    for (const y of [340.7, 345.8, 364.8]) panel(0, length, y, y + 0.38, 0.24, stone);
    for (let row = 0; row < 5; row++) {
      const y = 341.5 + row * 4.65;
      for (let j = 0; j < bays * 2; j++) {
        const c = ((j + 0.5) * pitch) / 2 + (j % 2 === 0 ? 0.3 : -0.3);
        panel(c - 0.83, c + 0.83, y, y + 2.55, 0.12, glass, (j * 7 + row * 13) % 31 === 0);
      }
    }
  }
  frontage([0, 0], [1, 0], [0, -1], 79.91, 9);
  frontage([79.91, 0], [0.0069, 1], [1, -0.0069], 53, 6);
  s.body.box(80.3, 0.52, 53.6, 39.85, 365.48, 26.5, '#65675e');
  return s.finish('#ffddaa', 0.62);
}
