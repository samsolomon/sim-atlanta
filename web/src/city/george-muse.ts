import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

/**
 * The George Muse building, 50 Peachtree Street at Walton (Overture "Geo Muse Building"): the old
 * Muse's clothing store, now the Lofts at Muse's. Heights from the 22 April 2019 3DEP returns: roof
 * 36.4 m above the 320.6 m NAVD88 grade, parapet and penthouse to about 38.8 m.
 * Evidence: docs/log/ui/george-muse/README.md.
 */
export const georgeMuseId = 'e4493636-7af5-4028-8ff9-ea2261057bdd';
const origin: P2 = [200, -157];
const grade = 320.6; // NAVD88; the shell's local y is NAVD88
const roof = grade + 36.4, cornice = grade + 37.6, shopTop = grade + 5.4;

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

export function createGeorgeMuse(buildings: VBuilding[], grid: GroundGrid, quality: 'low' | 'high' = 'high') {
  const found = landmarkShell(buildings, grid, georgeMuseId, 'George Muse Building', origin, [1, 0], [[0, 0], [8, 8], [-6, -10]]);
  if (!found) return null;
  const shell = found;
  const high = quality === 'high';
  const seed = seedOf(georgeMuseId);
  // Cream limestone with paired punched windows, a projecting cornice and a stone band over the shopfronts (Street View, Mar 2025); the arched bays are not modelled.
  const stone = '#e0d6bf', trim = '#ece6d6', glass = ['#5b666d', '#636e75', '#57626a'];
  shell.prism(shell.ring, shell.base, roof, stone, '#a3a096');

  edges(shell.ring, (a, b, length, i) => {
    const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length, nx = uz, nz = -ux;
    const at = (u: number, y: number, out: number) => [a[0] + ux * u + nx * out, y, a[1] + uz * u + nz * out];
    litFacade(shell, seed, i, a, b, shopTop + 0.8, roof - 1.4, high ? 9 : 3, high ? 2.2 : 7, 0.55, 0.6, glass, 0.45);
    if (length > 6) litFacade(shell, seed, 20 + i, a, b, shell.base + 0.6, shopTop - 0.4, 1, high ? 4 : 9, 0.7, 0.88, ['#3b464d'], 0.5);
    // A band over the shopfronts and the projecting cornice at the parapet.
    shell.body.quad(at(0, shopTop - 0.1, 0.06), at(0, shopTop + 0.5, 0.06), at(length, shopTop + 0.5, 0.06), at(length, shopTop - 0.1, 0.06), trim);
    const d = high ? 0.6 : 0.06;
    shell.body.quad(at(0, roof, d), at(0, cornice, d), at(length, cornice, d), at(length, roof, d), trim);
    if (high) {
      shell.body.quad(at(0, roof, 0.02), at(length, roof, 0.02), at(length, roof, d), at(0, roof, d), '#c9c1ae');
      shell.body.quad(at(0, cornice, 0.02), at(0, cornice, d), at(length, cornice, d), at(length, cornice, 0.02), trim);
    }
  });
  // The cornice band rises past the roof slab as a parapet.
  shell.prism(shell.ring, roof, cornice, trim, '#a3a096');

  return shell.finish('#f2d6a8', 0.66);
}
