import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';

/**
 * Crowne Plaza Atlanta Midtown, 590 West Peachtree (1972, dual-branded with Staybridge Suites): a
 * white hotel slab running east–west on a low white podium, just south of One Georgia Center. The
 * long north and south faces are a white grid of piers and floor slabs over recessed dark windows;
 * the narrow east and west ends are blank white walls. Evidence, estimates and gaps:
 * docs/log/ui/crowne-plaza-midtown/README.md.
 */
export const crownePlazaId = 'osm:way:234939892';
const towerId = 'osm:way:1456370858';

// Heights above the 2019 lidar ground ring (303.2 m NAVD88): tower roof 81.2 (median), podium 17.1.
const groundNavd = 303.2, roofH = 81.2, podiumH = 17.1, parapetH = 1.2;
const pitch = 3.2, pierPitch = 3.8;

// Flat vertex colours: a painted library surface compiles its own shader program.
// Window glass #87949a: S 0.13, V 0.60 (recessed between white piers; rendered check in the PR).
const white = '#ece9e1', whiteShade = '#d8d4ca', glass = '#87949a', glassLit = '#89969c';
const podiumWall = '#e2ded5', podiumGlass = '#4e5c63', roof = '#a3a49e';

function ccw(ring: P2[]): P2[] {
  let area = 0;
  ring.forEach(([x, z], i) => { const [a, b] = ring[(i + 1) % ring.length]; area += x * b - a * z; });
  return area > 0 ? ring : [...ring].reverse();
}

/** Drop vertices on a straight run, so each wall is one edge. */
function straighten(ring: P2[]): P2[] {
  return ring.filter((p, i) => {
    const a = ring[(i + ring.length - 1) % ring.length], b = ring[(i + 1) % ring.length];
    const u = Math.atan2(p[1] - a[1], p[0] - a[0]), v = Math.atan2(b[1] - p[1], b[0] - p[0]);
    return Math.abs(Math.atan2(Math.sin(v - u), Math.cos(v - u))) > Math.PI / 180;
  });
}

export function createCrownePlaza(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const tower = site.parts?.find(p => p.id === towerId);
  if (tower?.rings.length !== 1) return null;
  const origin: P2 = [310, -1814];
  const s = landmarkShell(buildings, grid, site.id, 'Crowne Plaza Atlanta Midtown', origin, [1, 0], [[0, 0], [-40, -10], [50, -10]]);
  if (!s) return null;
  const y = (h: number) => groundNavd + h;
  const seed = seedOf(site.id);
  const panel = (lit: boolean, a: P2, b: P2, t0: number, t1: number, lo: number, hi: number, out: number, color: string) => {
    if (hi - lo < 0.05 || t1 <= t0) return;
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    const p = (t: number, yy: number) => [a[0] + t * dx + out * dz / l, yy, a[1] + t * dz - out * dx / l];
    (lit ? s.lights : s.body).quad(p(t0, lo), p(t0, hi), p(t1, hi), p(t1, lo), color);
  };

  // The podium under everything: white panels over a dark storefront band, following the grade.
  const podium = straighten(ccw(s.ring));
  s.prism(podium, s.base, y(podiumH), podiumWall, roof);
  podium.forEach((a, i) => {
    const b = podium[(i + 1) % podium.length];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 8) return;
    const street = Math.max(s.base + 0.35, ...[a, b].map(([x, z]) => grid.sample(x + origin[0], z + origin[1]) ?? -Infinity));
    panel(false, a, b, 0.02, 0.98, street + 0.3, Math.min(street + 4.5, y(podiumH) - 2), 0.05, podiumGlass);
    if (y(podiumH) - street > 9) panel(false, a, b, 0.02, 0.98, street + 7, street + 8.2, 0.05, podiumGlass);
  });

  // The slab: a dark window box, white parapet, and the white grid on the long faces.
  const plan = straighten(ccw(tower.rings[0].map(([x, z]): P2 => [x - origin[0], z - origin[1]])));
  s.prism(plan, y(podiumH), y(roofH), glass, roof);
  const floors = Math.floor((roofH - parapetH - podiumH) / pitch);
  plan.forEach((a, edge) => {
    const b = plan[(edge + 1) % plan.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    if (length < 3) return;
    panel(false, a, b, 0, 1, y(roofH - parapetH), y(roofH), 0.02, white);
    // East and west ends are blank white walls, as are the short sides of the north-face jog.
    if (Math.abs(dz) > Math.abs(dx)) {
      panel(false, a, b, 0, 1, y(podiumH), y(roofH - parapetH), 0.02, white);
      return;
    }
    const bays = Math.round(length / pierPitch);
    for (let i = 0; i <= bays; i++) {
      const t = i / bays, w = 0.45 / length;
      panel(false, a, b, Math.max(0, t - w), Math.min(1, t + w), y(podiumH), y(roofH - parapetH), 0.45, white);
    }
    for (let f = 1; f <= floors; f++) {
      const h = y(podiumH + f * pitch);
      panel(false, a, b, 0, 1, h - 0.6, h, 0.45, whiteShade);
    }
    // A hotel at 23:30: about three rooms in ten lit.
    for (let f = 0; f < floors; f++) {
      const lo = y(podiumH + f * pitch);
      for (let i = 0; i < bays; i++) {
        if (litHash(seed, edge, f, i) >= 0.3) continue;
        panel(true, a, b, (i + 0.12) / bays, (i + 0.88) / bays, lo + 0.1, lo + pitch - 0.7, 0.06, glassLit);
      }
    }
  });
  // Rooftop plant.
  s.prism([[0, -6], [18, -6], [18, 6], [0, 6]], y(roofH), y(roofH + 3.5), '#b4b5ae', '#9c9d97');

  return s.finish('#f2e2c4', 0.62);
}
