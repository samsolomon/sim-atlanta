import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';

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
const lobbyTop = 28.4, officePitch = (roofH - lobbyTop) / 20;
// Where the vertical-mullion mass hands over to the banded mass, as a share of each long face
// measured from its east end (the aerial from the north shows about 38%).
const split = 0.38;

// Flat vertex colours, not library surfaces: a painted mesh compiles its own program.
const glass = '#7e8c94', glassLit = '#808e96', mullion = '#b3c0c6', band = '#dde2e2';
// Strengthening (recognition audit, 2026-11-24), from Dec 2025 Street View: the parking levels are
// clad in large mid-grey panels with a visible joint grid, over a glazed lobby with round columns,
// and the 20 ft glass parapet reads as a lighter band. The glass value is unchanged.
const parapetGlass = '#b4c1c7', roofDeck = '#7d817f';
const panelWall = '#8e9294', joint = '#6f7375', lobbyGlass = '#3e4a51', column = '#e4e2dc';

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;

function ccw(ring: P2[]): P2[] {
  let area = 0;
  ring.forEach(([x, z], i) => { const [a, b] = ring[(i + 1) % ring.length]; area += x * b - a * z; });
  return area > 0 ? ring : [...ring].reverse();
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
  const seed = seedOf(site.id);

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

    // Grade: a glazed lobby, lit at night, behind round columns about 9 m apart.
    panel(s, true, a, b, 0, 1, s.base + 0.3, y(6), 0.04, lobbyGlass);
    const cols = length < 20 ? 0 : Math.max(2, Math.round(length / 9));
    for (let i = 0; i <= cols; i++) {
      const t = i / cols, w = 0.4 / length;
      panel(s, false, a, b, Math.max(0, t - w), Math.min(1, t + w), s.base + 0.3, y(6.4), 0.12, column);
    }
    // Parking levels and the lobby floor above them: a grey panel wall with a joint grid
    // (rows plus columns), up to the lobby head.
    panel(s, false, a, b, 0, 1, y(6.4), y(lobbyTop), 0.04, panelWall);
    for (let h = 6.4 + 3.1; h < lobbyTop; h += 3.1) panel(s, false, a, b, 0, 1, y(h) - 0.12, y(h) + 0.12, 0.06, joint);
    // Vertical joints about 6 m apart (paired panels), enough to read as a panel grid at City range.
    const pans = length < 20 ? 1 : Math.max(1, Math.round(length / 6));
    for (let i = 1; i < pans; i++) panel(s, false, a, b, i / pans - 0.08 / length, i / pans + 0.08 / length, y(6.4), y(lobbyTop), 0.06, joint);
    panel(s, false, a, b, 0, 1, y(lobbyTop) - 0.5, y(lobbyTop), 0.08, band);

    // West mass: Streamline bands at every office floor.
    for (let f = 1; f <= 20; f++) {
      const h = lobbyTop + f * officePitch;
      if (y(h) > top + 0.01) break;
      panel(s, false, a, b, westRange[0], westRange[1], y(h) - 1.0, y(h) - 0.05, 0.12, band);
      // The Dec 2025 photos show the pale floor bands across the east mass too, slimmer.
      if (length > 20) panel(s, false, a, b, eastRange[0], eastRange[1], y(h) - 0.55, y(h) - 0.05, 0.12, band);
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
        if (litHash(seed, edge, f, i) >= (f > 16 ? 0.03 : 0.05)) continue;
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
  return built;
}
