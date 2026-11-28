import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

/**
 * Barclay Hotel Atlanta Downtown, 89 Luckie Street. Heights from the 22 April 2019 3DEP returns
 * over the outline: the tower's roof 36.4 m above the 321.0 m NAVD88 grade (parapet peaks to 41.2 m),
 * and the low Luckie Street block about 12.9 m (25th percentile). Evidence: docs/log/ui/barclay-hotel/README.md.
 */
export const barclayHotelId = 'b1de136a-283a-4674-8b5d-9d354d59c6fa';
const origin: P2 = [212, -388];
const grade = 321.0;
const roof = grade + 36.4, frontTop = grade + 12.9, baseTop = grade + 5;

// The outline is a 30.6 × 20.5 m rectangle turned about 40°: A east, B north, C west, D south.
const A: P2 = [230.2, -390.1], B: P2 = [217.0, -405.7], C: P2 = [193.7, -386.0], D: P2 = [206.9, -370.1];
const lerp = (p: P2, q: P2, t: number): P2 => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
// The tower holds the 75% of the long axis on the A–B side; the low front block the rest, on Luckie Street.
const split = 0.75;
const towerRing: P2[] = [A, B, lerp(B, C, split), lerp(A, D, split)];
const frontRing: P2[] = [lerp(A, D, split - 0.02), lerp(B, C, split - 0.02), C, D];

/** Edges with the outward side to the right of a → b in plan (x east, z south). */
function edges(ring: P2[], draw: (a: P2, b: P2, length: number, i: number) => void) {
  let area = 0;
  ring.forEach(([x, z], i) => { const [u, v] = ring[(i + 1) % ring.length]; area += x * v - u * z; });
  const r = area > 0 ? ring : [...ring].reverse();
  r.forEach((a, i) => {
    const b = r[(i + 1) % r.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length > 4) draw(a, b, length, i);
  });
}

export function createBarclayHotel(buildings: VBuilding[], grid: GroundGrid, quality: 'low' | 'high' = 'high') {
  const found = landmarkShell(buildings, grid, barclayHotelId, 'Barclay Hotel', origin, [1, 0], [[0, 0], [8, -5], [-8, 5]]);
  if (!found) return null;
  const shell = found;
  const high = quality === 'high';
  const seed = seedOf(barclayHotelId);
  const local = (ring: P2[]): P2[] => ring.map(([x, z]) => [x - origin[0], z - origin[1]]);
  // Rust-red brick over a buff stone base, cream balcony bands (Street View Dec 2025, Mar 2025).
  const brick = '#a4553f', buff = '#d6c4a2', cream = '#ece4d2';
  const glass = ['#5d6b74', '#66737c', '#58656e'];
  const tower = local(towerRing), front = local(frontRing);

  shell.prism(tower, shell.base, baseTop, buff, '#8f8a80');
  shell.prism(tower, baseTop, roof, brick, '#8f8a80');
  shell.prism(front, shell.base, baseTop, buff, '#8f8a80');
  shell.prism(front, baseTop, frontTop, brick, '#9a958a');

  const floors = 10, pitch = (roof - 0.6 - baseTop) / floors;
  edges(tower, (a, b, length, i) => {
    const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length, nx = uz, nz = -ux;
    const at = (u: number, y: number, out: number) => [a[0] + ux * u + nx * out, y, a[1] + uz * u + nz * out];
    litFacade(shell, seed, i, a, b, baseTop + 0.3, roof - 0.6, high ? floors : 5, high ? 3.6 : 10, 0.62, 0.6, glass, 0.5);
    // Stone cornice band at the top and a buff course over the base.
    shell.body.quad(at(0, roof - 0.8, 0.06), at(0, roof, 0.06), at(length, roof, 0.06), at(length, roof - 0.8, 0.06), buff);
    // Balcony slabs with cream rails across the long faces, every floor.
    if (length < 15) return;
    const d = high ? 1.2 : 0.15;
    for (let j = 1; j < floors; j += high ? 1 : 2) {
      const y = baseTop + 0.3 + j * pitch;
      shell.body.quad(at(1.5, y - 0.1, d), at(1.5, y + 0.95, d), at(length - 1.5, y + 0.95, d), at(length - 1.5, y - 0.1, d), cream);
      if (!high) continue;
      shell.body.quad(at(1.5, y - 0.1, 0.02), at(1.5, y - 0.1, d), at(length - 1.5, y - 0.1, d), at(length - 1.5, y - 0.1, 0.02), '#b9b1a1');
      shell.body.quad(at(1.5, y - 0.1, 0.02), at(1.5, y + 0.95, 0.02), at(1.5, y + 0.95, d), at(1.5, y - 0.1, d), cream);
      shell.body.quad(at(length - 1.5, y - 0.1, d), at(length - 1.5, y + 0.95, d), at(length - 1.5, y + 0.95, 0.02), at(length - 1.5, y - 0.1, 0.02), cream);
    }
  });
  edges(front, (a, b, _length, i) => {
    litFacade(shell, seed, 20 + i, a, b, shell.base + 0.6, baseTop - 0.6, 1, high ? 3.5 : 10, 0.7, 0.75, ['#3e4a52'], 0.5);
    if (high) litFacade(shell, seed, 40 + i, a, b, baseTop + 0.8, frontTop - 1.2, 2, 3, 0.4, 0.55, glass, 0.4);
  });

  return shell.finish('#f2d6a8', 0.66);
}
