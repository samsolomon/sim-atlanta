import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { along, faces, litHash, outwardSign, seedOf, wound } from './skin-kit';

export const hanoverHouseId = 'osm:way:536740358';
const origin: P2 = [906, -3747];

// Hanover House (147 15th Street, Colony Square, 1970s): a Brutalist concrete residential slab.
// Its long faces are a grid of bronze-tinted glass bays and blank concrete panels in an irregular
// pattern, between solid concrete end walls with a single window slot, over raked concrete
// balcony fins at the base. Heights from the April 2019 lidar above median grade: roof 53.1 m
// (p50), parapet and plant to 55.8 m (max).
const roofH = 53.1, topH = 55.8, base = 4.2, storeys = 14;
// The slab as a rotated rectangle: corners from the mapped outline, cleaned of its stair jogs.
const corners: P2[] = [[912.6, -3724.0], [930.0, -3741.3], [901.1, -3770.6], [883.5, -3753.2]];

const concrete = '#d9d1c1', concreteShade = '#c2baab', slot = '#4f4a43';
// Bronze glass base #857a6b: HSV saturation 20%, value 52% (the glass rules' 50-60 band, S ≤ 22).
const bronze = '#857a6b';

export function createHanoverHouse(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const shell = landmarkShell(buildings, grid, site.id, 'Hanover House', origin, [1, 0], [[0, 0], [-10, -2], [10, 2]]);
  if (!shell) return null;
  const floor = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const footing = Math.min(floor, shell.base) - 0.65;
  const { body, lights } = shell;
  const seed = seedOf(site.id);
  const ring = wound(corners.map(([x, z]): P2 => [x - origin[0], z - origin[1]]), 1);
  const out = outwardSign(ring);
  const storey = (roofH - base - 1.6) / storeys;

  shell.prism(ring, footing, floor + roofH, concrete, concreteShade);
  // Parapet and plant, set in.
  const cx = ring.reduce((s, p) => s + p[0], 0) / 4, cz = ring.reduce((s, p) => s + p[1], 0) / 4;
  const plant = ring.map(([x, z]): P2 => [cx + (x - cx) * 0.55, cz + (z - cz) * 0.55]);
  shell.prism(plant, floor + roofH, floor + topH, concrete, concreteShade);

  faces(ring, (a, b, length, face) => {
    if (length < 30) {
      // End walls: blank concrete with one dark window slot up the middle.
      const p = along(a, b, length, length * 0.32, 0.05 * out), q = along(a, b, length, length * 0.38, 0.05 * out);
      body.quad([p[0], floor + base, p[1]], [p[0], floor + roofH - 2, p[1]], [q[0], floor + roofH - 2, q[1]], [q[0], floor + base, q[1]], slot);
      return;
    }
    // Long faces: 12 bays a storey; each is bronze glass or a blank concrete panel, by a stable
    // hash (the photographed pattern is irregular). Lower five storeys sit behind balcony fins.
    const bays = 12, bw = length / bays;
    for (let j = 0; j < storeys; j++) {
      const y = floor + base + j * storey;
      for (let k = 0; k < bays; k++) {
        const panel = litHash(seed, face, j, k + 64) < 0.22;
        if (panel) continue; // concrete shows through
        const p = along(a, b, length, k * bw + 0.25, 0.05 * out), q = along(a, b, length, (k + 1) * bw - 0.25, 0.05 * out);
        const lit = litHash(seed, face, j, k) < 0.3;
        (lit ? lights : body).quad([p[0], y + 0.35, p[1]], [p[0], y + storey - 0.35, p[1]], [q[0], y + storey - 0.35, q[1]], [q[0], y + 0.35, q[1]], bronze);
      }
    }
    // The raked balcony fins at the base: one sloped concrete apron per bay pair, floors 1-5.
    const top = floor + base + 5 * storey;
    for (let k = 0; k < bays; k += 2) {
      const p = along(a, b, length, k * bw + 0.2, 0.05 * out), q = along(a, b, length, (k + 2) * bw - 0.2, 0.05 * out);
      const pf = along(a, b, length, k * bw + 0.2, 2.2 * out), qf = along(a, b, length, (k + 2) * bw - 0.2, 2.2 * out);
      body.quad([pf[0], floor + base, pf[1]], [p[0], top, p[1]], [q[0], top, q[1]], [qf[0], floor + base, qf[1]], concreteShade);
    }
  });
  return shell.finish('#f2d6a8', 0.6);
}
