import type { GroundGrid } from '../terrain/grid';
import type { TerrainQuality } from '../terrain/surface';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

export const azureOnTheParkId = 'osm:way:536885864';
const origin: P2 = [980, -3205];

// NAVD88 roofs from the 22 April 2019 3DEP returns (docs/log/ui/azure-on-the-park/README.md).
// Ground is about 279.7 m NAVD88 around the tower.
const podiumTop = 297.5;
const stepTop = 348.9;
const roof = 358.5;
const parapet = 361;

// The 25-storey tower on 11th Street at the west end of the lot, with its lower east step.
const tower: P2[] = [[911.0, -3225.3], [956.4, -3225.3], [956.4, -3205.2], [911.0, -3205.2]];
const step: P2[] = [[956.0, -3224.5], [966.1, -3224.5], [966.1, -3206.2], [956.0, -3206.2]];
// The four-storey podium running east to Piedmont Avenue, with the rounded glass corner at 11th.
const podium: P2[] = [
  [965.6, -3226.5], [1042.9, -3226.2], [1046.1, -3226.8], [1048.4, -3226.6], [1050.4, -3225.2],
  [1051.3, -3223.7], [1051.7, -3222.1], [1051.2, -3219.7], [1050.2, -3218.4], [1047.4, -3217.0],
  [1041.4, -3199.9], [1033.2, -3177.4], [971.0, -3177.3], [970.9, -3204.1], [965.6, -3204.1],
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
    if (length > 1.5) draw(a, b, length, i);
  });
}

export function createAzureOnThePark(buildings: VBuilding[], grid: GroundGrid, quality: TerrainQuality) {
  const found = landmarkShell(buildings, grid, azureOnTheParkId, 'Azure on the Park', origin, [1, 0],
    [[-45, -10], [30, 10], [60, -15]]);
  if (!found) return null;
  const shell = found;
  const high = quality === 'high';
  // Lit panes come from the shared hash. Face ids: tower 0+, step 10+, podium 20+, curved corner 60+.
  const seed = seedOf(azureOnTheParkId);
  // The shell's local y is NAVD88.
  const y = (navd: number) => navd;
  const brick = '#4f5052', precast = '#cdbfa6', slab = '#c9cbcc';
  // Blue reflective curtain glass, visibly bluer than its neighbours in the March 2025 11th Street
  // view and the October 2019 Piedmont House rooftop view: base #86a0c0 is S 30%, V 75%.
  const glass = ['#86a0c0', '#8ca5c3', '#819bbb'];
  const t = local(tower), s = local(step), p = local(podium);

  shell.prism(p, shell.base, y(podiumTop), precast, '#9c9a93');
  shell.prism(t, shell.base, y(roof), slab, '#9fa2a4');
  shell.prism(t, y(roof), y(parapet), slab, '#9fa2a4');
  shell.prism(s, shell.base, y(stepTop), slab, '#9fa2a4');

  // Rooftop pool on the 23rd floor terrace, cantilevered toward the park.
  if (high) {
    const [[a, b], [c, d]] = local([[930, -3222], [950, -3216]]);
    shell.body.quad([a, y(parapet) + 0.05, b], [a, y(parapet) + 0.05, d], [c, y(parapet) + 0.05, d], [c, y(parapet) + 0.05, b], '#5fb3cf');
  }

  const podFloors = 4, towerLo = y(podiumTop) + 0.3;
  const floors = Math.round((y(roof) - towerLo) / 3.1);
  const pitch = (y(roof) - 0.3 - towerLo) / floors;
  const tower3 = (ring: P2[], top: number, block: number) => edges(ring, (a, b, length, i) => {
    const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length, nx = uz, nz = -ux;
    const at = (u: number, yy: number, out: number) => [a[0] + ux * u + nx * out, yy, a[1] + uz * u + nz * out];
    // Dark brick below the podium line, as in Street View on 11th Street.
    shell.body.quad(at(0, shell.base, 0.06), at(0, towerLo, 0.06), at(length, towerLo, 0.06), at(length, shell.base, 0.06), brick);
    const rows = Math.round((top - towerLo) / 3.1);
    if (high) {
      litFacade(shell, seed, block + i, a, b, towerLo, top - 0.3, rows, 3.2, 0.92, 0.78, glass, 0.45);
      litFacade(shell, seed, block + 40 + i, a, b, shell.base + 0.8, towerLo - 0.8, podFloors, 3.2, 0.55, 0.55, ['#3d4d5b'], 0.35);
    } else if (length > 8) {
      litFacade(shell, seed, block + i, a, b, towerLo, top - 0.3, Math.round(rows / 3), 12, 0.9, 0.9, glass, 0.45);
    }
    // Cantilevered balconies stacked full height at the main tower's corners, wrapping them
    // (both photos), with white slab edges and dark rails. Each face carries a stack at each end.
    if (block !== 0 || length < 15) return;
    const w = 2.1, d = 1.7;
    for (const c of [w, length - w]) for (let j = 1; j < floors; j++) {
      const yy = towerLo + j * pitch;
      const q = (u: number, out: number, h: number) => at(c + u, h, out);
      // A bright slab nosing keeps the stacks legible on the shaded faces, on both tiers.
      shell.body.quad(q(-w, d + 0.02, yy - 0.05), q(-w, d + 0.02, yy + 0.25), q(w, d + 0.02, yy + 0.25), q(w, d + 0.02, yy - 0.05), '#f2f3f2');
      if (!high) continue;
      shell.body.quad(q(-w, 0.02, yy + 0.2), q(w, 0.02, yy + 0.2), q(w, d, yy + 0.2), q(-w, d, yy + 0.2), '#e4e5e4');
      shell.body.quad(q(-w, 0.02, yy), q(-w, d, yy), q(w, d, yy), q(w, 0.02, yy), '#c2c4c4');
      shell.body.quad(q(-w, d, yy + 0.25), q(-w, d, yy + 1.1), q(w, d, yy + 1.1), q(w, d, yy + 0.25), '#3a3f44');
    }
  });
  tower3(t, y(roof), 0);
  tower3(s, y(stepTop), 10);

  // Podium: tan precast with punched windows, the curved corner in blue glass.
  edges(p, (a, b, length, i) => {
    // The west edge is buried in the tower step; its panes would never show.
    if (a[0] < -13 && b[0] < -13) return;
    const corner = a[0] > 60 && a[1] < -8;
    const lo = shell.base + 0.6, hi = y(podiumTop) - 0.6;
    if (corner) litFacade(shell, seed, 60 + i, a, b, lo, hi, high ? podFloors : 1, 3, 0.96, 0.9, glass, 0.4);
    else if (high) litFacade(shell, seed, 20 + i, a, b, lo, hi, podFloors, 3.4, 0.6, 0.6, ['#46586a'], 0.4);
    else if (length > 20) litFacade(shell, seed, 20 + i, a, b, lo, hi, 2, 12, 0.6, 0.5, ['#46586a'], 0.4);
  });

  return shell.finish('#f2d6a8', 0.66);
}
