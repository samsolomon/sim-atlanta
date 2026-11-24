import type { GroundGrid } from '../terrain/grid';
import type { TerrainQuality } from '../terrain/surface';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

export const windsorOverPeachtreeId = 'osm:way:234939890';
const origin: P2 = [557, -1963];

// NAVD88 from the 22 April 2019 3DEP returns (docs/log/ui/windsor-over-peachtree/README.md); the shell's y is NAVD88.
const roof = 368.9;
const parapet = 369.5;
const baseTop = 316; // the low wing and the ground-floor lobby line

// The 1964 slab between North Avenue and the garage, squared from the mapped outline.
const slab: P2[] = [[517.6, -1953.4], [597.9, -1953.2], [598.0, -1974.3], [517.6, -1974.6]];
// The low wing on the south-west, under the slab's edge.
const wing: P2[] = [[517.4, -1974.2], [536.2, -1974.2], [536.3, -1987.6], [517.4, -1988.2]];

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

export function createWindsorOverPeachtree(buildings: VBuilding[], grid: GroundGrid, quality: TerrainQuality) {
  const found = landmarkShell(buildings, grid, windsorOverPeachtreeId, 'Windsor Over Peachtree', origin, [1, 0],
    [[0, 0], [-35, 0], [35, 0]]);
  if (!found) return null;
  const shell = found;
  const high = quality === 'high';
  // Lit panes come from the shared hash. Face ids: slab edges 0–3, lobby 10+, wing 20+.
  const seed = seedOf(windsorOverPeachtreeId);
  const brick = '#c6ab8c', trim = '#ecebe6';
  // Sliding-door glass behind the balconies: base #a3adb4 (S 9%, V 71%) renders at V ≥ 40 under the slab shade.
  const glass = ['#a3adb4', '#a9b3b9', '#9ea8b0'];
  const s = local(slab);

  shell.prism(local(wing), shell.base, baseTop, brick, '#8f8d88');
  shell.prism(s, shell.base, roof, brick, '#9c988f');
  shell.prism(s, roof, parapet, trim, '#9c988f');
  if (high) edges(local(wing), (a, b, length, i) => {
    litFacade(shell, seed, 20 + i, a, b, shell.base + 0.6, baseTop - 0.8, 1, 4, 0.7, 0.7, ['#3e4a52'], 0.4);
  });

  const floors = 19, lo = baseTop + 0.4;
  const pitch = (roof - 0.4 - lo) / floors;
  edges(s, (a, b, length, i) => {
    const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length, nx = uz, nz = -ux;
    const at = (u: number, y: number, out: number) => [a[0] + ux * u + nx * out, y, a[1] + uz * u + nz * out];
    const long = length > 40;
    // Lobby glazing and the white column canopy line at the base.
    if (high) litFacade(shell, seed, 10 + i, a, b, shell.base + 0.6, lo - 0.6, 1, 4.5, 0.82, 0.8, ['#3e4a52'], 0.5);
    if (!long) {
      // Brick end walls with a narrow window strip either side of centre.
      litFacade(shell, seed, i, a, b, lo, roof - 0.4, high ? floors : 7, length / 3, 0.18, 0.7, glass, 0.4);
      return;
    }
    // Balcony bays: glass doors behind the slab edges, with brick piers every few bays.
    litFacade(shell, seed, i, a, b, lo, roof - 0.4, high ? floors : Math.round(floors / 3), high ? 3.4 : 13, 0.55, 0.62, glass, 0.4);
    // Balcony runs between brick piers: white slab edges on every floor (every third on the low tier).
    const step = high ? 1 : 3;
    const d = high ? 1.4 : 0.15;
    const runs = Math.max(1, Math.round(length / 12));
    for (let k = 0; k < runs; k++) {
      const u0 = k * length / runs + 1.3, u1 = (k + 1) * length / runs - 1.3;
      for (let j = step; j < floors; j += step) {
        const y = lo + j * pitch;
        shell.body.quad(at(u0, y - 0.22, d), at(u0, y + 0.12, d), at(u1, y + 0.12, d), at(u1, y - 0.22, d), trim);
        if (!high) continue;
        shell.body.quad(at(u0, y + 0.12, 0.02), at(u0, y + 0.12, d), at(u1, y + 0.12, d), at(u1, y + 0.12, 0.02), '#d9d7d0');
        shell.body.quad(at(u0, y + 0.12, d - 0.05), at(u0, y + 1.0, d - 0.05), at(u1, y + 1.0, d - 0.05), at(u1, y + 0.12, d - 0.05), '#c4c8ca');
      }
    }
  });

  return shell.finish('#f2d6a8', 0.66);
}
