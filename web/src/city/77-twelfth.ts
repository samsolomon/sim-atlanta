import type { GroundGrid } from '../terrain/grid';
import type { TerrainQuality } from '../terrain/surface';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

export const twelfth77Id = 'osm:way:536895716';
const origin: P2 = [611, -3382];

// Heights are NAVD88 from the 22 April 2019 3DEP returns (docs/log/ui/77-twelfth/README.md).
const towerGround = 291.7;
const lobbyTop = towerGround + 5.2;
const roof = towerGround + 78.4;
const parapet = towerGround + 80.8;
const penthouseTop = towerGround + 82.4;
const deckTop = 293.1 + 19.7;
const stripTop = 293.1 + 9.5;

// OSM part 536895715, squared: the 23-floor slab along 12th Street with its two end nubs.
const tower: P2[] = [
  [573.6, -3395], [648.1, -3395], [648.1, -3385], [646.1, -3385],
  [646.1, -3369.3], [575.4, -3369.3], [575.4, -3380], [573.6, -3380],
];
// Part 1464967898, the garage under the pool deck. Its 12th Street edge tucks inside the slab.
const podium: P2[] = [
  [564.2, -3396.7], [573.9, -3396.7], [573.9, -3394.7], [638.6, -3394.7],
  [638.6, -3338.6], [631.6, -3338.7], [631.6, -3339.1], [564.2, -3339.9],
];
// Part 1464967899, the lower Crescent Avenue frontage. Shared edges sit inside the taller masses.
const strip: P2[] = [
  [638.3, -3369.6], [645.8, -3369.6], [645.8, -3385.3], [647.8, -3385.3],
  [647.8, -3394.9], [651.3, -3394.9], [651.3, -3392.5], [654.9, -3392.5],
  [654.9, -3380.6], [650.9, -3359.5], [646.9, -3346.1], [646.9, -3338.6], [638.3, -3338.6],
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
    if (length > 0.5) draw(a, b, length, i);
  });
}

