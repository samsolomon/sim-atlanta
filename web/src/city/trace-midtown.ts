import type { GroundGrid } from '../terrain/grid';
import type { TerrainQuality } from '../terrain/surface';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

export const traceMidtownId = 'osm:way:492105275';
const origin: P2 = [584, -2440];
const towerId = 'osm:way:1345268687';
const retailId = 'osm:way:1345268686';

// Heights from the April 2019 lidar (90th-percentile returns on an 8 m grid, ground 303.7 m
// NAVD88): the E-shaped residential block reads 38–41 m (mapped 42.9 m), and the two courtyard
// decks over the garage podium read 11–16 m with planters, so the deck is set at 11.5 m.
export function createTraceMidtown(buildings: VBuilding[], site: VBuilding, grid: GroundGrid, quality: TerrainQuality) {
  const high = quality === 'high';
  const parts = site.parts ?? [];
  const towerPart = parts.find(p => p.id === towerId);
  const podiumPart = parts.find(p => p.id === 'podium');
  const retailPart = parts.find(p => p.id === retailId);
  if (!towerPart?.rings.length || !podiumPart?.rings.length) return null;
  const shell = landmarkShell(buildings, grid, site.id, 'Trace Midtown', origin, [1, 0], [[0, -20], [-48, -15], [40, 10]]);
  if (!shell) return null;
  const seed = seedOf(site.id);
  let face = 0;
  const ccw = (ring: P2[]): P2[] => {
    const area = ring.reduce((sum, [x, z], i) => {
      const [nx, nz] = ring[(i + 1) % ring.length];
      return sum + x * nz - nx * z;
    }, 0);
    return area < 0 ? [...ring].reverse() : ring;
  };
  const local = (ring: P2[]) => ccw(ring.map(([x, z]): P2 => [x - origin[0], z - origin[1]]));
  const inside = (x: number, z: number, ring: P2[]) => {
    let hit = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, zi] = ring[i], [xj, zj] = ring[j];
      if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit;
    }
    return hit;
  };
  const datum = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const roof = datum + 39.5, deck = datum + 11.5, shop = datum + 8, ground = datum + 5;
  const tower = local(towerPart.rings[0]);
  const podium = local(podiumPart.rings[0]);
  const retail = retailPart?.rings.length ? local(retailPart.rings[0]) : null;
  const masses = [{ ring: tower, top: roof }, { ring: podium, top: deck }, ...(retail ? [{ ring: retail, top: shop }] : [])];
  const covered = (a: P2, b: P2, length: number) => {
    const mx = (a[0] + b[0]) / 2 + 0.6 * (b[1] - a[1]) / length;
    const mz = (a[1] + b[1]) / 2 - 0.6 * (b[0] - a[0]) / length;
    return Math.max(datum, ...masses.filter(m => inside(mx, mz, m.ring)).map(m => m.top));
  };
  const edges = (ring: P2[], draw: (a: P2, b: P2, length: number) => void) =>
    ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length > 1.2) draw(a, b, length);
    });
  // Pale stone-coloured walls with white pilasters and dark metal balconies, as in the listing aerial.
  const wall = '#e2dccf', trim = '#f4f2ec', rail = '#4f565a', roofColor = '#c9c6bc';
  const windows = ['#8a9ba5', '#91a1aa'];
  const storefront = ['#6a7b84', '#6e818a'];
  const pitch = (roof - 0.9 - ground) / 11;

  shell.prism(tower, shell.base, roof, wall, roofColor);
  edges(tower, (a, b, length) => {
    const lo = covered(a, b, length);
    if (roof - lo < 1) return;
    const street = lo <= datum + 0.01;
    if (street && (high || length > 4)) litFacade(shell, seed, face++, a, b, datum + 0.4, ground - 0.4, 1, high ? 3.4 : 10, 0.84, 0.84, storefront, 0.35);
    const from = street ? ground : lo + 0.3;
    const floors = Math.max(1, Math.round((roof - 0.9 - from) / pitch));
    // Low tier groups floors in pairs and leaves short jogs plain; high keeps every window.
    if (high || length > 4) litFacade(shell, seed, face++, a, b, from, roof - 0.9, high ? floors : Math.ceil(floors / 2), high ? 2.8 : 5.6, high ? 0.55 : 0.66, high ? 0.6 : 0.72, windows, 0.32);
    const out = (t: number, y: number, d: number): [number, number, number] =>
      [a[0] + t * (b[0] - a[0]) + d * (b[1] - a[1]) / length, y, a[1] + t * (b[1] - a[1]) - d * (b[0] - a[0]) / length];
    // White cornice band at the roof line.
    shell.body.quad(out(0, roof - 0.9, 0.12), out(0, roof, 0.12), out(1, roof, 0.12), out(1, roof - 0.9, 0.12), trim);
    // Identifying feature 1: white pilaster bays give the pale stone walls a vertical rhythm.
    const bays = Math.max(1, Math.round(length / (high ? 7.5 : 15)));
    for (let k = 0; k <= bays; k++) {
      const t = k / bays, w = 0.5 / length;
      shell.body.quad(out(Math.max(0, t - w), from, 0.15), out(Math.max(0, t - w), roof - 0.9, 0.15),
        out(Math.min(1, t + w), roof - 0.9, 0.15), out(Math.min(1, t + w), from, 0.15), trim);
    }
    // Identifying feature 2: vertical stacks of small dark balconies between the bays.
    if (length > 16) {
      const cols = length > 40 ? [0.3, 0.7] : [0.5];
      for (const c of cols) {
        const l = c - 1.6 / length, r = c + 1.6 / length;
        if (!high) {
          // Low tier: each stack reads as one dark vertical strip on the wall.
          shell.body.quad(out(l, from + pitch, 0.25), out(l, roof - 0.9, 0.25), out(r, roof - 0.9, 0.25), out(r, from + pitch, 0.25), rail);
          continue;
        }
        for (let f = 1; f < floors; f++) {
          const y = from + f * pitch;
          // Slab from the wall to the rail (both windings), then the rail on its edge.
          shell.body.quad(out(r, y, 0.02), out(r, y, 1.1), out(l, y, 1.1), out(l, y, 0.02), trim);
          shell.body.quad(out(l, y, 0.02), out(l, y, 1.1), out(r, y, 1.1), out(r, y, 0.02), trim);
          shell.body.quad(out(l, y, 1.1), out(l, y + 1, 1.1), out(r, y + 1, 1.1), out(r, y, 1.1), rail);
        }
      }
    }
  });

  // Raised parapet pavilions at the long outer corners and over the Peachtree centre.
  const pavilion = (c: P2, u: P2, v: P2, size: number) => {
    const p = (s: number, t: number): P2 => [c[0] + u[0] * s + v[0] * t, c[1] + u[1] * s + v[1] * t];
    shell.prism(ccw([p(0, 0), p(size, 0), p(size, size), p(0, size)]), roof, roof + 4.5, trim, '#e9e7e0');
  };
  // Corner pavilions at the block's four main outer corners (local metres, inset into the block).
  pavilion([45.5, -20.5], [0, 1], [-1, 0], 10);
  pavilion([42, 33], [0, -1], [-1, 0], 10);
  pavilion([-56, -31.5], [0, 1], [1, 0], 10);
  pavilion([-58.5, 5.5], [0, -1], [1, 0], 10);
  // Peachtree (east) centre bay.
  pavilion([45.5, -1], [0, 1], [-1, 0], 10);

  // Garage podium: courtyard decks on top, dark screens below, retail glass on the street.
  shell.prism(podium, shell.base, deck, '#d9d8d1', '#a8a596');
  edges(podium, (a, b, length) => {
    const lo = covered(a, b, length);
    if (deck - lo < 1) return;
    litFacade(shell, seed, face++, a, b, datum + 0.4, ground - 0.4, 1, high ? 3.4 : 10, 0.84, 0.84, storefront, 0.35);
    litFacade(shell, seed, face++, a, b, ground + 0.3, deck - 0.6, 2, 1e4, 0.96, 0.5, ['#3e4547'], 0);
  });
  // Pool and planting on the two courtyard decks.
  shell.prism(ccw([[-33, 0], [-17, 1.3], [-17.6, 11], [-33.8, 9.7]]), deck, deck + 0.05, '#5aa8c4', '#5aa8c4');
  shell.prism(ccw([[12, 4], [24, 5], [23, 22], [11, 21]]), deck, deck + 0.4, '#6d8a57', '#7a985e');
  if (retail) {
    shell.prism(retail, shell.base, shop, '#d6d4cd', '#9c9a93');
    edges(retail, (a, b) => litFacade(shell, seed, face++, a, b, datum + 0.4, shop - 0.6, 1, high ? 3.4 : 10, 0.86, 0.86, storefront, 0.4));
  }
  return shell.finish('#f4d9a8', 0.62);
}
