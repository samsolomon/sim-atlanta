import type { GroundGrid } from '../terrain/grid';
import type { TerrainQuality } from '../terrain/surface';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

export const nine15MidtownId = 'osm:way:789980819';
const origin: P2 = [451, -2875];

// NAVD88 from the 22 April 2019 3DEP returns (docs/log/ui/nine15-midtown/README.md).
const grade = 293.1;
const baseTop = grade + 6;
const roof = grade + 71.3;
const parapet = grade + 73.6;

// The 21-storey slab on 8th Street at West Peachtree, squared from the mapped outline.
const tower: P2[] = [[414.8, -2863.6], [488.1, -2862.6], [487.9, -2887.5], [415.6, -2886.4]];

const local = (ring: P2[]): P2[] => ring.map(([x, z]) => [x - origin[0], z - origin[1]]);

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

export function createNine15Midtown(buildings: VBuilding[], grid: GroundGrid, quality: TerrainQuality) {
  const found = landmarkShell(buildings, grid, nine15MidtownId, 'Nine15 Midtown', origin, [1, 0],
    [[0, 0], [-30, 0], [30, 0]]);
  if (!found) return null;
  const shell = found;
  const high = quality === 'high';
  // Lit panes come from the shared hash. Face ids: tower edges 0–3, base 10+.
  const seed = seedOf(nine15MidtownId);
  const white = '#e6e6e2', grey = '#c3c6c8', brick = '#4a4a4c';
  // Clear glass reads blue-grey in the Street View captures: #9fb1bd is S 16%, V 74%.
  const glass = ['#9fb1bd', '#a6b7c2', '#99abb7'];
  const t = local(tower);

  shell.prism(t, shell.base, baseTop, brick, '#8f8f8c');
  shell.prism(t, baseTop, roof, white, '#a3a4a2');
  shell.prism(t, roof, parapet, grey, '#a3a4a2');

  const floors = Math.round((roof - baseTop) / 3.15);
  const pitch = (roof - 0.3 - baseTop - 0.2) / floors;
  edges(t, (a, b, length, i) => {
    const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length;
    const nx = uz, nz = -ux;
    const broad = length > 40;
    if (high) {
      litFacade(shell, seed, i, a, b, baseTop + 0.2, roof - 0.3, floors, broad ? 2.4 : 2.6, 0.58, 0.82, glass, 0.45);
      litFacade(shell, seed, 10 + i, a, b, shell.base + 0.6, baseTop - 0.6, 1, 4.5, 0.82, 0.8, ['#4d6576'], 0.55);
    } else if (length > 8) {
      litFacade(shell, seed, i, a, b, baseTop + 0.2, roof - 0.3, Math.round(floors / 3), broad ? 12 : 8, 0.62, 0.82, glass, 0.45);
    }
    if (!broad) return;
    // Grey panel pilasters split the long faces into the bays seen from 8th Street.
    const at = (u: number, y: number) => [a[0] + ux * u + nx * 0.12, y, a[1] + uz * u + nz * 0.12];
    for (const u of [length * 0.3, length * 0.62]) {
      shell.body.quad(at(u - 2, baseTop), at(u - 2, parapet), at(u + 2, parapet), at(u + 2, baseTop), grey);
    }
    if (!high) return;
    // Dark balcony stacks at both corners of the long faces.
    for (const c of [3.2, length - 3.2]) for (let j = 1; j < floors; j++) {
      const y = baseTop + 0.2 + j * pitch;
      const p = (u: number, out: number, h: number) => [a[0] + ux * (c + u) + nx * out, h, a[1] + uz * (c + u) + nz * out];
      const w = 2.8, d = 1.8;
      shell.body.quad(p(-w, 0.02, y + 0.2), p(w, 0.02, y + 0.2), p(w, d, y + 0.2), p(-w, d, y + 0.2), '#d8d8d4');
      shell.body.quad(p(-w, 0.02, y), p(-w, d, y), p(w, d, y), p(w, 0.02, y), '#9a9b9a');
      shell.body.quad(p(-w, d, y), p(-w, d, y + 1.1), p(w, d, y + 1.1), p(w, d, y), '#3b3d40');
    }
  });

  return shell.finish('#f2d6a8', 0.66);
}
