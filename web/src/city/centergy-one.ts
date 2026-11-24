import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

/**
 * Centergy One (2003, Technology Square): a red-brick office tower with ribbon
 * windows, a glazed bay up the middle of each face and glass corners, under a
 * white open sunshade trellis. Lidar (April 2019): roof p50 58.8, p95 64.4 m
 * above grade; the trellis is the 64–65 m returns.
 */
export const centergyOneId = 'osm:way:42706826';

const brick = '#9c6650',
  band = '#7f8f97',
  bay = '#8d9ca4',
  podium = '#6b7a80',
  trellis = '#e3e5e2',
  roofDeck = '#a6a39c';

export function createCentergyOne(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const s = landmarkShell(buildings, grid, site.id, 'Centergy One', [189, -2632.1], [1, 0],
    [[0, 0], [-10, -10], [10, 10]]);
  if (!s) return null;
  const seed = seedOf(centergyOneId);
  const g0 = s.base + 0.35;
  const lobby = g0 + 6, floors = 13, pitch = 4, roof = lobby + floors * pitch, // 58 m
    parapet = roof + 1.2, trellisLo = g0 + 62.6, trellisHi = g0 + 64.4;

  const area = s.ring.reduce((t, [x, z], i) => {
    const [x2, z2] = s.ring[(i + 1) % s.ring.length];
    return t + x * z2 - x2 * z;
  }, 0);
  const plan = area > 0 ? s.ring : [...s.ring].reverse();
  s.prism(plan, s.base, lobby, podium, roofDeck);
  s.prism(plan, lobby, parapet, brick, roofDeck);

  // Faces on the tower's four true sides, not the ring's split segments.
  const us = plan.map(p => p[0]), vs = plan.map(p => p[1]);
  const [u0, u1, v0, v1] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)];
  const faces: [P2, P2][] = [[[u0, v0], [u1, v0]], [[u1, v0], [u1, v1]], [[u1, v1], [u0, v1]], [[u0, v1], [u0, v0]]];
  faces.forEach(([a, b], face) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    const at = (t: number, y: number, out: number) => [a[0] + t * dx + out * dz / len, y, a[1] + t * dz - out * dx / len];
    const pt = (t: number): P2 => [a[0] + t * dx, a[1] + t * dz];
    const quad = (l: number, r: number, y0: number, y1: number, out: number, c: string, lit = false) =>
      (lit ? s.lights : s.body).quad(at(l, y0, out), at(l, y1, out), at(r, y1, out), at(r, y0, out), c);
    const c = 2.2 / len; // glass corner width
    // Glass corners and the central glazed bay, full height.
    quad(0, c, lobby, parapet, 0.05, bay);
    quad(1 - c, 1, lobby, parapet, 0.05, bay);
    quad(0.42, 0.58, lobby, parapet, 0.05, bay);
    // Ribbon windows in the brick between them, one per floor.
    for (let f = 0; f < floors; f++) {
      const y = lobby + f * pitch + 1.2;
      quad(c + 0.02, 0.4, y, y + 1.9, 0.04, band);
      quad(0.6, 1 - c - 0.02, y, y + 1.9, 0.04, band);
    }
    // Offices at 23:30: a few lit panes across the whole face.
    // Only the lit panes are drawn; the ribbons already carry the day colour.
    const litOnly = { body: { quad: () => {} } as unknown as typeof s.body, lights: s.lights };
    litFacade(litOnly, seed, face, pt(0), pt(1), lobby, roof, floors, len / Math.round(len / 3), 0.9, 0.5, [band], 0.07);
    // Lobby glazing.
    quad(0.03, 0.97, g0 + 0.3, lobby - 0.6, 0.05, podium, true);
    // Sunshade trellis: a deck ring on posts, cantilevered 1.5 m past the wall.
    quad(-0.05, 1.05, trellisLo, trellisHi, 1.5, trellis);
    for (const t of [0.05, 0.5, 0.95]) quad(t - 0.15 / len, t + 0.15 / len, parapet, trellisLo, 0.3, trellis);
  });
  // Trellis top: open slats over the roof.
  for (let k = 0; k <= 6; k++) {
    const v = v0 - 1.5 + (k / 6) * (v1 - v0 + 3);
    s.body.box(u1 - u0 + 3, 0.25, 0.5, (u0 + u1) / 2, trellisHi, v, trellis);
  }
  return s.finish('#f5d8a8', 0.5);
}
