import type { GroundGrid } from '../terrain/grid';
import { pointInRing, type P2 } from '../vignette/geom';
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

// Centergy One's east wall, which the wing's west (party) wall shares.
const centergyOneEastX = 203;
const origin: P2 = [225.8, -2631.8];
// The 2019 lidar's grade under the wing, NAVD88 metres.
const lidarGround = 293.4;

export function createCentergyWing(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const s = landmarkShell(buildings, grid, site.id, 'Centergy glass wing', origin, [1, 0],
    [[0, 0], [-15, -10], [15, 10]]);
  if (!s) return null;
  const seed = seedOf(centergyWingId);
  // Heights are measured from the lidar grade (293.4 m NAVD88), not the footprint's lowest
  // corner, which sits about 3.4 m lower on the sloping site.
  const g0 = Math.max(s.base + 0.35, lidarGround);
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

  // Faces on the wing's mapped edges, not its bounding box, so every layer stands just proud of
  // the real wall. The west edge is the party wall flush against Centergy One, so it gets no
  // facade. Where a neighbour covers an edge (the 23 m block south of the wing), the facade
  // starts at the first floor line above that neighbour's roof.
  const [ox, oz] = origin;
  const party = (a: P2, b: P2) => Math.max(a[0], b[0]) + ox < centergyOneEastX;
  const covered = (a: P2, b: P2, len: number) => {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    let top = -Infinity;
    for (const t of [0.25, 0.5, 0.75]) {
      const x = a[0] + t * dx + 1.2 * dz / len + ox, z = a[1] + t * dz - 1.2 * dx / len + oz;
      let here = -Infinity;
      for (const other of buildings) {
        if (other.id === site.id || other.h == null || !other.rings.some(r => pointInRing(x, z, r as P2[]))) continue;
        // The neighbour's roof stands on its own ground: take its highest corner, so a block
        // downhill or uphill of the wing still hides the bands it covers.
        const ground = Math.max(...other.rings[0].map(([px, pz]) => grid.sample(px, pz) ?? s.base));
        here = Math.max(here, ground + other.h);
      }
      top = t === 0.25 ? here : Math.min(top, here);
    }
    return top;
  };
  plan.forEach((a, face) => {
    const b = plan[(face + 1) % plan.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    if (len < 1 || party(a, b)) return;
    const from = covered(a, b, len);
    const at = (t: number, y: number, out: number) => [a[0] + t * dx + out * dz / len, y, a[1] + t * dz - out * dx / len];
    const quad = (l: number, r: number, y0: number, y1: number, out: number, c: string, lit = false) =>
      (lit ? s.lights : s.body).quad(at(l, y0, out), at(l, y1, out), at(r, y1, out), at(r, y0, out), c);
    // The first floor whose whole band clears any neighbour's roof.
    const first = from < lobby - 0.55 ? 0 : Math.ceil((from + 0.55 - lobby) / pitch);
    if (first > floors) return;
    const lo = lobby + first * pitch;
    // A bright spandrel band at every floor: the wing's identity at 400 m.
    for (let f = first; f <= floors; f++) {
      const y = lobby + f * pitch;
      quad(0, 1, y - 0.55, y + 0.35, 0.06, band);
    }
    // Close vertical mullions, about every 1.5 m.
    const n = Math.max(1, Math.round(len / 1.5));
    for (let k = 1; k < n; k++) quad(k / n - 0.06 / len, k / n + 0.06 / len, lo, roof, 0.04, mullion);
    // Offices at 23:30: a few lit panes, drawn only where lit.
    const litOnly = { body: { quad: () => {} } as unknown as typeof s.body, lights: s.lights };
    litFacade(litOnly, seed, face, a, b, lo, roof, floors - first, len / Math.max(1, Math.round(len / 3)), 0.9, 0.7, [glass], 0.07);
    // Lobby glazing, where the street can see it, from the edge's own grade.
    const street = Math.max(s.base + 0.35, Math.min(...[a, b].map(([x, z]) => grid.sample(x + ox, z + oz) ?? g0)));
    if (first === 0) quad(0.03, 0.97, street + 0.3, lobby - 0.6, 0.05, base, true);
  });
  // Nine15 Midtown's and University House's lamp look: in the same 500 m batch cell, so the
  // wing's lit panes share their night draw instead of adding one (High night is at its cap).
  return s.finish('#f2d6a8', 0.66);
}
