import type { GroundGrid } from '../terrain/grid';
import type { TerrainQuality } from '../terrain/surface';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

export const twelveMidtownId = 'osm:way:247997228';
const origin: P2 = [-600, -4190];

// NAVD88 from the 22 April 2019 3DEP returns (docs/log/ui/twelve-midtown/README.md).
const grade = 276.3;
const lobbyTop = grade + 6;
const roof = grade + 87;
const parapet = grade + 89;
const spireTop = grade + 96.5;
const wingTop = grade + 8.5;

// The 26-storey slab along 17th Street fills the bar of the mapped outline.
const tower: P2[] = [
  [-644.5, -4205.3], [-558.5, -4205.3], [-558.8, -4174.4], [-574.1, -4174.5], [-574.2, -4171.5],
  [-629.3, -4171.8], [-629.2, -4174.9], [-644.7, -4174.9],
];
// The low service wing behind it. Its edge against the slab sits inside the slab.
const wing: P2[] = [
  [-602.7, -4205.0], [-599.8, -4205.0], [-599.7, -4228.9], [-592.5, -4228.9], [-592.3, -4264.3],
  [-629.7, -4264.5], [-630.6, -4248.9], [-635.7, -4243.9], [-640.6, -4229.3], [-602.5, -4229.1],
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

export function createTwelveMidtown(buildings: VBuilding[], grid: GroundGrid, quality: TerrainQuality) {
  const found = landmarkShell(buildings, grid, twelveMidtownId, 'Twelve Midtown', origin, [1, 0],
    [[0, 0], [-35, 0], [35, 0]]);
  if (!found) return null;
  const shell = found;
  // Lit panes come from the shared hash; each facade call site owns a face-id block of 50.
  const seed = seedOf(twelveMidtownId);
  const high = quality === 'high';
  const stone = '#e2d8c2', trim = '#eee7d8';
  const glass = ['#7fa9a5', '#88b0ac', '#76a29e'];
  const t = local(tower);

  shell.prism(local(wing), shell.base, wingTop, '#b9ad97', '#9d9a92');
  if (high) {
    shell.prism(t, shell.base, roof, stone, '#a8a294');
    shell.prism(t, roof, parapet, trim, '#a8a294');
  } else shell.prism(t, shell.base, parapet, stone, '#a8a294');

  const floors = Math.round((roof - lobbyTop) / 3.24);
  const pitch = (roof - 0.3 - lobbyTop) / floors;
  edges(t, (a, b, length, i) => {
    const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length;
    const nx = uz, nz = -ux;
    const broad = Math.abs(ux) > 0.85 && length > 20;
    if (high) litFacade(shell, seed, 0 + i, a, b, lobbyTop + 0.2, roof - 0.3, floors, broad ? 3 : 2.6, broad ? 0.45 : 0.45, 0.8, glass, 0.45);
    // The low tier draws one pane row per three floors.
    else if (length > 8) litFacade(shell, seed, 50 + i, a, b, lobbyTop + 0.2, roof - 0.3, Math.round(floors / 3), broad ? 20 : 14, 0.62, 0.8, glass, 0.45);
    if (high || broad) litFacade(shell, seed, 100 + i, a, b, shell.base + 0.6, lobbyTop - 0.5, 1, high ? 4 : 20, 0.88, 0.85, ['#3a4b52'], 0.6);
    if (!high) return;
    // Balcony slabs with white rails, in stacks across the broad faces and down the middle of the ends.
    const stacks = broad ? [...Array(Math.round(length / 6)).keys()].map(i => (i + 0.5) * length / Math.round(length / 6))
      : length > 12 ? [length / 2] : [];
    for (const c of stacks) for (let j = 1; j < floors; j++) {
      const y = lobbyTop + 0.2 + j * pitch;
      const at = (u: number, out: number, h: number) => [a[0] + ux * (c + u) + nx * out, h, a[1] + uz * (c + u) + nz * out];
      const w = broad ? 2.2 : 3.4, d = 1.5;
      shell.body.quad(at(-w, 0.02, y + 0.18), at(w, 0.02, y + 0.18), at(w, d, y + 0.18), at(-w, d, y + 0.18), '#e4ded1');
      shell.body.quad(at(-w, 0.02, y), at(-w, d, y), at(w, d, y), at(w, 0.02, y), '#cfc6b3');
      shell.body.quad(at(-w, d, y), at(-w, d, y + 1.1), at(w, d, y + 1.1), at(w, d, y), '#d6d2c8');
    }
  });

  // Twin spires over each end and small pinnacles at the corners of the broad faces.
  const spire = (x: number, z: number, half: number, base: number, top: number) => {
    const [[px, pz]] = local([[x, z]]);
    const c = [[px - half, pz - half], [px + half, pz - half], [px + half, pz + half], [px - half, pz + half]];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = c[i], [bx, bz] = c[(i + 1) % 4];
      shell.body.tri([ax, base, az], [bx, base, bz], [px, top, pz], trim);
    }
  };
  for (const x of [-640, -563]) for (const z of [-4196, -4183]) spire(x, z, 1.6, parapet, spireTop);
  if (high) for (const [x, z] of [[-620, -4204], [-582, -4204], [-620, -4173], [-582, -4173]])
    spire(x, z, 0.9, parapet, parapet + 4);

  return shell.finish('#f2d6a8', 0.66);
}
