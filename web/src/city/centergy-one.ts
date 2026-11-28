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
  trellis = '#f1f2ef',
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
  // The footprint turns slightly east of north. Its south lobby wall also
  // steps around a recess. Use the surveyed corners for the tower envelope
  // and the same four wall planes for its ribbons, corners and lit panes.
  const extreme = (sx: number, sz: number) => plan.reduce((best, p) =>
    sx * p[0] + sz * p[1] > sx * best[0] + sz * best[1] ? p : best);
  const tower = [extreme(-1, -1), extreme(1, -1), extreme(1, 1), extreme(-1, 1)];
  s.prism(tower, lobby, parapet, brick, roofDeck);
  const faces = tower.map((p, i) => [p, tower[(i + 1) % tower.length]]);
  const us = tower.map(p => p[0]), vs = tower.map(p => p[1]);
  const [u0, u1, v0, v1] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)];
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
    quad(0.38, 0.62, lobby, parapet, 0.05, bay);
    // Ribbon windows in the brick between them, one per floor.
    for (let f = 0; f < floors; f++) {
      const y = lobby + f * pitch + 1.2;
      quad(c + 0.02, 0.36, y, y + 1.9, 0.04, band);
      quad(0.64, 1 - c - 0.02, y, y + 1.9, 0.04, band);
    }
    // Offices at 23:30: a few lit panes across the whole face.
    // Only the lit panes are drawn; the ribbons already carry the day colour.
    const litOnly = { body: { quad: () => {} } as unknown as typeof s.body, lights: s.lights };
    litFacade(litOnly, seed, face, pt(0), pt(1), lobby, roof, floors, len / Math.round(len / 3), 0.9, 0.5, [band], 0.07);

    // Sunshade trellis: a deck ring on posts, cantilevered 0.9 m past the wall (inside the 2.5 m footprint allowance).
    quad(-0.03, 1.03, trellisLo, trellisHi, 0.9, trellis);
    // Posts rise from the parapet to the slats, so the trellis is carried, not floating.
    for (const t of [0.05, 0.5, 0.95]) {
      const l = t - 0.15 / len, r = t + 0.15 / len;
      quad(l, r, parapet, trellisHi, 0.2, trellis);
      // A foot on the parapet and an arm out to the trellis ring hold each post.
      for (const [y, from, to] of [[parapet, 0, 0.2], [trellisHi, 0.2, 0.9]] as const)
        s.body.quad(at(l, y, from), at(l, y, to), at(r, y, to), at(r, y, from), trellis);
    }
  });
  // Follow every lobby setback at street level.
  for (let i = 0; i < plan.length; i++) {
    const a = plan[i], b = plan[(i + 1) % plan.length];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 2) continue;
    litFacade({ body: s.body, lights: s.lights }, seed, i, a, b,
      g0 + 0.3, lobby - 0.6, 1, 100, 0.94, 1, [podium], 1);
  }
  // Trellis top: open slats over the roof.
  for (let k = 0; k <= 6; k++) {
    const v = v0 - 0.9 + (k / 6) * (v1 - v0 + 1.8);
    s.body.box(u1 - u0 + 1.8, 0.25, 0.5, (u0 + u1) / 2, trellisHi, v, trellis);
  }
  return s.finish('#f5d8a8', 0.5);
}
