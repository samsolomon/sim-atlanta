import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

/**
 * The Landmark (1963) at 215 Piedmont Avenue: a 21-storey residential slab of
 * tan brick, with pale concrete end walls and corner fins, and bands of paired
 * windows on the long faces. The mapped 86 m is wrong; the April 2019 lidar puts
 * the roof at p50 62.5, p95 67.9 m above grade.
 */
export const landmarkId = '53f15907-13e9-40e0-898e-bec4f841a951';

const brick = '#a38672',
  concrete = '#d9d4c8',
  glass = '#8a9499',
  storefront = '#5d6a70',
  roofDeck = '#a9a59d';

export function createTheLandmark(buildings: VBuilding[], grid: GroundGrid) {
  const origin: P2 = [921.9, -691.9];
  const s = landmarkShell(buildings, grid, landmarkId, 'The Landmark', origin, [44.3, -23],
    [[0, 0], [-15, 0], [15, 0]]);
  if (!s) return null;
  const seed = seedOf(landmarkId);
  const g0 = s.base + 0.35;
  const lobby = g0 + 4.6, floors = 20, pitch = 2.95,
    roof = lobby + floors * pitch, // ≈ 63.6 m
    parapet = roof + 1, penthouse = g0 + 67.9;

  // Wind the plan so faces have the building on their left, as litFacade expects.
  const area = s.ring.reduce((t, [x, z], i) => {
    const [x2, z2] = s.ring[(i + 1) % s.ring.length];
    return t + x * z2 - x2 * z;
  }, 0);
  const plan = area > 0 ? s.ring : [...s.ring].reverse();

  s.prism(plan, s.base, lobby, storefront, roofDeck);
  s.prism(plan, lobby, roof, brick, roofDeck);
  s.prism(plan, roof, parapet, concrete, roofDeck);
  s.body.box(10, penthouse - parapet, 7, 0, (penthouse + parapet) / 2, 0, concrete);

  plan.forEach((a, face) => {
    const b = plan[(face + 1) % plan.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    if (len < 0.2) return;
    const at = (t: number, y: number, out: number) => [a[0] + t * dx + out * dz / len, y, a[1] + t * dz - out * dx / len];
    const quad = (l: number, r: number, y0: number, y1: number, out: number, c: string, lit = false) =>
      (lit ? s.lights : s.body).quad(at(l, y0, out), at(l, y1, out), at(r, y1, out), at(r, y0, out), c);
    // The brick field is the middle of each long face (|u| < 12 m); the wings
    // either side and the narrow ends are pale concrete, as photographed.
    const alongLong = Math.abs(dx) > Math.abs(dz) * 2;
    const field = alongLong && Math.abs((a[0] + b[0]) / 2) < 12 && len > 8;
    if (field) {
      // Paired windows in brick: an even grid, then wider brick piers between pairs.
      const pairs = Math.max(1, Math.round(len / 4.2));
      litFacade(s, seed, face, a, b, lobby + 0.3, roof - 0.2, floors, len / (2 * pairs), 0.8, 0.55, [glass, '#8f979b'], 0.26);
      for (let k = 1; k < pairs; k++) quad(k / pairs - 0.45 / len, k / pairs + 0.45 / len, lobby, roof, 0.09, brick);
    } else {
      quad(0, 1, lobby, parapet, 0.05, concrete);
      if (len > 5) litFacade(s, seed, face, a, b, lobby + 0.3, roof - 0.2, floors, len / 2, 0.25, 0.55, [glass], 0.2);
    }
    // Lobby glazing, lit at night.
    quad(0.04, 0.96, g0 + 0.3, lobby - 0.5, 0.04, storefront, true);
  });

  return s.finish('#f4d6a6', 0.55);
}
