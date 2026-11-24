import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

/**
 * Ten Park Place and One Park Place, Georgia State buildings on Woodruff Park's south edge.
 * Overture's names match the OSM ways (252608909, 252608893) but its heights are wrong and
 * inverted (30.6 m and 21.2 m). The 22 April 2019 3DEP returns give 22.9 m and 35.3 m.
 * Evidence: docs/log/ui/park-place/README.md.
 */
export const tenParkPlaceId = 'c44718c3-7953-4335-a8d4-cec87fe11580';
export const oneParkPlaceId = 'f3adb484-32fe-4ca8-b073-ce072b4370b8';

/** Edges with the outward side to the right of a → b in plan (x east, z south). */
function edges(ring: P2[], draw: (a: P2, b: P2, length: number, i: number) => void) {
  let area = 0;
  ring.forEach(([x, z], i) => { const [u, v] = ring[(i + 1) % ring.length]; area += x * v - u * z; });
  const r = area > 0 ? ring : [...ring].reverse();
  r.forEach((a, i) => {
    const b = r[(i + 1) % r.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length > 3) draw(a, b, length, i);
  });
}

/** Ten Park Place (1929, Anthony Ten Eyck Brown): a buff brick and stone block, about 7 storeys. */
export function createTenParkPlace(buildings: VBuilding[], grid: GroundGrid, quality: 'low' | 'high' = 'high') {
  const origin: P2 = [285, -22];
  const found = landmarkShell(buildings, grid, tenParkPlaceId, 'Ten Park Place', origin, [1, 0], [[0, -10], [-20, 15], [20, -25]]);
  if (!found) return null;
  const shell = found;
  const high = quality === 'high';
  const seed = seedOf(tenParkPlaceId);
  const grade = 316.8, roof = grade + 22.9, shopTop = grade + 4.6;
  // Buff brick over a stone shop base (Street View Mar 2025, Sep 2018).
  const buff = '#cbb894', stone = '#ddd2bb', glass = ['#5d6a72', '#66737b', '#58656d'];
  shell.prism(shell.ring, shell.base, roof, buff, '#9f9a8e');
  // The stair and lift bulkhead the lidar finds at about 28 m.
  shell.prism([[0, -10], [7, -10], [7, 0], [0, 0]], roof, grade + 28, buff, '#9f9a8e');
  edges(shell.ring, (a, b, length, i) => {
    const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length, nx = uz, nz = -ux;
    const at = (u: number, y: number, out: number) => [a[0] + ux * u + nx * out, y, a[1] + uz * u + nz * out];
    litFacade(shell, seed, i, a, b, shopTop + 0.6, roof - 1.2, high ? 6 : 3, high ? 2.6 : 8, 0.5, 0.6, glass, 0.35);
    // Stone base course with shopfronts, and a stone cornice.
    shell.body.quad(at(0, shell.base, 0.06), at(0, shopTop, 0.06), at(length, shopTop, 0.06), at(length, shell.base, 0.06), stone);
    if (length > 6) litFacade(shell, seed, 20 + i, a, b, shell.base + 0.8, shopTop - 0.6, 1, high ? 4 : 10, 0.75, 0.8, ['#3c4850'], 0.45);
    shell.body.quad(at(0, roof - 0.9, 0.06), at(0, roof, 0.06), at(length, roof, 0.06), at(length, roof - 0.9, 0.06), stone);
  });
  return shell.finish('#f2d6a8', 0.66);
}

/** One Park Place: a white marble-clad modern block, about 10 storeys, with blue punched windows. */
export function createOneParkPlace(buildings: VBuilding[], grid: GroundGrid, quality: 'low' | 'high' = 'high') {
  const origin: P2 = [239, -39];
  const found = landmarkShell(buildings, grid, oneParkPlaceId, 'One Park Place', origin, [1, 0], [[0, 0], [-8, -6], [8, 6]]);
  if (!found) return null;
  const shell = found;
  const high = quality === 'high';
  const seed = seedOf(oneParkPlaceId);
  const grade = 317.4, roof = grade + 35.3, baseTop = grade + 4.8;
  // White marble panels with blue-tinted punched windows (Street View Mar 2025). Glass #7fa2c4 is S 35%, V 77%.
  const marble = '#e3e2dd', glass = ['#7fa2c4', '#86a8c9', '#7a9dbf'];
  shell.prism(shell.ring, shell.base, roof, marble, '#a9a8a3');
  edges(shell.ring, (a, b, _length, i) => {
    litFacade(shell, seed, i, a, b, baseTop + 0.4, roof - 0.8, high ? 9 : 3, high ? 2.2 : 8, 0.62, 0.55, glass, 0.3);
    litFacade(shell, seed, 20 + i, a, b, shell.base + 0.6, baseTop - 0.4, 1, high ? 3.5 : 10, 0.82, 0.8, ['#43535f'], 0.5);
  });
  return shell.finish('#f4ead6', 0.5);
}
