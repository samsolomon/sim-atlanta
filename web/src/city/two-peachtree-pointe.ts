import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { simplifyRing } from './1010-midtown';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';

/**
 * Two Peachtree Pointe (1545 Peachtree, 2007, 18 floors). Its mapped outline crosses the
 * brookwood-south / brookwood-station seam at z = -4900; each board builds the parts it holds and
 * skips walls on the seam. Heights are NAVD88 metres from the USGS GA_Statewide_B2_2018 lidar
 * (docs/log/ui/two-peachtree-pointe/README.md).
 */
export const twoPeachtreePointeId = 'osm:way:269391972';
const BLOCK = 'osm:way:1456732493', CURVE = 'osm:way:1456732494', PODIUM = 'osm:way:331168492';
const seamZ = -4900;
const origin: P2 = [318, seamZ];

export const TWO_PEACHTREE_POINTE = {
  block: 353.9, curve: 357.1, crownEast: 360.0, crownWest: 365.5, podium: 309.2, grade: 287.7, floor: 3.68,
} as const;

// Glass under the base-value table (S 28, V 69); cream precast and silver crown from photographs.
const glass = '#7f9fb0', ribbon = '#c9cdd0', precast = '#ddd5c4', window = '#6c8594', crown = '#d6d3cb', canopy = '#e4e2dc',
  roof = '#9c9890', storefront = '#4a5a64';

