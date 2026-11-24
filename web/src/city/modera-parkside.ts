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
  return shell.finish('#f4d9a8', 0.62);
}
