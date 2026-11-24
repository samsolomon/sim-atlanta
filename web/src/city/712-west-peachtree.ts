import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';

export const westPeachtree712Id = 'osm:way:996610147';
const TOWER = 'osm:way:1344870476', CORE = 'osm:way:1344870473';
const origin: P2 = [357, -2258];

/**
 * 712 West Peachtree (2021, 23 floors) postdates the 2019 lidar, so heights follow the mapped
 * parts: the 88 m tower over most of the block, a 60 m core sliver on Spring Street and the
 * 25.2 m garage strip along the south. Photographs show deep blue reflective glass, dark
 * vertical reveals near each corner, two paler floors under the roof and a precast garage.
 */
export function create712WestPeachtree(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const parts = site.parts;
  const tower = parts?.find(p => p.id === TOWER), core = parts?.find(p => p.id === CORE);
  const podium = parts?.find(p => p.id === 'podium');
  if (!parts || !tower || !core || !podium) return null;
  const s = landmarkShell(buildings, grid, site.id, '712 West Peachtree', origin, [1, 0], [[0, 0], [-20, -25], [20, 25]]);
  if (!s) return null;
  const local = (ring: P2[]): P2[] => {
    const pts: P2[] = ring.map(([x, z]) => [x - origin[0], z - origin[1]]);
    const area = pts.reduce((sum, [x, z], i) => sum + x * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * z, 0);
    return area < 0 ? pts.reverse() : pts;
  };
  const datum = site.floorY === undefined ? s.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const roof = datum + tower.h, garageTop = datum + podium.h, seed = seedOf(westPeachtree712Id);
  // Glass value sits with the neighbouring curtain walls; spandrels and fins carry the rhythm.
  const blue = '#66819c', spandrel = '#8a9bad', fin = '#aab6c2', pale = '#97adc2', reveal = '#3d5168',
    transition = '#4a5d70', cap = '#c9ccd0', concrete = '#c3bfb6', slot = '#3b4148', roofGrey = '#8f918f';
  const FLOOR = 3.83;
  const top = roof - 7.7;

  const shaft = local(tower.rings[0]);
  s.prism(shaft, datum, top, blue, roofGrey);
  s.prism(shaft, top, roof, pale, roofGrey);
  s.prism(local(core.rings[0]), datum, datum + core.h, blue, roofGrey);

  // Precast garage with one open band per deck on its north, east and west faces.
  const garage = local(podium.rings[0]);
  s.prism(garage, datum, garageTop, concrete, roofGrey);
  const [gx0, gx1] = [Math.min(...garage.map(p => p[0])), Math.max(...garage.map(p => p[0]))];
  const gz1 = Math.max(...garage.map(p => p[1])), gz0 = Math.min(...garage.map(p => p[1]));
  for (let y = datum + 4.2; y + 2 < garageTop; y += 3.2) {
    s.body.quad([gx1, y, gz0 - 0.06], [gx1, y + 1.4, gz0 - 0.06], [gx0, y + 1.4, gz0 - 0.06], [gx0, y, gz0 - 0.06], slot);
    s.body.quad([gx1 + 0.06, y, gz1], [gx1 + 0.06, y + 1.4, gz1], [gx1 + 0.06, y + 1.4, gz0], [gx1 + 0.06, y, gz0], slot);
    s.body.quad([gx0 - 0.06, y, gz0], [gx0 - 0.06, y + 1.4, gz0], [gx0 - 0.06, y + 1.4, gz1], [gx0 - 0.06, y, gz1], slot);
  }

  // Details follow the mapped shaft edges (the north wall steps twice where the deck meets it).
  const edges = shaft.map((a, i): [P2, P2] => [a, shaft[(i + 1) % shaft.length]])
    .filter(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]) >= 10);
  edges.forEach(([a, b], face) => {
    // local() makes the ring counter-clockwise in (x, z), so (dz, −dx) points outward.
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n: P2 = [(b[1] - a[1]) / len, -(b[0] - a[0]) / len];
    const at = (t: number, y: number, d = 0.08) => [a[0] + t * (b[0] - a[0]) + n[0] * d, y, a[1] + t * (b[1] - a[1]) + n[1] * d];
    const strip = (t0: number, t1: number, y0: number, y1: number, colour: string, d = 0.08) =>
      s.body.quad(at(t0, y0, d), at(t0, y1, d), at(t1, y1, d), at(t1, y0, d), colour);
    // Only the north faces rise from the deck roof; the others run down to the street, where
    // a 6 m lobby storey sits under the first spandrel.
    const onDeck = n[1] < -0.9, lo = onDeck ? garageTop : datum + 6;
    if (onDeck) strip(0, 1, lo, lo + FLOOR, transition, 0.06);
    // A spandrel band at every floor line, then a parapet cap.
    for (let y = lo + FLOOR; y < roof - 1; y += FLOOR) strip(0, 1, y - 0.45, y + 0.45, y > top ? cap : spandrel, 0.1);
    strip(0, 1, roof - 0.9, roof + 0.4, cap, 0.12);
    // Mullion fins every 3 m, and a deep reveal 4 m in from each end of a long face.
    const fins = Math.round(len / 3);
    for (let k = 1; k < fins; k++) {
      const t = k / fins, w = 0.12 / len;
      if (len >= 16 && (Math.abs(t * len - 4) < 1.5 || Math.abs((1 - t) * len - 4) < 1.5)) continue;
      strip(t - w, t + w, lo + FLOOR, top, fin, 0.14);
    }
    if (len >= 16) {
      for (const t of [4 / len, 1 - 4 / len]) strip(t - 0.45 / len, t + 0.45 / len, lo + FLOOR, roof - 0.9, reveal, 0.16);
    }
    // Offices are mostly dark by 23:30: about 6% of the fin bays stay lit. This calls litHash
    // directly rather than litFacade: litFacade draws a body quad per pane (about 4,000 triangles
    // here), while the 3 m fin bays already are the pane grid and only lit bays become lamps.
    for (let floor = 0, y = lo + FLOOR + 0.5; y + 3 < top; floor++, y += FLOOR) {
      for (let bay = 0; bay < fins; bay++) {
        if (litHash(seed, face, floor, bay) >= 0.06) continue;
        const t0 = bay / fins + 0.14 / len, t1 = (bay + 1) / fins - 0.14 / len;
        s.lights.quad(at(t0, y, 0.05), at(t0, y + 2.6, 0.05), at(t1, y + 2.6, 0.05), at(t1, y, 0.05), blue);
      }
    }
  });
  // A set-back rooftop penthouse.
  const [cx, cz] = [shaft.reduce((m, p) => m + p[0], 0) / shaft.length, shaft.reduce((m, p) => m + p[1], 0) / shaft.length];
  s.prism([[cx - 10, cz - 8], [cx + 10, cz - 8], [cx + 10, cz + 8], [cx - 10, cz + 8]], roof, roof + 4.6, '#5d6f82', '#7f8486');
  // The lobby glass on West Peachtree (x ≈ 394, east of the shaft), lit after dark.
  const [la, lb] = edges.reduce((best, e) => (e[0][0] + e[1][0] > best[0][0] + best[1][0] ? e : best));
  const lobby = (t: number, y: number) => [la[0] + t * (lb[0] - la[0]) + 0.06, y, la[1] + t * (lb[1] - la[1])];
  s.lights.quad(lobby(0.2, datum + 0.3), lobby(0.2, datum + 5.5), lobby(0.6, datum + 5.5), lobby(0.6, datum + 0.3), blue);
  return s.finish('#f2e2c0', 0.5);
}
