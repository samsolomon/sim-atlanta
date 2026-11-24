import type { GroundGrid } from '../terrain/grid';
import type { TerrainQuality } from '../terrain/surface';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

export const universityHouseId = 'osm:way:886034002';
const origin: P2 = [208, -2910];

// NAVD88 from the 22 April 2019 3DEP returns (docs/log/ui/university-house/README.md).
const grade = 286.0;
const lobbyTop = grade + 5;
const roof = grade + 63.8;
const parapet = grade + 65.6;
const deckTop = grade + 8.1;
const baseTop = grade + 9;

// The 19-storey L traced from the lidar: a bar on Peachtree Place and a wing down Spring Street.
const tower: P2[] = [
  [177.8, -2947.2], [228.0, -2950.1], [230.1, -2936.3], [229.0, -2924.9], [229.0, -2869.0],
  [208.5, -2869.0], [208.5, -2926.0], [177.8, -2926.0],
];
// The open garage under the amenity deck, and the base wedge on Spring Street.
// Edges they share with the tower sit inside it.
const garage: P2[] = [[177.4, -2869.3], [208.9, -2868.9], [208.9, -2926.4], [177.7, -2926.4]];
const base: P2[] = [[228.6, -2869.2], [240.3, -2869.4], [231.4, -2925.0], [228.6, -2924.9]];

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

// Panel blocks across each long face, as fractions of its length: light grey, mid grey,
// charcoal and the yellow balcony strip seen in the Midtown Alliance photograph.
const light = '#d4d6d6', mid = '#a9adb0', charcoal = '#3e4043', yellow = '#e2b23c';
const schemes: [number, string][][] = [
  [[0.38, light], [0.5, yellow], [0.72, mid], [1, charcoal]],
  [[0.3, charcoal], [0.55, light], [0.68, yellow], [1, mid]],
];

export function createUniversityHouse(buildings: VBuilding[], grid: GroundGrid, quality: TerrainQuality) {
  const found = landmarkShell(buildings, grid, universityHouseId, 'University House', origin, [1, 0],
    [[0, -25], [12, 20], [-20, 20]]);
  if (!found) return null;
  const shell = found;
  const high = quality === 'high';
  const windows = ['#4f5c69', '#56636f', '#4a5866'];
  const t = local(tower);
  // Lit panes come from the shared hash. Face ids: tower edges 0–9, garage 20+, base 40+, base trim 60+.
  const seed = seedOf(universityHouseId);

  shell.prism(local(garage), shell.base, deckTop, '#c9c7c0', '#b3aea4');
  shell.prism(local(base), shell.base, baseTop, charcoal, '#8d8f8f');
  shell.prism(t, shell.base, high ? roof : parapet, mid, '#9a9c9c');
  if (high) shell.prism(t, roof, parapet, charcoal, '#8d8f8f');

  // Amenity deck over the garage.
  const [[dx0, dz0], [dx1, dz1]] = local([[181, -2922], [205, -2873]]);
  shell.body.quad([dx0, deckTop + 0.04, dz0], [dx0, deckTop + 0.04, dz1], [dx1, deckTop + 0.04, dz1], [dx1, deckTop + 0.04, dz0], '#cfc8b8');

  edges(local(garage), (a, b, length, i) => {
    if (high && length > 20) litFacade(shell, seed, 20 + i, a, b, shell.base + 0.6, deckTop - 0.8, 2, 6, 0.82, 0.5, ['#4a4c4e'], 0);
  });
  edges(local(base), (a, b, length, i) => {
    if (length < 8) return;
    litFacade(shell, seed, 40 + i, a, b, shell.base + 0.6, baseTop - 1.2, 1, high ? 4 : 20, 0.85, 0.8, ['#3b4a55'], 0.55);
    if (high) litFacade(shell, seed, 60 + i, a, b, baseTop - 1.1, baseTop - 0.5, 1, length, 1, 1, [yellow], 0);
  });

  const floors = Math.round((roof - lobbyTop) / 3.3);
  let scheme = 0;
  edges(t, (a, b, length, i) => {
    const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length;
    const nx = uz * 0.04, nz = -ux * 0.04;
    const panel = (u0: number, u1: number, color: string) => shell.body.quad(
      [a[0] + ux * u0 + nx, grade, a[1] + uz * u0 + nz], [a[0] + ux * u0 + nx, roof, a[1] + uz * u0 + nz],
      [a[0] + ux * u1 + nx, roof, a[1] + uz * u1 + nz], [a[0] + ux * u1 + nx, grade, a[1] + uz * u1 + nz], color);
    if (length > 25) {
      let from = 0;
      for (const [to, color] of schemes[scheme++ % schemes.length]) { panel(from * length, to * length, color); from = to; }
    } else panel(0, length, light);
    // Punched windows; the low tier draws one pane row per three floors.
    if (high) litFacade(shell, seed, i, a, b, lobbyTop + 0.4, roof - 0.4, floors, 3.2, 0.42, 0.55, windows, 0.45);
    else if (length > 15) litFacade(shell, seed, i, a, b, lobbyTop + 0.4, roof - 0.4, Math.round(floors / 3), 12, 0.45, 0.4, windows, 0.45);
  });

  if (high) {
    // The glass lounge over the charcoal corner block on Peachtree Place.
    const g = local([[214, -2950], [228, -2950], [229.5, -2938], [214, -2938]]);
    shell.prism(g, parapet, grade + 68.2, '#7d97a6', '#8d8f8f');
  }

  return shell.finish('#f2d6a8', 0.66);
}
