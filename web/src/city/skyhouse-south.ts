import type { GroundGrid } from '../terrain/grid';
import type { TerrainQuality } from '../terrain/surface';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

export const skyhouseSouthId = 'osm:way:445841094';
const origin: P2 = [770, -2622];

// NAVD88 from the 22 April 2019 3DEP returns (docs/log/ui/skyhouse-south/README.md).
const grade = 305.1;
const lobbyTop = grade + 5;
const roof = grade + 75.6;
const crownTop = grade + 79.5;

// The 23-storey slab fills the mapped outline on 6th Street, squared at its corners.
const tower: P2[] = [
  [741.6, -2612.2], [796.6, -2607.4], [798.9, -2633.1], [743.7, -2637.9],
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

export function createSkyhouseSouth(buildings: VBuilding[], grid: GroundGrid, quality: TerrainQuality) {
  const found = landmarkShell(buildings, grid, skyhouseSouthId, 'SkyHouse South', origin, [1, 0],
    [[0, 0], [-22, 0], [22, 0]]);
  if (!found) return null;
  const shell = found;
  const high = quality === 'high';
  // Lit panes come from the shared hash. Face ids: tower edges 0–3, lobby 10+.
  const seed = seedOf(skyhouseSouthId);
  const white = '#e8e6df';
  // Teal-green glass from the property photograph: base #7fb3ad (S 29%, V 70%), deeper than the generic beige grid.
  const glass = ['#7fb3ad', '#86b8b2', '#79ada8'];
  const blue = '#7b98c2';
  const t = local(tower);

  shell.prism(t, shell.base, roof, white, '#a9a8a2');
  // The rooftop sky deck: a set-back white box whose top storey is a row of blue square panels.
  const deck = t.map(([x, z]): P2 => [x * 0.86, z * 0.7]);
  shell.prism(deck, roof, crownTop - 2.2, white, '#b5b3ac');
  shell.prism(deck, crownTop - 2.2, crownTop, high ? white : blue, '#b5b3ac');
  if (high) edges(deck, (a, b, length) => {
    const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length, nx = uz * 0.06, nz = -ux * 0.06;
    const n = Math.max(2, Math.round(length / 3));
    for (let k = 0; k < n; k++) {
      const u0 = (k + 0.08) * length / n, u1 = (k + 0.92) * length / n;
      shell.body.quad([a[0] + ux * u0 + nx, crownTop - 2.05, a[1] + uz * u0 + nz], [a[0] + ux * u0 + nx, crownTop - 0.2, a[1] + uz * u0 + nz],
        [a[0] + ux * u1 + nx, crownTop - 0.2, a[1] + uz * u1 + nz], [a[0] + ux * u1 + nx, crownTop - 2.05, a[1] + uz * u1 + nz], blue);
    }
  });

  const floors = Math.round((roof - lobbyTop) / 3.2);
  const pitch = (roof - 0.3 - lobbyTop - 0.2) / floors;
  edges(t, (a, b, length, i) => {
    const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length;
    const nx = uz, nz = -ux;
    const broad = length > 40;
    if (high) litFacade(shell, seed, i, a, b, lobbyTop + 0.2, roof - 0.3, floors, broad ? 2.8 : 2.6, 0.62, 0.84, glass, 0.45);
    else litFacade(shell, seed, i, a, b, lobbyTop + 0.2, roof - 0.3, Math.round(floors / 3), broad ? 12 : 9, 0.7, 0.84, glass, 0.45);
    if (high || broad) litFacade(shell, seed, 10 + i, a, b, shell.base + 0.6, lobbyTop - 0.4, 1, high ? 4 : 18, 0.86, 0.85, ['#4d6f86'], 0.6);
    // Blue glass band around the parapet.
    const at = (u: number, y: number) => [a[0] + ux * u + nx * 0.1, y, a[1] + uz * u + nz * 0.1];
    shell.body.quad(at(0, roof - 1.6), at(0, roof + 0.4), at(length, roof + 0.4), at(length, roof - 1.6), '#86a2c4');
    // White piers proud of the glass, rising past the parapet as the SkyHouse crown frame.
    // Their top 3 m glow at night, as on the SkyHouse program's dusk photograph.
    const piers = broad ? Math.round(length / 7.4) : 2;
    for (let k = 0; k <= piers; k++) {
      const c = Math.min(length - 0.5, Math.max(0.5, k * length / piers));
      const top = crownTop + (k % 2 ? 1.2 : 2.6);
      const q = (u: number, out: number, y: number) => [a[0] + ux * (c + u) + nx * out, y, a[1] + uz * (c + u) + nz * out];
      shell.body.quad(q(-0.5, 0.45, lobbyTop), q(-0.5, 0.45, top - 3), q(0.5, 0.45, top - 3), q(0.5, 0.45, lobbyTop), white);
      shell.lights.quad(q(-0.5, 0.45, top - 3), q(-0.5, 0.45, top), q(0.5, 0.45, top), q(0.5, 0.45, top - 3), white);
      if (high) {
        shell.body.quad(q(-0.5, 0, lobbyTop), q(-0.5, 0, top), q(-0.5, 0.45, top), q(-0.5, 0.45, lobbyTop), '#d9d7d0');
        shell.body.quad(q(0.5, 0.45, lobbyTop), q(0.5, 0.45, top), q(0.5, 0, top), q(0.5, 0, lobbyTop), '#d9d7d0');
        shell.body.quad(q(-0.5, 0, top), q(-0.5, 0.45, top), q(0.5, 0.45, top), q(0.5, 0, top), white);
      }
    }
    if (!high || !broad) return;
    // Balcony stacks at both ends of the long faces and one in the middle.
    for (const c of [3, length / 2, length - 3]) for (let j = 1; j < floors; j++) {
      const y = lobbyTop + 0.2 + j * pitch;
      const p = (u: number, out: number, h: number) => [a[0] + ux * (c + u) + nx * out, h, a[1] + uz * (c + u) + nz * out];
      const w = 2.4, d = 1.4;
      shell.body.quad(p(-w, 0.02, y + 0.18), p(w, 0.02, y + 0.18), p(w, d, y + 0.18), p(-w, d, y + 0.18), '#eceae3');
      shell.body.quad(p(-w, 0.02, y), p(-w, d, y), p(w, d, y), p(w, 0.02, y), '#cfccc3');
      shell.body.quad(p(-w, d, y), p(-w, d, y + 1.1), p(w, d, y + 1.1), p(w, d, y), '#a9bfc2');
    }
  });

  return shell.finish('#f2d6a8', 0.66);
}
