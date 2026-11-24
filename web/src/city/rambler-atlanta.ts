import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';

/**
 * Rambler Atlanta, 736 Peachtree Street NE (Niles Bolton Associates; opened August 2025): a
 * 19-storey student tower running east from Peachtree to Cypress Street. A white base band of
 * about four floors (the screened garage and the recessed café) carries a dark warm-grey shaft of
 * tall paired punched windows. Stacked balconies make strong white ladders on the narrow Peachtree
 * end, the Cypress end and the long south face. The site postdates the April 2019 lidar (an empty
 * lot then), so the height is reported: 19 floors. Evidence: docs/log/ui/rambler-atlanta/README.md.
 */
export const ramblerId = 'osm:way:1300601309';

// Reported height: a 14 m base (garage and café floors) plus 15 residential floors of 3.0 m and a
// 1.7 m parapet, about 60.7 m (estimated from the floor count; OSM gives 19 levels, no height).
const baseH = 14, floorH = 3.0, floors = 15, parapetH = 1.7;
const roofH = baseH + floors * floorH + parapetH;

// Flat vertex colours: a library surface is a hooked material that the batcher never merges.
// The contrasts carry recognition: a white base clearly brighter than the shaft, a shaft a real
// step darker than the generic grey and beige boxes, and white balcony ladders against it.
const white = '#efece4', shaft = '#6f6a64', shaftDeep = '#5b5752', window = '#4c555b', windowLit = '#4e575d';
const balcony = '#f4f2ec', storefront = '#2f3a3f', roof = '#8f8d88';

function ccw(ring: P2[]): P2[] {
  let area = 0;
  ring.forEach(([x, z], i) => { const [a, b] = ring[(i + 1) % ring.length]; area += x * b - a * z; });
  return area > 0 ? ring : [...ring].reverse();
}

export function createRambler(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const origin: P2 = [570, -2320];
  const s = landmarkShell(buildings, grid, site.id, 'Rambler Atlanta', origin, [1, 0], [[0, 0], [-50, -5], [50, 5]]);
  if (!s) return null;
  const plan = ccw(s.ring);
  if (plan.length !== 4) return null;
  const floor = s.base + 0.35;
  const seed = seedOf(site.id);
  const panel = (lit: boolean, a: P2, b: P2, t0: number, t1: number, lo: number, hi: number, out: number, color: string) => {
    if (hi - lo < 0.05 || t1 <= t0) return;
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    const p = (t: number, y: number) => [a[0] + t * dx + out * dz / l, y, a[1] + t * dz - out * dx / l];
    (lit ? s.lights : s.body).quad(p(t0, lo), p(t0, hi), p(t1, hi), p(t1, lo), color);
  };

  // The white base, then the shaft as a dark window box crossed by wide piers and floor bands
  // (rows + columns, not rows x columns), then its parapet.
  const shaftTop = floor + baseH + floors * floorH;
  s.prism(plan, s.base, floor + baseH, white, roof);
  s.prism(plan, floor + baseH, shaftTop, window, roof);
  s.prism(plan, shaftTop, floor + roofH, shaft, roof);
  s.prism([[-20, -6], [10, -6], [10, 6], [-20, 6]], floor + roofH, floor + roofH + 3, white, roof);

  plan.forEach((a, edge) => {
    const b = plan[(edge + 1) % plan.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    const long = Math.abs(dx) > Math.abs(dz);
    // Street-facing glass under the base (the recessed café on Peachtree, the lobby on 4th), then
    // one dark ribbon per upper base floor (the screened garage).
    panel(false, a, b, 0.03, 0.97, floor + 0.3, floor + 4.2, 0.05, storefront);
    for (let y = floor + 5.2; y + 2.2 < floor + baseH - 0.6; y += 3.2) panel(false, a, b, 0.04, 0.96, y, y + 2.0, 0.04, window);

    // Balcony ladders: centred on each end, and two stacks on the long south face.
    // Outward normal is (dz, -dx): the south face (+z) has dx < 0.
    const ladders = long ? (dx < 0 ? [0.22, 0.78] : []) : [0.5];
    const half = 3 / length;
    const inLadder = (t0: number, t1: number) => ladders.some(c => t1 > c - half && t0 < c + half);
    // Piers every 3.4 m, 55% of the bay, in the warm-grey frame colour; skip inside a ladder.
    const bays = Math.max(1, Math.round(length / 3.4));
    for (let i = 0; i <= bays; i++) {
      const t = i / bays, w = 0.55 * 1.7 / length;
      if (inLadder(t - w, t + w)) continue;
      panel(false, a, b, Math.max(0, t - w), Math.min(1, t + w), floor + baseH, shaftTop, 0.05, shaft);
    }
    // Floor bands: the spandrel between window rows, 1.1 m deep.
    for (let f = 0; f <= floors; f++) {
      const y = floor + baseH + f * floorH;
      panel(false, a, b, 0, 1, y - 0.55, Math.min(y + 0.55, shaftTop), 0.06, shaftDeep);
    }
    // Lit rooms, grouped two windows wide (student housing, about a third lit at 23:30).
    const rooms = Math.max(1, Math.round(length / 6.8));
    for (let f = 0; f < floors; f++) {
      const y = floor + baseH + f * floorH;
      for (let i = 0; i < rooms; i++) {
        const t0 = (i + 0.1) / rooms, t1 = (i + 0.9) / rooms;
        if (inLadder(t0, t1) || litHash(seed, edge, f, i) >= 0.32) continue;
        panel(true, a, b, t0, t1, y + 0.6, y + floorH - 0.6, 0.03, windowLit);
      }
    }
    // Each ladder: a white balcony front (slab edge and rail) at every floor, 1.5 m out, with two
    // side cheeks so it reads as a solid ladder from an angle.
    const foot = (t: number, out: number): [number, number] => [a[0] + t * dx + out * dz / length, a[1] + t * dz - out * dx / length];
    for (const c of ladders) {
      const t0 = c - half, t1 = c + half;
      for (let f = 0; f < floors; f++) {
        const y = floor + baseH + f * floorH;
        panel(false, a, b, t0, t1, y + 0.05, y + 1.4, 1.5, balcony);
      }
      for (const t of [t0, t1]) {
        const [p0, p1] = [foot(t, 0), foot(t, 1.5)];
        s.body.quad([p0[0], floor + baseH, p0[1]], [p0[0], shaftTop, p0[1]], [p1[0], shaftTop, p1[1]], [p1[0], floor + baseH, p1[1]], white);
      }
    }
  });

  return s.finish('#f2e2c4', 0.62);
}
