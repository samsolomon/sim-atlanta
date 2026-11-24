import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

/**
 * Renaissance Lofts, 120 Ralph McGill Boulevard: a 1974 office slab converted to 186 lofts in
 * 1996, painted grey-white. Heights from the 22 April 2019 3DEP returns: roof 57.8 m above the
 * 303.6 m NAVD88 grade, penthouse to 63.4 m. Evidence: docs/log/ui/renaissance-lofts/README.md.
 */
export const renaissanceLoftsId = '591e9823-7f95-45cf-a892-896ecc5a19a3';
const origin: P2 = [729, -1207];
const grade = 303.6; // NAVD88; the shell's local y is NAVD88
const roof = grade + 57.8, penthouseTop = grade + 63.4, lobbyTop = grade + 5;

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

export function createRenaissanceLofts(buildings: VBuilding[], grid: GroundGrid, quality: 'low' | 'high' = 'high') {
  const found = landmarkShell(buildings, grid, renaissanceLoftsId, 'Renaissance Lofts', origin, [1, 0], [[0, 0], [-10, -10], [10, 10]]);
  if (!found) return null;
  const shell = found;
  const high = quality === 'high';
  const seed = seedOf(renaissanceLoftsId);
  // Grey-white paint (Urbanize 2022, Street View Dec 2025) over dark strip windows.
  const paint = '#dcdcd8', pier = '#e9e9e6', glass = ['#6f7c86', '#76838c', '#6a7781'];
  shell.prism(shell.ring, shell.base, roof, paint, '#a7a6a1');
  // Rooftop penthouse over the middle of the slab.
  shell.prism([[-8, -9], [8, -9], [8, 9], [-8, 9]], roof, penthouseTop, paint, '#a7a6a1');

  const floors = 15;
  edges(shell.ring, (a, b, length, i) => {
    const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length, nx = uz, nz = -ux;
    const at = (u: number, y: number, out: number) => [a[0] + ux * u + nx * out, y, a[1] + uz * u + nz * out];
    // Ribbon windows: wide panes, short spandrels.
    litFacade(shell, seed, i, a, b, lobbyTop + 0.3, roof - 0.5, high ? floors : 5, high ? 3.4 : 12, 0.9, high ? 0.55 : 0.7, glass, 0.4);
    // Dark recessed ground floor.
    litFacade(shell, seed, 20 + i, a, b, shell.base + 0.6, lobbyTop - 0.4, 1, high ? 4 : 14, 0.92, 0.85, ['#3a4148'], 0.45);
    // Deep vertical piers about every 7 m, proud of the wall, running the full height.
    const n = Math.max(1, Math.round(length / 7));
    const d = high ? 0.5 : 0.2;
    for (let k = 0; k <= n; k++) {
      const c = Math.min(length - 0.35, Math.max(0.35, k * length / n));
      shell.body.quad(at(c - 0.35, lobbyTop, d), at(c - 0.35, roof, d), at(c + 0.35, roof, d), at(c + 0.35, lobbyTop, d), pier);
      if (!high) continue;
      shell.body.quad(at(c - 0.35, lobbyTop, 0), at(c - 0.35, roof, 0), at(c - 0.35, roof, d), at(c - 0.35, lobbyTop, d), paint);
      shell.body.quad(at(c + 0.35, lobbyTop, d), at(c + 0.35, roof, d), at(c + 0.35, roof, 0), at(c + 0.35, lobbyTop, 0), paint);
    }
  });

  return shell.finish('#f2d6a8', 0.66);
}
