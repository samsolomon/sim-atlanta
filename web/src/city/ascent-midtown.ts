import type { GroundGrid } from '../terrain/grid';
import type { TerrainQuality } from '../terrain/surface';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

export const ascentMidtownId = 'osm:way:884939412';
const origin: P2 = [290, -4322];

// NAVD88 from the 22 April 2019 3DEP returns (docs/log/ui/ascent-midtown/README.md).
const grade = 275.1;
const podiumTop = grade + 20;
const roof = grade + 88.5;
const crownTop = grade + 91.4;
const lobbyTop = grade + 5;

// The L-shaped tower traced from the lidar: a slab on the north edge and a wing down West Peachtree.
const tower: P2[] = [
  [290.3, -4341.6], [324.8, -4341.8], [324.8, -4343.9], [337.5, -4344.0], [339.4, -4338.0],
  [339.4, -4307.0], [312.0, -4307.0], [312.0, -4322.0], [290.3, -4322.0],
];
// The shared podium south and west of the tower. Edges against the tower sit inside it.
const podium: P2[] = [
  [236.4, -4300.6], [339.1, -4301.1], [339.1, -4307.4], [312.4, -4307.4], [312.4, -4322.4],
  [290.7, -4322.4], [290.7, -4331.5], [236.3, -4331.3],
];

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

export function createAscentMidtown(buildings: VBuilding[], grid: GroundGrid, quality: TerrainQuality) {
  const found = landmarkShell(buildings, grid, ascentMidtownId, 'Ascent Midtown', origin, [1, 0],
    [[20, -10], [-30, 10], [40, 5]]);
  if (!found) return null;
  const shell = found;
  // Lit panes come from the shared hash; each facade call site owns a face-id block of 50.
  const seed = seedOf(ascentMidtownId);
  const high = quality === 'high';
  const panel = '#c8cbcd', charcoal = '#3f4145', brick = '#4b4c50';
  const glass = ['#7f97a8', '#7a92a3', '#86a0b1'];
  const t = local(tower), p = local(podium);

  shell.prism(p, shell.base, podiumTop, brick, '#b9b3a7');
  shell.prism(t, shell.base, roof, panel, '#9a9c9c');
  // The charcoal crown frame around the sky lounge.
  shell.prism(t, roof, crownTop, charcoal, '#6d7073');

  // Pool deck on the podium, between the tower and the garage's west end.
  const flat = (x0: number, z0: number, x1: number, z1: number, y: number, color: string) => {
    const [[a, b], [c, d]] = local([[x0, z0], [x1, z1]]);
    shell.body.quad([a, y, b], [a, y, d], [c, y, d], [c, y, b], color);
  };
  flat(252, -4320, 284, -4307, podiumTop + 0.03, '#d3ccbd');
  flat(258, -4317, 278, -4310, podiumTop + 0.06, '#4fb0c4');
  if (high) flat(240, -4328, 250, -4304, podiumTop + 0.05, '#6f8f5a');

  // Podium: dark brick with shopfronts on the street, garage levels above on the high tier.
  edges(p, (a, b, length, i) => {
    if (length < 8) return;
    if (high) litFacade(shell, seed, 0 + i, a, b, lobbyTop + 1, podiumTop - 1, 4, 4.4, 0.7, 0.45, ['#2f3134', '#36383b'], 0.06);
    litFacade(shell, seed, 50 + i, a, b, shell.base + 0.6, lobbyTop - 0.3, 1, high ? 4 : 12, 0.85, 0.85, ['#3a4650'], 0.55);
  });

  const floors = (lo: number) => Math.round((roof - lo) / 3.3);
  edges(t, (a, b, length, i) => {
    // The north slab and the West Peachtree face run to the sidewalk; the others start on the podium.
    const street = Math.abs(b[1] - a[1]) < 1 ? a[1] < -15 : a[0] > 45;
    const lo = street ? lobbyTop + 0.3 : podiumTop + 0.5;
    if (street) litFacade(shell, seed, 100 + i, a, b, shell.base + 0.6, lobbyTop - 0.4, 1, high ? 3.6 : 12, 0.9, 0.85, ['#3d4f5b'], 0.6);
    // The low tier pairs floors into one pane row and leaves the short jogs plain.
    if (high) litFacade(shell, seed, 150 + i, a, b, lo, roof - 0.3, floors(lo), 2.9, 0.62, 0.86, glass, 0.4);
    else if (length > 8) litFacade(shell, seed, 200 + i, a, b, lo, roof - 0.3, Math.round(floors(lo) / 2), 16, 0.8, 0.9, glass, 0.4);
    if (high && length > 18) balconies(a, b, length, lo);
  });

  function balconies(a: P2, b: P2, length: number, lo: number) {
    const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length;
    const nx = uz, nz = -ux;
    const stacks = Math.max(2, Math.round(length / 9));
    const count = floors(lo), pitch = (roof - 0.3 - lo) / count;
    for (let s = 0; s < stacks; s++) {
      const c = (s + 0.5) * length / stacks;
      for (let j = 1; j < count; j++) {
        const y = lo + j * pitch;
        const at = (u: number, out: number, h: number) => [a[0] + ux * (c + u) + nx * out, h, a[1] + uz * (c + u) + nz * out];
        const w = 1.9, d = 1.6;
        shell.body.quad(at(-w, 0.02, y + 0.2), at(w, 0.02, y + 0.2), at(w, d, y + 0.2), at(-w, d, y + 0.2), '#d2d3d1');
        shell.body.quad(at(-w, 0.02, y), at(-w, d, y), at(w, d, y), at(w, 0.02, y), '#9c9d9b');
        shell.body.quad(at(-w, d, y), at(-w, d, y + 1.15), at(w, d, y + 1.15), at(w, d, y), '#93a8b3');
        shell.body.quad(at(-w, 0.02, y), at(-w, 0.02, y + 1.15), at(-w, d, y + 1.15), at(-w, d, y), '#93a8b3');
        shell.body.quad(at(w, d, y), at(w, d, y + 1.15), at(w, 0.02, y + 1.15), at(w, 0.02, y), '#93a8b3');
      }
    }
  }

  return shell.finish('#f2d6a8', 0.66);
}