export function create77Twelfth(buildings: VBuilding[], grid: GroundGrid, quality: TerrainQuality) {
  const found = landmarkShell(buildings, grid, twelfth77Id, '77 12th Street', origin, [1, 0],
    [[0, -6], [-35, 20], [35, 30]]);
  if (!found) return null;
  const shell = found;
  // Lit panes come from the shared hash; each facade call site owns a face-id block of 50.
  const seed = seedOf(twelfth77Id);
  const high = quality === 'high';
  const glass = ['#7d9db2', '#7797ad', '#83a2b6'];
  const slab = '#d3d6d3', cream = '#d8cdb5', tan = '#c4ae8f', brick = '#8c5640', deck = '#c3b9a6';
  const t = local(tower), p = local(podium), s = local(strip);

  shell.prism(s, shell.base, stripTop, brick, '#8d8a82');
  shell.prism(p, shell.base, deckTop, tan, deck);
  shell.prism(t, shell.base, parapet, slab, '#9c9f9e');

  // The Crescent frontage: arched shop windows under a tan cornice on the high tier.
  if (high) edges(s, (a, b, length, i) => {
    if (length > 6) litFacade(shell, seed, 0 + i, a, b, shell.base + 0.6, stripTop - 1.2, 2, 4.2, 0.62, 0.62, ['#3d4a4f'], 0.45);
  });
  // Garage levels between the shop floor and the pool deck.
  if (high) edges(p, (a, b, length, i) => {
    if (length > 6) litFacade(shell, seed, 50 + i, a, b, stripTop + 0.4, deckTop - 0.9, 3, 4.6, 0.74, 0.5, ['#4c4b48', '#55534f'], 0.04);
  });

  // Pool deck: pavers, the pool and the bocce lawn on the garage roof.
  const box = (x0: number, z0: number, x1: number, z1: number, lo: number, hi: number, color: string, top = color) =>
    shell.prism(local([[x0, z0], [x1, z0], [x1, z1], [x0, z1]]), lo, hi, color, top);
  const flat = (x0: number, z0: number, x1: number, z1: number, y: number, color: string) => {
    const [[a, b], [c, d]] = local([[x0, z0], [x1, z1]]);
    shell.body.quad([a, y, b], [a, y, d], [c, y, d], [c, y, b], color);
  };
  flat(584, -3364, 617, -3349, deckTop + 0.03, '#ddd5c4');
  flat(588, -3361, 613, -3352, deckTop + 0.06, '#4fb0c4');
  flat(620, -3366, 636, -3352, deckTop + 0.06, '#7f9a63');
  if (high) {
    flat(621, -3349.5, 635, -3346, deckTop + 0.05, '#cdbf9e');
    box(578, -3368.6, 642, -3366.8, deckTop, deckTop + 0.7, '#8a7b66', '#4f6b3e');
    // The timber pergola west of the pool and the cabanas along its south side.
    for (const [x, z] of [[568.5, -3361.5], [581.5, -3361.5], [568.5, -3348.5], [581.5, -3348.5]] as const)
      box(x - 0.25, z - 0.25, x + 0.25, z + 0.25, deckTop, deckTop + 2.9, '#7a6550');
    box(567.5, -3362.5, 582.5, -3347.5, deckTop + 2.9, deckTop + 3.15, '#8c8a84', '#9a9790');
    for (const x of [593, 599.5, 606]) box(x, -3347.6, x + 3, -3344.6, deckTop, deckTop + 2.6, '#ebe6da', '#e3ddcf');
  }

  // 12th Street entrance canopy (part 1429394390).
  if (high) shell.prism(local([[606.6, -3397.8], [615.4, -3397.8], [615.4, -3394.9], [606.6, -3394.9]]),
    lobbyTop - 0.6, lobbyTop - 0.25, '#e4e2dc', '#d9d6cf');

  if (high) shell.prism(local([[586, -3390], [597, -3390], [597, -3382], [586, -3382]]), parapet, penthouseTop, '#bfc2bf', '#9a9d9c');

  const floors = (lo: number) => Math.round((roof - lo) / 3.33);
  const occupancy = 0.38;
  edges(t, (a, b, length, i) => {
    if (length < 3) return; // the end nubs' 2 m returns stay plain wall
    const long = length > 60, nub = length < 12;
    const lo = long && a[1] < -10 ? lobbyTop + 0.2 : deckTop + 0.3;
    if (long) {
      // Floor-to-ceiling glass: slab edges read as thin light bands between floors.
      litFacade(shell, seed, 100 + i, a, b, lo, roof - 0.2, floors(lo), high ? 3.1 : 12.4, 0.97, 0.84, glass, occupancy);
      if (high && a[1] < -10) litFacade(shell, seed, 150 + i, a, b, shell.base + 0.6, lobbyTop - 0.7, 1, high ? 3.6 : 18.6, 0.9, 0.9, ['#3e555f'], 0.6);
    } else if (nub) {
      litFacade(shell, seed, 200 + i, a, b, lo, roof - 0.2, floors(lo), high ? 2.5 : 10, 0.95, 0.84, glass, occupancy);
    } else {
      // Cream precast end walls with punched room windows.
      shell.body.quad([a[0] + (b[1] - a[1]) * 0.05 / length, lo - 0.2, a[1] - (b[0] - a[0]) * 0.05 / length],
        [a[0] + (b[1] - a[1]) * 0.05 / length, roof, a[1] - (b[0] - a[0]) * 0.05 / length],
        [b[0] + (b[1] - a[1]) * 0.05 / length, roof, b[1] - (b[0] - a[0]) * 0.05 / length],
        [b[0] + (b[1] - a[1]) * 0.05 / length, lo - 0.2, b[1] - (b[0] - a[0]) * 0.05 / length], cream);
      if (high) litFacade(shell, seed, 250 + i, a, b, lo, roof - 0.2, floors(lo), 2.6, 0.5, 0.62, glass, occupancy);
    }
    if (high) balconies(a, b, length, lo, long);
    crown(a, b, length);
  });

  function balconies(a: P2, b: P2, length: number, lo: number, long: boolean) {
    const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length;
    const nx = uz, nz = -ux; // outward
    const stacks = long ? [...Array(10).keys()].map(i => (i + 0.5) * length / 10) : length > 12 ? [length / 2] : [];
    const count = floors(lo);
    const pitch = (roof - 0.2 - lo) / count;
    for (const c of stacks) for (let j = 0; j < count; j++) {
      const y = lo + j * pitch;
      const at = (u: number, out: number, h: number) => [a[0] + ux * (c + u) + nx * out, h, a[1] + uz * (c + u) + nz * out];
      const w = 1.8, d = 1.75;
      // Slab: top, soffit and nosing.
      shell.body.quad(at(-w, 0.02, y + 0.22), at(w, 0.02, y + 0.22), at(w, d, y + 0.22), at(-w, d, y + 0.22), '#d4d3cd');
      shell.body.quad(at(-w, 0.02, y), at(-w, d, y), at(w, d, y), at(w, 0.02, y), '#b6b5ae');
      shell.body.quad(at(-w, d, y), at(-w, d, y + 0.22), at(w, d, y + 0.22), at(w, d, y), '#e1e0da');
      // Glass rail on three sides.
      shell.body.quad(at(-w, d, y + 0.22), at(-w, d, y + 1.2), at(w, d, y + 1.2), at(w, d, y + 0.22), '#8fa7b1');
      shell.body.quad(at(-w, 0.02, y + 0.22), at(-w, 0.02, y + 1.2), at(-w, d, y + 1.2), at(-w, d, y + 0.22), '#8fa7b1');
      shell.body.quad(at(w, d, y + 0.22), at(w, d, y + 1.2), at(w, 0.02, y + 1.2), at(w, 0.02, y + 0.22), '#8fa7b1');
    }
  }

  // The white parapet band, lit from behind at night.
  function crown(a: P2, b: P2, length: number) {
    const nx = (b[1] - a[1]) / length * 0.09, nz = -(b[0] - a[0]) / length * 0.09;
    shell.lights.quad([a[0] + nx, roof + 0.25, a[1] + nz], [a[0] + nx, parapet - 0.15, a[1] + nz],
      [b[0] + nx, parapet - 0.15, b[1] + nz], [b[0] + nx, roof + 0.25, b[1] + nz], '#f1efe8');
  }

  return shell.finish('#f4dcae', 0.7);
}
