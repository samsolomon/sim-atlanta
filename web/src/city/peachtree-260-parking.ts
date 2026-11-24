import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { appendParkedSedan } from '../vignette/parked-sedan';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';

export const peachtree260ParkingId = '110124e5-f458-4355-bc57-2ab8e60d688e';
const origin: P2 = [270, -875];

/**
 * 260/270 Peachtree Parking, the brick-clad deck behind 270 Peachtree on Baker Street.
 * USGS GA_Statewide_B2_2018 lidar (NAVD88): grade 315.3 on Baker Street to 317.4 on the south,
 * deck roof 337-339 and a stair tower to 344.7 at the north edge (the mapped 29.2 m overstates it).
 * Street View (33 Baker St NW, December 2025): red-brown brick piers and spandrels frame large
 * regular openings on every level; the ground-floor bays are open behind black metal grilles.
 */
export const PEACHTREE_260_PARKING = { roof: 338.5, stair: 344.7, level: 3.6, ground: 4.2 } as const;

const brick = '#a5786a', brickDark = '#946a5c', deck = '#2c3133', slab = '#8f8b84', soffit = '#4a4d4f', grille = '#24292b',
  roofGrey = '#8d8a84';

export function create260PeachtreeParking(buildings: VBuilding[], grid: GroundGrid) {
  const s = landmarkShell(buildings, grid, peachtree260ParkingId, '260/270 Peachtree Parking', origin, [1, 0], [[0, 0], [-20, 0], [20, 0]]);
  if (!s) return null;
  const H = PEACHTREE_260_PARKING, seed = seedOf(peachtree260ParkingId);
  // Counter-clockwise in (u, v), so (dv, -du) points outward.
  const area = s.ring.reduce((sum, [x, z], i) => sum + x * s.ring[(i + 1) % s.ring.length][1] - s.ring[(i + 1) % s.ring.length][0] * z, 0);
  const ring: P2[] = area < 0 ? [...s.ring].reverse() : s.ring;
  s.prism(ring, s.base, H.roof, brick, roofGrey);

  ring.forEach((a, face) => {
    const b = ring[(face + 1) % ring.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 6) return;
    const n: P2 = [(b[1] - a[1]) / len, -(b[0] - a[0]) / len];
    const at = (t: number, y: number, d: number) => [a[0] + t * (b[0] - a[0]) + d * n[0], y, a[1] + t * (b[1] - a[1]) + d * n[1]];
    const mid = at(0.5, 0, 1.5);
    const grade = grid.sample(origin[0] + mid[0], origin[1] + mid[2]) ?? s.base;
    // Upper levels: brick piers and spandrels around open deck bays. Each opening shows the dark
    // deck, the next slab's edge along its foot and the soffit along its head; parking lights
    // come on in a stable share of bays at night.
    const lo = grade + H.ground, rows = Math.max(1, Math.round((H.roof - 1 - lo) / H.level));
    const pitch = (H.roof - 1 - lo) / rows, cols = Math.max(1, Math.round(len / 4.2));
    for (let j = 0; j < rows; j++) for (let k = 0; k < cols; k++) {
      const l = (k + 0.13) / cols, r = (k + 0.87) / cols, y0 = lo + j * pitch + pitch * 0.22, y1 = lo + (j + 1) * pitch - 0.15;
      const quad = (lo2: number, hi2: number, d: number, colour: string, lit = false) =>
        (lit ? s.lights : s.body).quad(at(l, lo2, d), at(l, hi2, d), at(r, hi2, d), at(r, lo2, d), colour);
      quad(y0, y1, 0.05, deck, litHash(seed, face, j, k) < 0.3);
      quad(y0, y0 + 0.35, 0.1, slab);
      quad(y1 - 0.3, y1, 0.1, soffit);
    }
    // Ground floor: open bays behind black grilles, split by brick piers.
    s.body.quad(at(0.02, grade + 0.2, 0.05), at(0.02, lo - 0.6, 0.05), at(0.98, lo - 0.6, 0.05), at(0.98, grade + 0.2, 0.05), grille);
    const bays = Math.max(1, Math.round(len / 4.2));
    for (let k = 0; k <= bays; k++) {
      const t = k / bays, w = 0.4 / len;
      s.body.quad(at(Math.max(0, t - w), grade, 0.08), at(Math.max(0, t - w), lo, 0.08), at(Math.min(1, t + w), lo, 0.08), at(Math.min(1, t + w), grade, 0.08), brickDark);
    }
    // A darker brick coping at the roof edge.
    s.body.quad(at(0, H.roof - 0.8, 0.06), at(0, H.roof, 0.06), at(1, H.roof, 0.06), at(1, H.roof - 0.8, 0.06), brickDark);
  });
  // The stair and elevator tower at the Baker Street (north) edge.
  const vs = ring.map(p => p[1]), north = Math.min(...vs);
  const tower: P2[] = [[8, north], [16, north], [16, north + 6], [8, north + 6]];
  s.prism(tower, H.roof, H.stair, brick, roofGrey);
  // The aerial shows a row pointing toward Baker Street, interrupted by the stair.
  // Leave the central aisle and the southern ramp clear. Occupancy is illustrative.
  const colors = ['#a26955', '#858b87', '#d6d5cc', '#565a60', '#babebc'];
  const occupied = [0, 1, 3, 6, 8];
  const stallWidth = 2.75, stallDepth = 5.2, stripeY = H.roof + 0.05;
  for (const [start, count] of [[-22.3, 10], [17.4, 2]]) {
    for (let i = 0; i <= count; i++) {
      const x = start + i * stallWidth, z = north + 1.1;
      s.body.quad([x, stripeY, z], [x, stripeY, z + stallDepth],
        [x + 0.12, stripeY, z + stallDepth], [x + 0.12, stripeY, z], '#d8d6c5');
      if (i === count) continue;
      const paint = occupied.indexOf(i);
      if (paint >= 0)
        appendParkedSedan(s.body, [x + stallWidth / 2, z + stallDepth / 2], H.roof, 0, -1, colors[paint]);
    }
  }
  return s.finish('#f2e6c4', 0.55);
}
