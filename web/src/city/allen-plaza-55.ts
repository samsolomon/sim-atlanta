import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

/**
 * 55 Allen Plaza, 55 Ivan Allen Jr Boulevard: a 14-storey office tower (2007, LEED). Overture maps
 * it unnamed at 72.6 m; the 22 April 2019 3DEP returns put the roof at 57.6 m above the 299.3 m
 * NAVD88 grade, the rooftop screen to 66 m. Evidence: docs/log/ui/allen-plaza-55/README.md.
 */
export const allenPlaza55Id = '72b58249-8c4d-40a5-8f5a-7731b8e0e4d1';
const origin: P2 = [151, -1242];
const grade = 299.3; // NAVD88; the shell's local y is NAVD88
const roof = grade + 57.6, screenTop = grade + 66, lobbyTop = grade + 8;

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

export function createAllenPlaza55(buildings: VBuilding[], grid: GroundGrid, quality: 'low' | 'high' = 'high') {
  const found = landmarkShell(buildings, grid, allenPlaza55Id, '55 Allen Plaza', origin, [1, 0], [[0, 0], [-12, -20], [12, 20]]);
  if (!found) return null;
  const shell = found;
  const high = quality === 'high';
  const seed = seedOf(allenPlaza55Id);
  // Blue reflective curtain wall and silver sunshade louvres (Street View, Mar 2025 to Apr 2026).
  // Glass #8fb0c8 is S 29%, V 78%.
  const mullion = '#7f93a3', silver = '#d8dde0';
  const glass = ['#8fb0c8', '#96b6cd', '#89aac2'];
  shell.prism(shell.ring, shell.base, roof, mullion, '#a3a8ab');
  // Rooftop mechanical screen over the middle of the plate.
  shell.prism([[-10, -14], [10, -14], [10, 14], [-10, 14]], roof, screenTop, '#b9bdc0', '#9a9ea1');

  const floors = 12, pitch = (roof - 0.4 - lobbyTop) / floors;
  edges(shell.ring, (a, b, length, i) => {
    const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length, nx = uz, nz = -ux;
    const at = (u: number, y: number, out: number) => [a[0] + ux * u + nx * out, y, a[1] + uz * u + nz * out];
    litFacade(shell, seed, i, a, b, lobbyTop + 0.2, roof - 0.4, high ? floors : 4, high ? 1.6 : 8, 0.95, 0.9, glass, 0.3);
    // Double-height glazed lobby.
    litFacade(shell, seed, 40 + i, a, b, shell.base + 0.6, lobbyTop - 0.4, 1, high ? 3 : 10, 0.95, 0.92, ['#5e7686'], 0.5);
    if (length < 8) return;
    // A silver sunshade at every floor line: a projecting louvre on high, a flush band on low.
    const d = high ? 0.9 : 0.06;
    for (let j = 0; j <= floors; j += high ? 1 : 3) {
      const y = lobbyTop + j * pitch;
      shell.body.quad(at(0, y - 0.12, d), at(0, y + 0.12, d), at(length, y + 0.12, d), at(length, y - 0.12, d), silver);
      if (!high) continue;
      shell.body.quad(at(0, y + 0.12, 0.02), at(0, y + 0.12, d), at(length, y + 0.12, d), at(length, y + 0.12, 0.02), silver);
    }
  });

  return shell.finish('#f4ead6', 0.5);
}