export function createTwoPeachtreePointe(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const parts = site.parts ?? [];
  const north = site.rings[0].some(([, z]) => z < seamZ - 2);
  const probe: P2 = north ? [10, -25] : [10, 10];
  const s = landmarkShell(buildings, grid, site.id, 'Two Peachtree Pointe', origin, [1, 0], [probe]);
  if (!s) return null;
  const H = TWO_PEACHTREE_POINTE, seed = seedOf(twoPeachtreePointeId);
  const local = (ring: P2[]): P2[] => {
    const plan = ring.map(([x, z]): P2 => [x - origin[0], z - origin[1]]);
    const area = plan.reduce((sum, [x, z], i) => sum + x * plan[(i + 1) % plan.length][1] - plan[(i + 1) % plan.length][0] * z, 0);
    return area < 0 ? plan.reverse() : plan;
  };
  type Face = { a: P2; b: P2; length: number; n: P2 };
  /** Outward faces, without the seam (an interior wall shared with the other board). */
  const faces = (plan: P2[]): Face[] => plan.map((a, i) => {
    const b = plan[(i + 1) % plan.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return { a, b, length, n: [(b[1] - a[1]) / length, -(b[0] - a[0]) / length] as P2 };
  }).filter(f => f.length > 0.5 && !(Math.abs(f.a[1]) < 0.3 && Math.abs(f.b[1]) < 0.3));
  const at = (f: Face, t: number, y: number, d: number) =>
    [f.a[0] + t * (f.b[0] - f.a[0]) + d * f.n[0], y, f.a[1] + t * (f.b[1] - f.a[1]) + d * f.n[1]];
  const panel = (f: Face, l: number, r: number, lo: number, hi: number, d: number, colour: string, lit = false) =>
    (lit ? s.lights : s.body).quad(at(f, l, lo, d), at(f, l, hi, d), at(f, r, hi, d), at(f, r, lo, d), colour);
  const base = s.base;
  const floors = (top: number, from: number) => Math.floor((top - from) / H.floor);

  // Podium (north board): cream precast, a window band per floor and a storefront at grade.
  const podium = parts.find(p => p.id === PODIUM);
  if (podium) {
    const plan = local(podium.rings[0]);
    s.prism(plan, base, H.podium, precast, roof);
    faces(plan).forEach((f, face) => {
      if (f.length < 4) return;
      panel(f, 0.03, 0.97, H.grade + 0.4, H.grade + 4.4, 0.05, storefront);
      for (let k = 1, y = H.grade + 5.2; y + 3 < H.podium; k++, y += H.floor) {
        panel(f, 0.03, 0.97, y + 0.9, y + 2.9, 0.05, window, litHash(seed, 40 + face, k, 0) < 0.08);
      }
    });
  }

  // Block: cream precast grid of punched windows (glass wall, piers every 3 m, spandrels per floor).
  // The seam clip can leave the block in more than one fragment; draw each.
  parts.filter(p => p.id === BLOCK).forEach((block, fragment) => {
    const plan = local(block.rings[0]);
    s.prism(plan, base, H.block, window, roof);
    const blockFaces = faces(plan);
    // Both boards hold an east run; the canopy goes on the brookwood-south clip (south of the seam).
    const entrance = !north
      ? blockFaces.filter(f => f.n[0] > 0.9).sort((p, q) => q.length - p.length)[0] : undefined;
    blockFaces.forEach((f, face) => {
      const lo = f.a[1] < -20 && f.b[1] < -20 ? H.podium : H.grade;
      const piers = Math.max(1, Math.round(f.length / 3));
      for (let k = 0; k <= piers; k++) {
        const t = k / piers, w = 0.6 / f.length;
        panel(f, Math.max(0, t - w), Math.min(1, t + w), lo, H.block, 0.12, precast);
      }
      const n = floors(H.block - 1.5, lo);
      for (let j = 0; j <= n; j++) {
        const y = lo + j * H.floor;
        panel(f, 0, 1, y - 0.7, y + 0.7, 0.1, precast);
      }
      panel(f, 0, 1, H.block - 1.4, H.block + 0.6, 0.12, precast);
      // Base on Peachtree (east): a dark lobby storey and a flat entrance canopy seated on the
      // facade, projecting 2.4 m over the drive (photograph from Peachtree).
      if (f.n[0] > 0.9 && f.length > 12) {
        panel(f, 0.05, 0.95, H.grade + 0.3, H.grade + 5.6, 0.13, storefront);
      }
      // One canopy, on the longest Peachtree run (the entrance).
      if (f === entrance) {
        const [cx, , cz] = at(f, 0.5, 0, 0);
        s.body.box(2.4, 0.5, Math.min(12, f.length * 0.6), cx + 1.2, H.grade + 5.2, cz, canopy);
        s.lights.quad(at(f, 0.35, H.grade + 0.4, 0.15), at(f, 0.35, H.grade + 4.4, 0.15), at(f, 0.65, H.grade + 4.4, 0.15), at(f, 0.65, H.grade + 0.4, 0.15), storefront);
      }
      // Offices: about 6% of window bays lit at night.
      for (let j = 0; j < n; j++) for (let k = 0; k < piers; k++) {
        if (litHash(seed, fragment * 16 + face, j, k) >= 0.06) continue;
        const y = lo + j * H.floor;
        panel(f, k / piers + 0.6 / f.length, (k + 1) / piers - 0.6 / f.length, y + 0.7, y + H.floor - 0.7, 0.04, window, true);
      }
    });
  });

  // The curved bay: blue glass ribbons between silver spandrels, under the swept crown screen.
  const curve = parts.find(p => p.id === CURVE);
  if (curve) {
    const plan = simplifyRing(local(curve.rings[0]), 0.5);
    s.prism(plan, base, H.curve, glass, roof);
    const crownAt = (u: number) => H.crownEast + (H.crownWest - H.crownEast) * Math.min(1, Math.max(0, (-5 - u) / 30));
    faces(plan).forEach((f, face) => {
      const over = 0.4 / f.length, n = floors(H.curve - 2, H.grade + 5);
      for (let j = 1; j <= n; j++) {
        const y = H.grade + 5 + j * H.floor;
        if (y > H.curve - 2 * H.floor) break; // under the crown band
        panel(f, -over, 1 + over, y - 0.9, y + 0.5, 0.08, ribbon);
      }
      // Crown: the top two floors of the curve are a solid cream metal band, not glass, whose top
      // edge sweeps up toward the west (photographs; lidar crown 360-365.5 m). It sits on the face.
      const band = H.curve - 2 * H.floor, ya = crownAt(f.a[0]), yb = crownAt(f.b[0]);
      s.body.quad(at(f, -over, band, 0.12), at(f, -over, ya, 0.12), at(f, 1 + over, yb, 0.12), at(f, 1 + over, band, 0.12), crown);
      for (let j = 0; j < n; j++) {
        if (litHash(seed, 20 + face, j, 0) >= 0.06) continue;
        const y = H.grade + 5 + j * H.floor;
        if (y + H.floor > H.curve - 2 * H.floor) break;
        panel(f, 0.1, 0.9, y + 0.5, y + H.floor - 0.9, 0.04, glass, true);
      }
    });
  }
  return s.finish('#f2e2c0', 0.5);
}
