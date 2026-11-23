import { localLandmarkShell } from './landmark-shell';
import type { VBuilding } from '../vignette/world';
import fixture from './fixtures/midtown-culture/mitchell.json';
import type { P2 } from '../vignette/geom';

export const mitchellId = fixture.id;
export function createMitchellHouse(
  buildings: VBuilding[],
  site: VBuilding,
  base: number | null,
  groundAt: (x: number, z: number) => number | null,
) {
  if (site.id !== mitchellId || base === null || site.rings.length !== 1) return null;
  const [x, z] = fixture.origin,
    grade = groundAt(x - 11, z);
  if (grade === null) return null;
  const shell = localLandmarkShell(
    buildings,
    site,
    'Margaret Mitchell House',
    [x, z],
    [1, 0],
    fixture.probes.map(([u, v]) => [u, v]),
    base - grade - 0.3,
    grade,
  );
  if (!shell) return null;
  const { body, lights, prism } = shell,
    cream = '#ede8dc',
    brick = '#a5533f',
    slate = '#665d55',
    glass = '#5a6769';
  prism(shell.ring, shell.base, 0.65, '#966a56', '#ae8f7a');
  const main: P2[] = [
    [-9.2, -6.7],
    [8.4, -6.7],
    [8.4, 6.3],
    [-9.2, 6.3],
  ];
  prism(main, 0.6, 9.3, brick, slate);
  // Hipped main roof with a perpendicular gabled bay toward the Peachtree lawn.
  const eave = 9.4,
    ridge = 14.8;
  for (const sign of [-1, 1]) {
    body.quad([-9.6, eave, sign * 6.9], [8.8, eave, sign * 6.9], [3, ridge, 0], [-4, ridge, 0], slate);
    const end = sign < 0 ? -9.6 : 8.8;
    body.tri([end, eave, -6.9], [end, eave, 6.9], [sign < 0 ? -4 : 3, ridge, 0], slate);
  }
  body.box(18.4, 0.3, 13.7, -0.4, 9.25, -0.2, cream);
  const bay: P2[] = [
    [7, -0.2],
    [9.6, -0.2],
    [10.6, 1],
    [10.6, 3.2],
    [9.6, 4.1],
    [7, 4.1],
  ];
  prism(bay, 0.65, 10.5, brick, cream);
  for (const y of [5.8, 9.2])
    for (let i = 1; i <= 3; i++) {
      const a = bay[i],
        b = bay[i + 1];
      shell.facade(a, b, y - 1.65, y, 1, 2, 0.88, 0.96, [glass], 0.12);
    }
  body.tri([10.9, 10.4, -0.7], [10.9, 13.9, 2], [10.9, 10.4, 4.7], cream);
  for (const sign of [-1, 1]) {
    body.quad([10.95, 10.42, 2 + sign * 2.9], [3, 10.42, 2 + sign * 2.9], [3, 14.05, 2], [10.95, 14.05, 2], slate);
    body.quad(
      [11, 10.5, 2 + sign * 0.1],
      [11, 10.5, 2 + sign * 0.35],
      [11, 12.35, 2 + sign * 1.37],
      [11, 12.5, 2 + sign * 1.23],
      '#67584b',
    );
  }
  body.box(0.86, 4.2, 1.22, 5.5, 13.4, -1.1, brick);
  body.box(1.08, 0.35, 1.44, 5.5, 15.6, -1.1, '#995a49');
  // Windows show the lower apartment on the Crescent side of the slope.
  for (const wall of [-6.76, 6.36])
    for (const u of [-7.6, -4.8, -1.2, 2.9, 6.7])
      for (const y of [2, 5.2, 8]) {
        body.box(1.22, 1.96, 0.14, u, y, wall, cream);
        const sash = y === 5.2 && u === -4.8 ? lights : body;
        sash.box(0.99, 1.7, 0.17, u, y, wall, glass);
        body.box(1.04, 0.085, 0.19, u, y, wall, cream);
      }
  for (const u of [-9.25, 8.45])
    for (const v of [-4.85, -2.75, 1.7, 4.45])
      for (const y of [2, 5.2, 8]) {
        body.box(0.14, 2, 1.25, u, y, v, cream);
        body.box(0.17, 1.76, 1.03, u, y, v, glass);
        body.box(0.19, 0.09, 1.07, u, y, v, cream);
      }
  function porch(u: number, v: number, w: number, d: number, floor: number, ceiling: number) {
    body.box(w, 0.26, d, u, floor, v, cream);
    body.box(w + 0.25, 0.37, d + 0.25, u, ceiling, v, cream);
    body.box(w + 0.3, 0.09, d + 0.3, u, ceiling + 0.23, v, slate);
    const outer = u + (u < 0 ? -1 : 1) * (w / 2 - 0.16);
    for (const offset of [-0.45, 0, 0.45]) {
      const at = v + d * offset;
      body.box(0.2, ceiling - floor, 0.2, outer, (floor + ceiling) / 2, at, cream);
      body.box(0.31, 0.28, 0.31, outer, ceiling - 0.24, at, cream);
    }
    body.box(0.14, 0.13, d, outer, floor + 0.94, v, cream);
    for (let dz = -d / 2 + 0.18; dz < d / 2; dz += 0.38)
      body.box(0.085, 0.79, 0.085, outer, floor + 0.49, v + dz, cream);
  }
  porch(10.12, 1, 3.55, 8, 3.55, 6.75);
  // Bring the lawn-side stair down to the local slope, separately from Crescent.
  const lawn = groundAt(x + 13.9, z + 1);
  if (lawn === null) return null;
  for (let i = 0; i < 5; i++) {
    const rise = ((3.55 - (lawn - grade)) * (5 - i)) / 5;
    body.box(
      0.42,
      Math.max(0.12, rise),
      1.8,
      12.08 + i * 0.4,
      lawn - grade + Math.max(0.12, rise) / 2,
      1,
      '#b9ae9e',
    );
  }
  for (const dx of [8.7, 11.6])
    for (const dz of [-2.7, 4.7]) {
      body.box(0.36, 3.55 - shell.base, 0.36, dx, (3.55 + shell.base) / 2, dz, brick);
    }
  porch(-10.7, 0.15, 2.95, 8.8, 0.8, 3.75);
  porch(-10.7, 0.15, 2.95, 8.8, 3.86, 6.9);
  for (const u of [-11.9, 11.35]) {
    body.box(0.16, 2.75, 0.16, u, u < 0 ? 2.2 : 4.9, -3.85, '#414742');
    lights.box(0.32, 0.42, 0.32, u, u < 0 ? 3.7 : 6.4, -3.85, '#ffdfb1');
  }
  return shell.finish('#ffd7a2', 0.52);
}
