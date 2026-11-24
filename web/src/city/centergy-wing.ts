import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

/**
 * The glass curtain-wall wing of the Centergy complex at Technology Square,
 * flush east of Centergy One (osm:way:792229254, unnamed in OSM). Smallwood's
 * aerial shows a green-grey glass box with a bright horizontal band at every
 * floor and close vertical mullions, flat-topped and lower than the brick
 * tower. Lidar (April 2019): roof p50 52.2, p95 57.0 m above grade.
 */
export const centergyWingId = 'osm:way:792229254';

const glass = '#6f8580',
  band = '#c8ccc8',
  mullion = '#55605d',
  base = '#4d5a5c',
  roofDeck = '#a6a39c';

export function createCentergyWing(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const s = landmarkShell(buildings, grid, site.id, 'Centergy glass wing', [225.8, -2631.8], [1, 0],
    [[0, 0], [-15, -10], [15, 10]]);
  if (!s) return null;
  const seed = seedOf(centergyWingId);
  const g0 = s.base + 0.35;
  const lobby = g0 + 6, floors = 11, pitch = 4.1, roof = lobby + floors * pitch, // ≈ 51 m
    parapet = g0 + 52.2, plant = g0 + 57;

  const area = s.ring.reduce((t, [x, z], i) => {
    const [x2, z2] = s.ring[(i + 1) % s.ring.length];
    return t + x * z2 - x2 * z;
  }, 0);
  const plan = area > 0 ? s.ring : [...s.ring].reverse();
  s.prism(plan, s.base, lobby, base, roofDeck);
  s.prism(plan, lobby, parapet, glass, roofDeck);
  s.body.box(14, plant - parapet, 9, 4, (plant + parapet) / 2, 0, '#9c9a94');

  // Faces on the wing's true sides. The west face is flush against Centergy One,
  // so it gets no facade.
  const us = plan.map(p => p[0]), vs = plan.map(p => p[1]);
  const [u0, u1, v0, v1] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)];
  const faces: [P2, P2][] = [[[u0, v0], [u1, v0]], [[u1, v0], [u1, v1]], [[u1, v1], [u0, v1]]];
  faces.forEach(([a, b], face) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    const at = (t: number, y: number, out: number) => [a[0] + t * dx + out * dz / len, y, a[1] + t * dz - out * dx / len];
    const quad = (l: number, r: number, y0: number, y1: number, out: number, c: string, lit = false) =>
      (lit ? s.lights : s.body).quad(at(l, y0, out), at(l, y1, out), at(r, y1, out), at(r, y0, out), c);
    // A bright spandrel band at every floor: the wing's identity at 400 m.
    for (let f = 0; f <= floors; f++) {
      const y = lobby + f * pitch;
      quad(0, 1, y - 0.55, y + 0.35, 0.06, band);
    }
    // Close vertical mullions, about every 1.5 m.
    const n = Math.max(1, Math.round(len / 1.5));
    for (let k = 1; k < n; k++) quad(k / n - 0.06 / len, k / n + 0.06 / len, lobby, roof, 0.04, mullion);
    // Offices at 23:30: a few lit panes, drawn only where lit.
    const litOnly = { body: { quad: () => {} } as unknown as typeof s.body, lights: s.lights };
    litFacade(litOnly, seed, face, a, b, lobby, roof, floors, len / Math.max(1, Math.round(len / 3)), 0.9, 0.7, [glass], 0.07);
    // Lobby glazing.
    quad(0.03, 0.97, g0 + 0.3, lobby - 0.6, 0.05, base, true);
  });
  return s.finish('#f5d8a8', 0.5);
}
