import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

/**
 * The precast parking deck on Andrew Young International Boulevard between AmericasMart
 * Building 1 and the Westin (OSM way 871428776). Overture maps it at 78.7 m; the 22 April 2019
 * 3DEP returns put its roof at 27.7 m above the boulevard, about eight levels.
 * Evidence: docs/log/ui/aym-deck/README.md.
 */
export const aymDeckId = 'd56f2678-0f2c-474d-90b6-d61574d9a15c';
const origin: P2 = [288, -671];
// NAVD88; the shell's local y is NAVD88.
const grade = 319.3;
const roof = grade + 27.7;
const levels = 8;

/** Edges with the outward side to the right of a → b in plan (x east, z south). */
function edges(ring: P2[], draw: (a: P2, b: P2, length: number) => void) {
  let area = 0;
  ring.forEach(([x, z], i) => { const [u, v] = ring[(i + 1) % ring.length]; area += x * v - u * z; });
  const r = area > 0 ? ring : [...ring].reverse();
  r.forEach((a, i) => {
    const b = r[(i + 1) % r.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length > 2) draw(a, b, length);
  });
}

export function createAymDeck(buildings: VBuilding[], grid: GroundGrid) {
  const found = landmarkShell(buildings, grid, aymDeckId, 'Andrew Young parking deck', origin, [1, 0], [[0, 0], [-10, 8], [10, -8]]);
  if (!found) return null;
  const shell = found;
  // Pale grey precast, as in the April 2026 Street View from AYIB and Ted Turner Drive.
  const precast = '#cfcdc7', rib = '#b9b7b1', open = '#8d8e8c';
  shell.prism(shell.ring, shell.base, roof, precast, '#a4a29c');

  const pitch = (roof - grade - 0.6) / levels;
  edges(shell.ring, (a, b, length) => {
    const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length, nx = uz, nz = -ux;
    const at = (u: number, y: number, out: number) => [a[0] + ux * u + nx * out, y, a[1] + uz * u + nz * out];
    const band = (u0: number, u1: number, y0: number, y1: number, out: number, color: string) =>
      shell.body.quad(at(u0, y0, out), at(u0, y1, out), at(u1, y1, out), at(u1, y0, out), color);
    // Each level: a louvred screen above a ribbed precast spandrel.
    for (let k = 0; k < levels; k++) {
      const y = grade + 0.6 + k * pitch;
      band(0.4, length - 0.4, y + 1.2, y + pitch - 0.05, 0.05, open);
      band(0.2, length - 0.2, y + 0.55, y + 0.7, 0.1, rib);
    }
  });

  return shell.finish('#e8e3d2', 0.24);
}
