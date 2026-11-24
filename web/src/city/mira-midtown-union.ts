import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';

/**
 * Mira at Midtown Union, 1301 Spring Street NW (completed 2022): a 26-storey apartment tower. A
 * nine-level garage podium is wrapped in a faceted screen of light and mid-grey panels laid in
 * diagonal chevrons with yellow accent slots; above it, an L-plan slab along Spring Street wears a
 * white concrete frame of two-storey cells over dark recessed balconies, with a few yellow and
 * orange accent panels. The site postdates the 2019 lidar, so heights are inferred: 26 storeys
 * (Midtown Alliance): nine garage levels (OSM min_level 9) and 17 residential floors. Evidence:
 * docs/log/ui/mira-midtown-union/README.md.
 */
export const miraId = 'osm:way:1297223462';
const towerId = 'osm:way:1453246987';

// Inferred: a 28.8 m podium (mapped parts) plus 17 residential floors of 3.05 m and a 1.5 m parapet.
const podiumH = 28.8, floorH = 3.05, floors = 17, parapetH = 1.5;
const towerH = podiumH + floors * floorH + parapetH;

// Flat vertex colours: a library surface is a hooked material the batcher never merges.
const screenLight = '#d9d9d6', screenMid = '#8e9193', accent = '#e0a52a', frame = '#efeeea';
const recess = '#68717a', recessLit = '#6a737c', storefront = '#33404a', roof = '#9a9b97';

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;

function ccw(ring: P2[]): P2[] {
  let area = 0;
  ring.forEach(([x, z], i) => { const [a, b] = ring[(i + 1) % ring.length]; area += x * b - a * z; });
  return area > 0 ? ring : [...ring].reverse();
}

function panel(s: Shell, lit: boolean, a: P2, b: P2, t0: number, t1: number, lo: number, hi: number, out: number, color: string) {
  if (hi - lo < 0.05 || t1 <= t0) return;
  const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
  const p = (t: number, y: number) => [a[0] + t * dx + out * dz / l, y, a[1] + t * dz - out * dx / l];
  (lit ? s.lights : s.body).quad(p(t0, lo), p(t0, hi), p(t1, hi), p(t1, lo), color);
}

/** A sloped quad on a face: a diagonal stripe from (t0, lo) to (t1, hi), `w` wide along the face. */
function stripe(s: Shell, a: P2, b: P2, t0: number, t1: number, lo: number, hi: number, w: number, out: number, color: string) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
  const p = (t: number, y: number) => [a[0] + t * dx + out * dz / l, y, a[1] + t * dz - out * dx / l];
  const cl = (t: number) => Math.min(1, Math.max(0, t));
  s.body.quad(p(cl(t0), lo), p(cl(t1), hi), p(cl(t1 + w), hi), p(cl(t0 + w), lo), color);
}

export function createMira(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const tower = site.parts?.find(p => p.id === towerId);
  // The brookwood-south fragment is a podium strip only.
  const origin: P2 = tower ? [251, -4059] : [251, -4106];
  const s = landmarkShell(buildings, grid, site.id, 'Mira at Midtown Union', origin, [1, 0], [[0, 0]]);
  if (!s) return null;
  const floor = s.base + 0.35;
  const seed = seedOf(site.id);
  const local = (ring: [number, number][]): P2[] => ccw(ring.map(([x, z]): P2 => [x - origin[0], z - origin[1]]));
  // The site climbs about 4.6 m to the north-east: storefront and screen start from each edge's
  // higher end, so neither is buried on the uphill side.
  const street = (a: P2, b: P2) =>
    Math.max(floor, ...[a, b].map(([x, z]) => grid.sample(x + origin[0], z + origin[1]) ?? floor));

  // The podium: the whole fragment outline up to the garage roof, wrapped in the chevron screen.
  const podium = ccw(s.ring);
  s.prism(podium, s.base, floor + podiumH, screenMid, roof);
  podium.forEach((a, edge) => {
    const b = podium[(edge + 1) % podium.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    // Skip short runs and the tile cut at z = -4100, where the two fragments meet.
    const cut = -4100 - origin[1];
    if (length < 8 || (Math.abs(a[1] - cut) < 0.2 && Math.abs(b[1] - cut) < 0.2)) return;
    const ground = street(a, b), screen = ground + 4.5, roofY = floor + podiumH;
    panel(s, false, a, b, 0.02, 0.98, ground + 0.3, screen, 0.05, storefront);
    // Chevrons: light stripes rising one way on the lower half and the other way above it.
    const n = Math.max(2, Math.round(length / 7)), w = 2.6 / length, mid = screen + (roofY - screen) / 2;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      stripe(s, a, b, t, t + 0.6 / n, screen, mid, w, 0.06, screenLight);
      stripe(s, a, b, t + 0.6 / n, t, mid, roofY - 0.5, w, 0.06, screenLight);
    }
    // Yellow accent slots, one per screen bay at mid height (photo).
    for (let i = 0; i < n; i++) panel(s, false, a, b, (i + 0.45) / n, (i + 0.55) / n, mid - 1.2, mid + 0.4, 0.08, accent);
  });

  if (!tower?.rings.length) return s.finish('#f2e2c4', 0.62);

  // The tower: dark recessed balconies inside a white frame of two-storey cells.
  const plan = local(tower.rings[0]);
  const top = floor + towerH;
  s.prism(plan, floor + podiumH, top, recess, roof);
  plan.forEach((a, edge) => {
    const b = plan[(edge + 1) % plan.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 4) return;
    const cells = Math.max(1, Math.round(length / 6.5));
    // The frame runs 0.3 m past each end so neighbouring faces meet at convex corners; at the
    // inside corner of the L the overrun is buried in the other wing.
    const e = 0.3 / length;
    for (let i = 0; i <= cells; i++) {
      const t = i / cells, w = 0.6 / length;
      panel(s, false, a, b, Math.max(-e, t - w), Math.min(1 + e, t + w), floor + podiumH, top, 0.3, frame);
    }
    for (let f = 0; f <= floors; f += 2) {
      const yy = floor + podiumH + f * floorH;
      panel(s, false, a, b, -e, 1 + e, yy, yy + 1.0, 0.3, frame);
    }
    panel(s, false, a, b, -e, 1 + e, top - parapetH, top, 0.3, frame);
    // Lit flats (about three in ten) and a few photo-backed yellow accent panels.
    for (let f = 0; f < floors; f++) {
      const yy = floor + podiumH + f * floorH;
      for (let i = 0; i < cells; i++) {
        const t0 = (i + 0.12) / cells, t1 = (i + 0.88) / cells;
        if (litHash(seed, edge, f, i) < 0.3) panel(s, true, a, b, t0, t1, yy + 0.7, yy + floorH - 0.2, 0.05, recessLit);
        else if (length > 10 && litHash(seed, edge + 50, f, i) < 0.1) panel(s, false, a, b, t0, t0 + 0.3 / cells, yy + 0.2, yy + 1.2, 0.2, accent);
      }
    }
  });

  return s.finish('#f2e2c4', 0.62);
}
