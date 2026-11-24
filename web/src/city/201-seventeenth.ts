import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';

/**
 * 201 17th Street, Atlantic Station (2007): a 17-storey office slab in reflective light-blue curtain
 * glass with crisp pale spandrel lines at every floor, a raised central spine, and a double-height
 * colonnade of white round columns along 17th Street over a recessed glass lobby. Evidence:
 * docs/log/ui/201-seventeenth/README.md.
 */
export const seventeenth201Id = 'osm:way:269542287';
const spineId = 'osm:way:1562299331';
const slabId = 'osm:way:1562299333';
const canopyIds = ['osm:way:1562299334', 'osm:way:1562299335'];

// Heights above the 2019 lidar ground ring (276.2 m NAVD88): slab 72.6 (median), spine 77.1.
const groundNavd = 276.2, slabH = 72.6, spineH = 77.1, lobbyH = 9, canopyH = 5.6;

// Flat vertex colours: a library surface is a hooked material the batcher never merges.
// Glass base #8aa6bd (photo: plain light-blue reflective glass; rendered check in the PR).
const glass = '#8aa6bd', glassLit = '#8ca8bf', spandrel = '#d4dbe0', mullion = '#b8c4cc';
const column = '#eceae4', soffit = '#e6e4de', lobby = '#41505a', roof = '#9a9d9b';

/** Offset a CCW ring by `d` metres along vertex bisectors (negative moves inward). */
function offset(ring: P2[], d: number): P2[] {
  const n = (a: P2, b: P2) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [dz / l, -dx / l]; };
  return ring.map((p, i) => {
    const [ax, az] = n(ring[(i + ring.length - 1) % ring.length], p), [bx, bz] = n(p, ring[(i + 1) % ring.length]);
    const ml = Math.hypot(ax + bx, az + bz) || 1, mx = (ax + bx) / ml, mz = (az + bz) / ml;
    const k = d / Math.max(0.5, mx * ax + mz * az);
    return [p[0] + mx * k, p[1] + mz * k];
  });
}

function ccw(ring: P2[]): P2[] {
  let area = 0;
  ring.forEach(([x, z], i) => { const [a, b] = ring[(i + 1) % ring.length]; area += x * b - a * z; });
  return area > 0 ? ring : [...ring].reverse();
}

export function create201Seventeenth(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const origin: P2 = [-284, -4187];
  const s = landmarkShell(buildings, grid, site.id, '201 17th Street', origin, [1, 0], [[0, 0], [-20, -10], [20, 10]]);
  if (!s) return null;
  const y = (h: number) => groundNavd + h;
  const seed = seedOf(site.id);
  const local = (ring: [number, number][]): P2[] => ccw(ring.map(([x, z]): P2 => [x - origin[0], z - origin[1]]));
  const panel = (lit: boolean, a: P2, b: P2, t0: number, t1: number, lo: number, hi: number, out: number, color: string) => {
    if (hi - lo < 0.05 || t1 <= t0) return;
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    const p = (t: number, yy: number) => [a[0] + t * dx + out * dz / l, yy, a[1] + t * dz - out * dx / l];
    (lit ? s.lights : s.body).quad(p(t0, lo), p(t0, hi), p(t1, hi), p(t1, lo), color);
  };

  let slab: P2[] | null = null, spine: P2[] | null = null;
  for (const part of site.parts ?? []) {
    if (!part.rings.length) continue;
    const plan = local(part.rings[0]);
    if (part.id === slabId) slab = plan;
    else if (part.id === spineId) spine = plan;
    else if (canopyIds.includes(part.id)) s.prism(plan, y(canopyH) - 0.6, y(canopyH), soffit, soffit);
  }
  if (!slab) return null;

  // The slab: a recessed glass lobby under a white soffit, then curtain glass to the roof.
  s.prism(slab, y(lobbyH) - 1, y(slabH), glass, roof);
  s.prism(offset(slab, -1.8), s.base, y(lobbyH) - 1, lobby, soffit);
  if (spine) s.prism(spine, y(slabH), y(spineH), glass, roof);

  const faces = (plan: P2[], lo: number, hi: number, edgeSeed: number) => plan.forEach((a, edge) => {
    const b = plan[(edge + 1) % plan.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 4) return;
    const floors = Math.round((hi - lo) / 3.9), pitch = (hi - lo) / floors;
    for (let f = 1; f <= floors; f++) panel(false, a, b, 0, 1, lo + f * pitch - 0.55, lo + f * pitch, 0.08, spandrel);
    const ribs = Math.max(1, Math.round(length / 4.5));
    for (let i = 1; i < ribs; i++) panel(false, a, b, i / ribs - 0.12 / length, i / ribs + 0.12 / length, lo, hi, 0.06, mullion);
    // Offices at 23:30: about one bay in twenty, two ribs wide.
    const bays = Math.max(1, Math.round(ribs / 2));
    for (let f = 0; f < floors; f++)
      for (let i = 0; i < bays; i++) {
        if (litHash(seed, edge + edgeSeed, f, i) >= 0.05) continue;
        panel(true, a, b, (i + 0.05) / bays, (i + 0.95) / bays, lo + f * pitch + 0.1, lo + (f + 1) * pitch - 0.65, 0.04, glassLit);
      }
  });
  faces(slab, y(lobbyH), y(slabH), 0);
  if (spine) faces(spine, y(slabH), y(spineH), 40);

  // The base: a dark recessed lobby behind a colonnade of white round columns (as square posts at
  // City range) under a white soffit band.
  slab.forEach((a, edge) => {
    const b = slab![(edge + 1) % slab!.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 8) return;
    panel(false, a, b, 0, 1, y(lobbyH) - 1, y(lobbyH), 0.1, soffit);
    const cols = Math.max(2, Math.round(length / 9));
    for (let i = 0; i <= cols; i++) {
      const t = i / cols, w = 0.45 / length;
      // On the wall line, so each column meets the soffit and slab above it.
      panel(false, a, b, Math.max(0, t - w), Math.min(1, t + w), s.base, y(lobbyH) - 1, 0, column);
    }
  });

  return s.finish('#f2ead9', 0.6);
}
