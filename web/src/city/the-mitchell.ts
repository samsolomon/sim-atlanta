import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

/**
 * The Mitchell, Centennial Yards' first residential tower (19 storeys, 304 units, opened
 * September 2025), on Elliott Street at Mitchell Street. Newer than the 2019 lidar (the lot was
 * empty), so its height is reported: Overture's 62.7 m matches 19 storeys. The tower's place on
 * the lot is estimated from dated April 2026 Street View. Evidence: docs/log/ui/the-mitchell/README.md.
 */
export const theMitchellId = '1629150e-9283-4ce6-9653-8097f4a5073c';
const origin: P2 = [-592, -24];
const height = 62.7;
const podiumH = 10;

/** Edges with the outward side to the right of a → b in plan (x east, z south). */
function edges(ring: P2[], draw: (a: P2, b: P2, length: number, i: number) => void) {
  let area = 0;
  ring.forEach(([x, z], i) => { const [u, v] = ring[(i + 1) % ring.length]; area += x * v - u * z; });
  const r = area > 0 ? ring : [...ring].reverse();
  r.forEach((a, i) => {
    const b = r[(i + 1) % r.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length > 2) draw(a, b, length, i);
  });
}

export function createTheMitchell(buildings: VBuilding[], grid: GroundGrid, quality: 'low' | 'high' = 'high') {
  const found = landmarkShell(buildings, grid, theMitchellId, 'The Mitchell', origin, [1, 0], [[-12, -10], [10, -20], [15, 0]]);
  if (!found) return null;
  const shell = found;
  const high = quality === 'high';
  const seed = seedOf(theMitchellId);
  // Local frame = scene offset by origin; the shell's local y is NAVD88 (shell.base sits 0.35 m below grade).
  const grade = shell.base + 0.35;
  const top = grade + height, podiumTop = grade + podiumH;
  // The slab on the Elliott Street side, from the north line down to the Mitchell Street diagonal.
  const tower: P2[] = [[-24.4, -32.7], [-2.5, -32.7], [-2.5, 34.2], [-24.4, 23.2]];
  // Charcoal brick, a dark window frame and blue-grey glass (April 2026 Street View).
  const brick = '#46454a', frame = '#4a4c51', panel = '#9a9ea5';
  const glass = ['#b3c3cf', '#bac9d4', '#adbdca'];

  shell.prism(shell.ring, shell.base, podiumTop, brick, '#77797a');
  shell.prism(tower, podiumTop, top, panel, '#77797a');

  edges(shell.ring, (a, b, length, i) => {
    if (length < 8) return;
    litFacade(shell, seed, 40 + i, a, b, grade + 0.6, podiumTop - 0.6, high ? 2 : 1, high ? 4.5 : 12, 0.8, 0.7, ['#3c4a55'], 0.35);
  });
  const floors = 16, pitch = (top - podiumTop - 1) / floors;
  edges(tower, (a, b, length, i) => {
    const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length, nx = uz, nz = -ux;
    // Dark mullion frame as a full-height background; glass bays read lighter against it.
    shell.body.quad([a[0] + nx * 0.03, podiumTop, a[1] + nz * 0.03], [a[0] + nx * 0.03, top - 1, a[1] + nz * 0.03],
      [b[0] + nx * 0.03, top - 1, b[1] + nz * 0.03], [b[0] + nx * 0.03, podiumTop, b[1] + nz * 0.03], frame);
    if (high) litFacade(shell, seed, i, a, b, podiumTop + 0.3, top - 1.2, floors, 2.6, 0.82, 0.84, glass, 0.45);
    else litFacade(shell, seed, i, a, b, podiumTop + 0.3, top - 1.2, Math.round(floors / 3), 10, 0.82, 0.9, glass, 0.45);
    // Balcony stacks with glass rails on the long faces.
    if (!high || length < 40) return;
    for (const c of [length * 0.25, length * 0.5, length * 0.75]) for (let j = 1; j < floors; j++) {
      const y = podiumTop + 0.3 + j * pitch;
      const p = (u: number, out: number, h: number) => [a[0] + ux * (c + u) + nx * out, h, a[1] + uz * (c + u) + nz * out];
      const w = 2.4, d = 1.5;
      shell.body.quad(p(-w, 0.02, y + 0.2), p(w, 0.02, y + 0.2), p(w, d, y + 0.2), p(-w, d, y + 0.2), '#d5d6d6');
      shell.body.quad(p(-w, 0.02, y), p(-w, d, y), p(w, d, y), p(w, 0.02, y), '#9c9ea0');
      shell.body.quad(p(-w, d, y), p(-w, d, y + 1.1), p(w, d, y + 1.1), p(w, d, y), '#a5b5c0');
    }
  });

  return shell.finish('#f2d6a8', 0.66);
}
