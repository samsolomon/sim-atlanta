import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

export const moderaParksideId = 'osm:way:1300601308';
const origin: P2 = [948, -3150];
// Reported 32 storeys plus a rooftop amenity level (topped out 2024, after the 2019
// lidar). The white parking podium fills the block; the slab rises over its south end
// and leaves the podium roof exposed along 10th Street to the north.
const tower: P2[] = [[-14.4, -18], [14.6, -18], [19.7, 39], [-13.8, 39]];

/** The posts that carry the crown frame, each reaching one of its bands (tower-local metres). */
export const moderaCrownPosts: P2[] = [[-13, -16], [13.5, -16], [18.1, 37.5], [-12.5, 37]];

export function createModeraParkside(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const shell = landmarkShell(buildings, grid, site.id, 'Modera Parkside', origin, [1, 0], [[0, 0], [0, 25], [0, -30]]);
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
  const datum = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  // Street retail (5.5 m), parking to 24 m, then apartments at 3.15 m to the 32nd floor.
  const retailTop = datum + 5.5, podiumTop = datum + 24, roof = datum + 5.5 + 31 * 3.15, amenityTop = roof + 4.8;
  const white = '#e9e8e3', frame = '#f0efea', roofColor = '#8d908e';
  const glass = ['#7894a6', '#819db0'];
  const storefront = ['#667680', '#6c7d87'];

  const podium = ccw(shell.ring);
  const slab = ccw(tower);
  shell.prism(podium, shell.base, podiumTop, white, '#a8a69c');
  faces(podium, (a, b) => {
    litFacade(shell, seed, face++, a, b, datum + 0.4, retailTop - 0.4, 1, 3.6, 0.84, 0.86, storefront, 0.35);
    // Parking screens: tall white fins over dark openings.
    litFacade(shell, seed, face++, a, b, retailTop + 0.4, podiumTop - 0.6, 6, 1.6, 0.42, 0.5, ['#6d7477'], 0);
  });

  // Glass slab with white slab edges and corner frames.
  shell.prism(slab, podiumTop, roof, frame, roofColor);
  faces(slab, (a, b, length) =>
    litFacade(shell, seed, face++, a, b, podiumTop + 0.2, roof - 0.3, 25, length > 40 ? 2.9 : 2.7, 0.9, 0.7, glass, 0.32));
  // Rooftop amenity level: glazed club room and gym set back behind the pool deck rail.
  const club = ccw([[-10, 8], [12, 8], [14, 34], [-9, 34]]);
  shell.prism(club, roof, amenityTop, white, '#7f8482');
  faces(club, (a, b) => litFacade(shell, seed, face++, a, b, roof + 0.3, amenityTop - 0.5, 1, 2.6, 0.92, 0.88, glass, 0.55));
  shell.prism(ccw([[-11, -14], [10, -14], [11, 4], [-11, 4]]), roof, roof + 0.25, '#bdb9ae', '#cfcbc0');
  shell.prism(ccw([[-6, -10], [5, -10], [5.5, -3], [-6, -3]]), roof + 0.25, roof + 0.3, '#5fb1c9', '#5fb1c9');
  // As built (Gresham Smith photographs, 2025): the rainbow slot runs up the middle of the east face
  // from the podium to about two-thirds of the height, orange at the foot through yellow and pale
  // green to pale teal, crossed by the balcony slabs. It glows from inside at dusk, so it is lamp-lit.
  {
    const [a, b] = [[14.6, -18], [19.7, 39]] as P2[], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len, t0 = len / 2 - 1.6, t1 = len / 2 + 1.6;
    const at = (t: number, y: number) => [a[0] + dx * t + dz * .14, y, a[1] + dz * t - dx * .14];
    const stops = ['#e8742f', '#f2b630', '#f3dc55', '#bfe0a0', '#a9dccf'], top = podiumTop + (roof - podiumTop) * .66;
    stops.forEach((c, k) => {
      const y0 = podiumTop + (top - podiumTop) * k / stops.length, y1 = podiumTop + (top - podiumTop) * (k + 1) / stops.length;
      shell.lights.quad(at(t0, y0), at(t0, y1), at(t1, y1), at(t1, y0), c);
    });
  }
  // The crown "visor": a white frame ringing the top, pergola slats over the pool deck, and the
  // tall charcoal core box above (its logo is not drawn).
  const visorLo = amenityTop + 0.6, visorHi = amenityTop + 1.6;
  slab.forEach((p, i) => {
    const q = slab[(i + 1) % slab.length], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const nx = -(q[1] - p[1]) / len * 1.4, nz = (q[0] - p[0]) / len * 1.4; // inward for a counter-clockwise ring
    const band: P2[] = [p, q, [q[0] + nx, q[1] + nz], [p[0] + nx, p[1] + nz]];
    shell.prism(band, visorLo, visorHi, white, white);
  });
  for (const [u, v] of moderaCrownPosts)
    shell.prism([[u - .4, v - .4], [u + .4, v - .4], [u + .4, v + .4], [u - .4, v + .4]], roof, visorLo, white, white);
  // Each slat runs from the west band to the east one, which angles out with the face.
  const eastBand = (v: number) => 14.6 + (v + 18) / 57 * 5.1 - 1.3;
  for (let v = -15; v < 6; v += 2.2) shell.prism([[-13, v], [eastBand(v), v], [eastBand(v + .35), v + .35], [-13, v + .35]], visorHi - .5, visorHi, white, white);
  shell.prism(ccw([[-6, 18], [6, 18], [6.6, 32], [-6, 32]]), roof, amenityTop + 8, '#8a9094', '#6b7175');
  return shell.finish('#f4d9a8', 0.62);
}
