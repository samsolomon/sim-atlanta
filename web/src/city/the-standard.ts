import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

export const theStandardId = 'osm:way:779716217';
const origin: P2 = [218, -2290];
// Masses and heights from the April 2019 lidar (90th-percentile returns on an 8 m grid,
// ground 294.3 m NAVD88): a 63 m bar on the north end and a 61 m bar on the east side form
// the 19-storey tower, with a 64 m core block at the bar's south end. A 44 m block steps
// down to the west, and the 10-storey precast garage and mid-rise (31 m) fills the south.
const north: P2[] = [[-22, -57], [18.2, -59.1], [25.6, -59.5], [27.1, -42.3], [25.1, -42.3], [25.1, -38.2], [-22.3, -37.9]];
const east: P2[] = [[5.8, -38.2], [25.1, -38.2], [25.1, -1.5], [24.7, -1.5], [24.7, 0.9], [5.8, 0.9]];
const core: P2[] = [[5.8, -20], [24.7, -20], [24.7, 0.9], [5.8, 0.9]];
const west: P2[] = [[-23.6, -18.8], [5.8, -18.3], [5.8, 0.9], [-24.05, 0.9]];
const garage: P2[] = [[-24.05, 0.9], [23.2, 0.9], [22.2, 58.5], [-14.8, 57.9], [-24.9, 57.8]];

export function createTheStandard(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const shell = landmarkShell(buildings, grid, site.id, 'The Standard', origin, [1, 0], [[0, -48], [15, -20], [0, 30]]);
  if (!shell) return null;
  // Lit panes come from the shared hash: stable per building, face, floor and bay.
  const seed = seedOf(site.id);
  let face = 0;
  const ccw = (ring: P2[]): P2[] => {
    const area = ring.reduce((sum, [x, z], i) => {
      const [nx, nz] = ring[(i + 1) % ring.length];
      return sum + x * nz - nx * z;
    }, 0);
    return area < 0 ? [...ring].reverse() : ring;
  };
  const faces = (ring: P2[], draw: (a: P2, b: P2, length: number) => void) =>
    ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length > 0.6) draw(a, b, length);
    });
  const inside = (x: number, z: number, ring: P2[]) => {
    let hit = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, zi] = ring[i], [xj, zj] = ring[j];
      if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit;
    }
    return hit;
  };
  const datum = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const masses = [
    { ring: ccw(north), top: datum + 63 },
    { ring: ccw(east), top: datum + 61 },
    { ring: ccw(west), top: datum + 44 },
    { ring: ccw(garage), top: datum + 31 },
  ];
  // A face starts above any taller neighbour it touches, so shared walls stay hidden.
  const covered = (a: P2, b: P2, length: number) => {
    const mx = (a[0] + b[0]) / 2 + 0.6 * (b[1] - a[1]) / length;
    const mz = (a[1] + b[1]) / 2 - 0.6 * (b[0] - a[0]) / length;
    return Math.max(datum, ...masses.filter(m => inside(mx, mz, m.ring)).map(m => m.top));
  };
  const precast = '#d9d6cf', amber = '#b8743f', roofColor = '#8e8f8b';
  const punched = ['#4b5d68', '#526571'];
  const storefront = ['#5a7584', '#617c8a'];

  for (const [index, { ring, top }] of masses.entries()) {
    const isGarage = index === 3;
    shell.prism(ring, shell.base, top, precast, isGarage ? '#a9a69c' : roofColor);
    faces(ring, (a, b, length) => {
      const lo = covered(a, b, length);
      if (top - lo < 1) return;
      const street = lo <= datum + 0.01;
      if (street) litFacade(shell, seed, face++, a, b, datum + 0.4, datum + 5.6, 1, 3.4, 0.84, 0.84, storefront, 0.35);
      const from = street ? datum + 6 : lo + 0.2;
      const floors = Math.max(1, Math.round((top - 0.8 - from) / 3));
      if (isGarage) {
        // The 10-storey mid-rise wraps the garage in apartments, so its outer faces are lit rooms.
        litFacade(shell, seed, face++, a, b, from, top - 0.8, floors, 2.4, 0.6, 0.64, punched, 0.45);
        return;
      }
      const window = (l: P2, r: P2, lo: number, hi: number) =>
        litFacade(shell, seed, face++, l, r, lo, hi, Math.max(1, Math.round((hi - lo) / 3)), 2.4, 0.6, 0.64, punched, 0.45);
      if (length <= 14) {
        window(a, b, from, top - 0.8);
        return;
      }
      // The amber "cutout": a recessed bay of contrasting cladding behind the precast skin,
      // drawn just behind its windows so the two never share a plane.
      const at = (t: number): P2 => [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
      const l = at(0.62), r = at(Math.min(0.62 + 6 / length, 0.95));
      const lift = (p: P2, y: number): [number, number, number] =>
        [p[0] + 0.035 * (b[1] - a[1]) / length, y, p[1] - 0.035 * (b[0] - a[0]) / length];
      window(a, l, from, top - 0.8);
      window(r, b, from, top - 0.8);
      window(l, r, from, from + 6);
      shell.body.quad(lift(l, from + 6), lift(l, top - 0.8), lift(r, top - 0.8), lift(r, from + 6), amber);
      window(l, r, from + 6, top - 0.8);
    });
  }
  shell.prism(ccw(core), datum + 61, datum + 64, precast, roofColor);
  // The pool deck and green roofs on the garage's amenity level.
  const deck = datum + 31;
  shell.prism(ccw([[-14, 10], [8, 10], [8, 22], [-14, 22]]), deck, deck + 0.05, '#5aa8c4', '#5aa8c4');
  shell.prism(ccw([[-18, 34], [16, 34], [16, 52], [-18, 52]]), deck, deck + 0.4, '#6d8a57', '#7a985e');
  return shell.finish('#f4d9a8', 0.62);
}
