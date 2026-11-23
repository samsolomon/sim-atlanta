import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

/** Low Marietta frontage between the Metropolitan and the former Fourth National Bank. */
export function createMariettaBackdrop(buildings: VBuilding[], grid: GroundGrid) {
  const site = landmarkShell(
    buildings,
    grid,
    '8823b763-1d37-44f3-b2f0-8b7de989868b',
    'Marietta frontage at Five Points',
    [105.3, -80.24],
    [18.15, 13.41],
    [
      [1, 1],
      [21.6, 1],
      [1.8, 33.5],
      [21.3, 33.5],
    ],
  );
  if (!site || site.ring.length !== 7) return null;
  const corner = (u: number, v: number) => site.ring.find(([x, z]) => Math.hypot(x - u, z - v) < 0.65);
  const end = corner(22.57, 0),
    jog = corner(23.3, 27),
    inside = corner(21.9, 27.1),
    back = corner(22.4, 34.5);
  if (!end || !jog || !inside || !back) return null;
  const main = 332.25;
  site.prism(site.ring, site.base, main, '#bdb8aa', '#a5a198');
  const rect = (x: number, z: number, X: number, Z: number): P2[] => [
    [x, z],
    [X, z],
    [X, Z],
    [x, Z],
  ];
  // Most of the returns above the main membrane are confined to this rear eastern strip.
  const start: P2 = [end[0] + ((jog[0] - end[0]) * (19.4 - end[1])) / (jog[1] - end[1]), 19.4];
  site.prism([[17.6, 19.4], start, jog, inside, back, [17.6, 34.5]], main, 339.45, '#98968d', '#aba89e');
  site.prism(rect(18.5, 21, 20.9, 26.4), 339.45, 341.4, '#888b87', '#b2b3a9');
  for (const [x, z] of [
    [1.9, 3.3],
    [2.4, 30.2],
    [14.8, 29.3],
  ])
    site.prism(rect(x, z, x + 2.4, z + 2.9), main, 334.7, '#91938d', '#b6b6a9');
  const width = end[0];
  site.prism(rect(0, -0.04, width, 0.26), main, 333.08, '#bebbb0', '#d2ccc0');
  const face = (l: number, r: number, y: number, h: number, depth: number, color: string, lit = false) =>
    (lit ? site.lights : site.body).quad([l, y, depth], [l, h, depth], [r, h, depth], [r, y, depth], color);
  // Square piers separate the dark glazing along the walk. The paired display panels sit above.
  for (let i = 0; i < 6; i++) {
    const l = (i * width) / 6 + 0.38,
      r = ((i + 1) * width) / 6 - 0.38;
    face(l, r, 319.54, 324.05, -0.045, '#4d5556', i === 2);
    face(l, r, 323.01, 323.08, -0.06, '#969a92');
    face((l + r) / 2 - 0.045, (l + r) / 2 + 0.045, 319.54, 323.02, -0.06, '#7c807b');
  }
  for (const x of [2.1, 8.4]) {
    face(x - 0.13, x + 5.7, 325.15, 329.65, -0.07, '#928c82');
    face(x, x + 5.57, 325.32, 329.48, -0.09, '#9d5b50');
  }
  face(15.1, 21.9, 324.78, 331.23, -0.05, '#85857d');
  return site.finish('#efd8ac');
}
