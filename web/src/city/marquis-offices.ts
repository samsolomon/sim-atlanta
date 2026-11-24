import { ShapeUtils, Vector2 } from 'three';
import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

const precast = '#cbc3b2',
  bands = '#bcb5a7',
  glass = '#4c5659';

export function createMarquisOne(buildings: VBuilding[], grid: GroundGrid) {
  const s = landmarkShell(buildings, grid, 'd36a5d7e-165d-4008-a4be-6d32c4c55f0b',
    'Marquis One', [552, -810], [1, 0.015], [[0, 0], [-25, -12], [25, 12]]);
  if (!s) return null;

  const ring = ShapeUtils.isClockWise(s.ring.map(([x, z]) => new Vector2(x, z)))
    ? [...s.ring].reverse()
    : s.ring;
  const shaft = s.base + 11.6,
    roof = s.base + 115.2,
    parapet = roof - 1.5,
    floors = 26,
    pitch = (parapet - shaft - 1.8) / floors;
  const rect = (x: number, z: number, w: number, d: number): P2[] => [
    [x - w / 2, z - d / 2], [x + w / 2, z - d / 2],
    [x + w / 2, z + d / 2], [x - w / 2, z + d / 2],
  ];

  // The inset double-height lobby exposes the piers under the three shaft bays.
  const lobby = rect(1, 0, 48, 28);
  s.prism(lobby, s.base, shaft, glass, '#98958b');
  s.prism(ring, shaft, shaft + 1.8, precast, bands);
  s.prism(ring, shaft + 1.8, parapet, glass, '#8c8980');
  s.prism(ring, parapet, roof, precast, '#96938a');
  s.prism(rect(1, 0, 23, 10), roof, roof + 2.1, '#a8a398', '#9e9a90');

  for (const x of [-26.2, 26.2]) {
    for (const z of x < 0 ? [-13, -5, 5, 13] : [-13, 0, 13]) {
      s.body.box(1.1, shaft - s.base, 1.1, x, (shaft + s.base) / 2, z, precast);
    }
  }

  // Peachtree Center Avenue entrance and the upper connection opening on the west end.
  const avenueGrade = grid.sample(525.2, -810.4) ?? s.base;
  const landing = avenueGrade + 1.8;
  s.body.box(0.08, 4.3, 8, -23.05, landing + 2.15, 0, '#333e42');
  s.body.box(2.6, 0.45, 8.8, -24.3, landing + 4.5, 0, bands);
  for (const z of [-3.8, 0, 3.8]) {
    s.body.box(0.12, 4.3, 0.12, -23.15, landing + 2.15, z, '#8b8272');
  }
  for (let step = 0; step < 4; step++) {
    const top = avenueGrade + (step + 1) * 0.45;
    s.body.box(1, top - s.base, 7.6, -26.55 + step, (s.base + top) / 2, 0, '#676760');
  }
  s.lights.box(0.025, 3.3, 3.1, -23.13, landing + 1.65, 0, '#665e50');

  // Harris Street's tower-side vestibule has the surviving half-barrel hood.
  const harrisGrade = grid.sample(565, -794) ?? s.base;
  const spring = harrisGrade + 3.3, radius = 2.1;
  for (const x of [10.9, 15.1]) {
    s.body.box(0.3, spring - s.base, 2.2, x, (s.base + spring) / 2, 15.1, bands);
  }
  s.body.box(3.9, spring - s.base, 0.1, 13, (s.base + spring) / 2, 14.06, '#343e42');
  for (let segment = 0; segment < 8; segment++) {
    const arch = (i: number, z: number) => {
      const angle = i * Math.PI / 8;
      return [radius * Math.cos(angle) + 13, spring + radius * Math.sin(angle), z];
    };
    s.body.quad(arch(segment, 16.2), arch(segment + 1, 16.2),
      arch(segment + 1, 14), arch(segment, 14), '#a69b88');
  }

  // Horizontal spandrels cross continuous vertical dividers. Each run uses one
  // strip per pier and floor, so the two axes read without a quad for every pane.
  for (let edge = 0; edge < ring.length; edge++) {
    const a = ring[edge], b = ring[(edge + 1) % ring.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    const bays = Math.max(1, Math.round(length / 1.55));
    const start = shaft + 1.8;
    const point = (t: number, y: number, depth: number) => [
      a[0] + t * dx + depth * dz / length,
      y,
      a[1] + t * dz - depth * dx / length,
    ];
    const panel = (l: number, r: number, lo: number, hi: number, depth: number, color: string, lit = false) =>
      (lit ? s.lights : s.body).quad(point(l, lo, depth), point(l, hi, depth),
        point(r, hi, depth), point(r, lo, depth), color);

    // The narrow returns between shaft bays are separately glazed.
    for (let bay = 0; bay <= bays; bay++) {
      const center = bay / bays, half = 0.25 / length;
      panel(Math.max(0, center - half), Math.min(1, center + half), start, parapet, 0.12, precast);
    }
    if (length < 3) continue;
    for (let floor = 0; floor < floors; floor++) {
      const y = start + floor * pitch;
      panel(0, 1, y, y + 1.37, 0.14, bands);
      for (let bay = 0; bay < bays; bay++) {
        if ((floor * 29 + bay * 17 + edge * 41) % 83 !== 0) continue;
        panel(bay / bays + 0.26 / length, (bay + 1) / bays - 0.26 / length,
          y + 1.38, y + pitch, 0.025, glass, true);
      }
    }
  }
  return s.finish('#f9d8a9', 0.43);
}
