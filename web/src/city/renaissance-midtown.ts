import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

/**
 * Renaissance Atlanta Midtown Hotel (866 West Peachtree): a 21-storey slab of
 * tan precast with punched windows over a dark podium, and a recessed glass
 * slot down the middle of each narrow end. Lidar (April 2019): roof p50 61.5,
 * p95 66.5 m above grade; the mapped 64 m stands. The roof sign is a logo and
 * is left off.
 */
export const renaissanceId = 'osm:way:234888045';

const precast = '#c6bba8',
  slot = '#8d9ba4',
  podium = '#565a5c',
  glass = '#8a9499',
  storefront = '#66737a',
  roofDeck = '#a6a39c';

export function createRenaissanceMidtown(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const s = landmarkShell(buildings, grid, site.id, 'Renaissance Atlanta Midtown', [354, -2718.7], [1, 0],
    [[0, 0], [-20, 0], [20, 0]]);
  if (!s) return null;
  const seed = seedOf(renaissanceId);
  const g0 = s.base + 0.35;
  const podiumTop = g0 + 9, floors = 18, pitch = 3, top = podiumTop + floors * pitch, // 63 m
    parapet = g0 + 64, plant = g0 + 66.5;

  const area = s.ring.reduce((t, [x, z], i) => {
    const [x2, z2] = s.ring[(i + 1) % s.ring.length];
    return t + x * z2 - x2 * z;
  }, 0);
  const plan = area > 0 ? s.ring : [...s.ring].reverse();

  s.prism(plan, s.base, podiumTop, podium, roofDeck);
  s.prism(plan, podiumTop, top, precast, roofDeck);
  s.prism(plan, top, parapet, precast, roofDeck);
  s.body.box(12, plant - parapet, 9, -4, (plant + parapet) / 2, 0, '#b3ada2');

  plan.forEach((a, face) => {
    const b = plan[(face + 1) % plan.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    if (len < 3) return;
    const at = (t: number, y: number, out: number) => [a[0] + t * dx + out * dz / len, y, a[1] + t * dz - out * dx / len];
    const quad = (l: number, r: number, y0: number, y1: number, out: number, c: string, lit = false) =>
      (lit ? s.lights : s.body).quad(at(l, y0, out), at(l, y1, out), at(r, y1, out), at(r, y0, out), c);
    const narrow = Math.abs(dz) > Math.abs(dx);
    if (narrow) {
      // Recessed glass slot down the middle of the end, with its own lit rooms.
      quad(0.38, 0.62, podiumTop, parapet, 0.04, slot);
      litFacade(s, seed, face + 16, at(0.38, 0, 0.06).filter((_, i) => i !== 1) as P2,
        at(0.62, 0, 0.06).filter((_, i) => i !== 1) as P2, podiumTop, top, floors, len * 0.12, 0.9, 0.8, [slot], 0.3);
    }
    // Hotel rooms: punched windows, noticeably lit at night.
    const bays = Math.max(1, Math.round(len / 3.2));
    if (!narrow || len > 12) litFacade(s, seed, face, a, b, podiumTop, top, floors, len / bays, narrow ? 0.3 : 0.45, 0.5, [glass], 0.3);
    // Podium: storefront glazing lit, a dark canopy band over it.
    quad(0.03, 0.97, g0 + 0.3, g0 + 4.6, 0.05, storefront, true);
    quad(0, 1, g0 + 4.6, g0 + 5.4, 0.3, '#3d4143');
  });
  return s.finish('#f5d8a8', 0.55);
}
