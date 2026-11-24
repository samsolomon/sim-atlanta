import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

/**
 * 271 17th Street (TVS, 2009), Atlantic Station's tallest office tower: dark glass in two offset
 * masses, the east one ruled by continuous vertical mullions and the west one by Streamline
 * Moderne horizontal bands. A 20 ft glass parapet rings the roof. Seven parking levels sit under
 * a lobby level and 20 office floors. The roof tenant's sign and the 18 ft street numbers are
 * left out. Evidence, estimates and gaps: docs/log/ui/271-seventeenth/README.md.
 */
export const seventeenth271Id = 'osm:way:269542282';

// Heights above the lidar ground ring (276.2 m NAVD88), from the April 2019 returns: roof 107
// (median 106.8), parapet rim 113.5 (p95 113.4) and penthouse 113. A 20 m notch at the north-west
// corner reads 103 m; it is not modelled.
const roofH = 107, parapetH = 113.5, penthouseH = 113;
const groundNavd = 276.2;
const parkingTop = 22, lobbyTop = 28.4, officePitch = (roofH - lobbyTop) / 20;
// Where the vertical-mullion mass hands over to the banded mass, as a share of each long face
// measured from its east end (the aerial from the north shows about 38%).
const split = 0.38;

// Flat vertex colours, not library surfaces: a painted mesh compiles its own program.
const glass = '#6a8694', glassLit = '#6c8896', mullion = '#b3c0c6', band = '#dde2e2';
const parapetGlass = '#7a95a2', deckGlass = '#58707c', roofDeck = '#7d817f';

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;

function ccw(ring: P2[]): P2[] {
  let area = 0;
  ring.forEach(([x, z], i) => { const [a, b] = ring[(i + 1) % ring.length]; area += x * b - a * z; });
  return area > 0 ? ring : [...ring].reverse();
}

function hash(a: number, b: number, c: number) {
  let h = Math.imul(a, 0x27d4eb2d) ^ Math.imul(b, 0x165667b1) ^ Math.imul(c, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function panel(s: Shell, lit: boolean, a: P2, b: P2, t0: number, t1: number, lo: number, hi: number, out: number, color: string) {
  if (hi - lo < 0.05 || t1 <= t0) return;
  const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
  const p = (t: number, y: number) => [a[0] + t * dx + out * dz / length, y, a[1] + t * dz - out * dx / length];
  (lit ? s.lights : s.body).quad(p(t0, lo), p(t0, hi), p(t1, hi), p(t1, lo), color);
}

export function create271Seventeenth(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const origin: P2 = [-376, -4187];
  const s = landmarkShell(buildings, grid, site.id, '271 Seventeenth Street', origin, [1, 0], [[0, 0], [-30, -12], [30, 10]]);
  if (!s) return null;
  // Shell coordinates are NAVD88 metres (landmarkShell offsets the group by the scene zero).
  const y = (h: number) => groundNavd + h;
  const plan = ccw(s.ring);

  s.prism(plan, s.base, y(roofH), glass, roofDeck);

  const xs = plan.map(([x]) => x), east = Math.max(...xs), west = Math.min(...xs);
  plan.forEach((a, edge) => {
    const b = plan[(edge + 1) % plan.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    if (length < 3) return;
    // Long faces run east-west; the share of a face east of the split takes vertical mullions.
    const splitX = east - split * (east - west);
    const tSplit = Math.abs(dx) > 1 ? Math.min(1, Math.max(0, (splitX - a[0]) / dx)) : (a[0] > splitX) === (dx >= 0) ? 0 : 1;
    const eastRange: [number, number] = dx >= 0 ? [tSplit, 1] : [0, tSplit];
    const westRange: [number, number] = dx >= 0 ? [0, tSplit] : [tSplit, 1];
    const top = y(roofH);

    // Parking levels read as dark spandrel glass with thin floor lines; the lobby is tall glass.
    panel(s, false, a, b, 0, 1, s.base + 0.3, y(parkingTop), 0.04, deckGlass);
    for (let h = 3.1; h < parkingTop; h += 3.1) panel(s, false, a, b, 0, 1, y(h) - 0.12, y(h) + 0.12, 0.06, mullion);
    panel(s, false, a, b, 0, 1, y(lobbyTop) - 0.4, y(lobbyTop), 0.06, mullion);

    // West mass: Streamline bands at every office floor.
    for (let f = 1; f <= 20; f++) {
      const h = lobbyTop + f * officePitch;
      if (y(h) > top + 0.01) break;
      panel(s, false, a, b, westRange[0], westRange[1], y(h) - 1.0, y(h) - 0.05, 0.12, band);
    }
    // East mass: vertical mullions about 4.5 m apart, full height.
    const span = (eastRange[1] - eastRange[0]) * length;
    const ribs = Math.round(span / 4.5);
    for (let i = 1; i < ribs; i++) {
      const t = eastRange[0] + (eastRange[1] - eastRange[0]) * i / ribs, w = 0.22 / length;
      panel(s, false, a, b, t - w, t + w, y(lobbyTop), top, 0.1, mullion);
    }

    // Offices at 23:30: about one pane in twenty, fewer near the top.
    const bays = Math.max(1, Math.round(length / 4.5));
    for (let f = 0; f < 20; f++) {
      const lo = y(lobbyTop + f * officePitch);
      if (lo + officePitch > top + 0.01) break;
      for (let i = 0; i < bays; i++) {
        if (hash(f, i, edge * 13 + 7) >= (f > 16 ? 0.03 : 0.05)) continue;
        panel(s, true, a, b, i / bays + 0.04 / bays, (i + 1) / bays - 0.04 / bays, lo + 0.1, lo + officePitch - 0.6, 0.08, glassLit);
      }
    }

    // The 20 ft glass parapet, flush with the wall.
    panel(s, false, a, b, 0, 1, y(roofH), y(parapetH), 0, parapetGlass);
  });

  // The penthouse the lidar finds in the middle of the roof.
  const pent: P2[] = [[-390, -4193], [-357, -4193], [-357, -4181], [-390, -4181]].map(([x, z]): P2 => [x - origin[0], z - origin[1]]);
  s.prism(ccw(pent), y(roofH), y(penthouseH), '#8b908e', '#9a9e9b');

  const built = s.finish('#f2e6cf', 0.6);
  // Lamps share the body's shadow flags, so they batch with it and darken in shade by day.
  built.group.children.forEach(m => { m.castShadow = m.receiveShadow = true; });
  return built;
}
