import { ShapeUtils, Vector2 } from 'three';
import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { along, faces, litHash, outwardSign, seedOf, wound } from './skin-kit';

export const onePeachtreePointeId = 'osm:way:39450435';
const origin: P2 = [315, -4840];

// One Peachtree Pointe (1555 Peachtree, phase one in front of Two Peachtree Pointe): a seven-storey
// cream precast office block with punched blue windows between pilasters, and a glass entrance drum
// at its south corner banded in cream at each floor and crowned by an open ring. SKYDB 772809535
// (looking north at both buildings). Heights above median grade from the April 2019 lidar:
// block roof 28.2 m (p50), drum 32.2 m (p50), ring to 34.1 m (max).
const BLOCK = 'osm:way:1456732496', DRUM = 'osm:way:1456732497', NOTCH = 'osm:way:1456732499';
const H = { block: 28.2, drum: 32.2, ring: 34.1, notch: 21.6, base: 4.6, storey: 3.45 };

// Shared with Two Peachtree Pointe so the pair reads as one development (its photo-matched colours).
const precast = '#ddd5c4', pilaster = '#e8e1d2', window = '#6c8594', glass = '#7f9fb0', band = '#e3dccc',
  roof = '#9c9890', storefront = '#4a5a64';

export function createOnePeachtreePointe(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const ring = (id: string) => site.parts?.find(p => p.id === id)?.rings[0]?.map(([x, z]): P2 => [x - origin[0], z - origin[1]]);
  const [blockR, drumR, notchR] = [BLOCK, DRUM, NOTCH].map(ring);
  if (!blockR || !drumR) return null;
  const shell = landmarkShell(buildings, grid, site.id, 'One Peachtree Pointe', origin, [1, 0], [[0, -6], [20, -10], [-20, -15]]);
  if (!shell) return null;
  const floor = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const footing = Math.min(floor, shell.base) - 0.65;
  const { body, lights } = shell;
  const seed = seedOf(site.id);
  const block = wound(blockR, 1), drum = wound(drumR, 1);
  const out = outwardSign(block);
  const top = (r: P2[], y: number, c: string) => {
    for (const [a, b, d] of ShapeUtils.triangulateShape(r.map(([x, z]) => new Vector2(x, z)), []))
      body.tri([r[a][0], y, r[a][1]], [r[d][0], y, r[d][1]], [r[b][0], y, r[b][1]], c);
  };

  // The block: cream precast, punched windows between pilasters, a cornice; walls the drum
  // stands against are skipped.
  shell.prism(block, footing, floor + H.block, precast, roof);
  if (notchR) shell.prism(wound(notchR, 1), footing, floor + H.notch, precast, roof);
  const rows = Math.round((H.block - 1.6 - H.base) / H.storey);
  faces(block, (a, b, length, face) => {
    const m = along(a, b, length, length / 2, 1.2 * out);
    if (length < 5 || inRing(m, drum)) return;
    const bays = Math.max(1, Math.round(length / 3.6));
    const p = along(a, b, length, -0.2, 0.3 * out), q = along(a, b, length, length + 0.2, 0.3 * out);
    body.quad([p[0], floor + H.block - 1.1, p[1]], [p[0], floor + H.block, p[1]], [q[0], floor + H.block, q[1]], [q[0], floor + H.block - 1.1, q[1]], pilaster);
    for (let k = 0; k <= bays; k++) {
      const u = k * length / bays, f0 = along(a, b, length, u - 0.35, 0.12 * out), f1 = along(a, b, length, u + 0.35, 0.12 * out);
      body.quad([f0[0], floor + H.base, f0[1]], [f0[0], floor + H.block - 1.1, f0[1]], [f1[0], floor + H.block - 1.1, f1[1]], [f1[0], floor + H.base, f1[1]], pilaster);
    }
    for (let j = 0; j < rows; j++) {
      const y = floor + H.base + j * H.storey;
      for (let k = 0; k < bays; k++) {
        const u = (k + 0.5) * length / bays, w = Math.min(1.25, length / bays * 0.36);
        const g0 = along(a, b, length, u - w, 0.06 * out), g1 = along(a, b, length, u + w, 0.06 * out);
        // Offices at 23:30: mostly dark.
        (litHash(seed, face, j, k) < 0.08 ? lights : body).quad([g0[0], y + 0.6, g0[1]], [g0[0], y + 2.6, g0[1]], [g1[0], y + 2.6, g1[1]], [g1[0], y + 0.6, g1[1]], window);
      }
    }
    const s0 = along(a, b, length, 0.6, 0.05 * out), s1 = along(a, b, length, length - 0.6, 0.05 * out);
    lights.quad([s0[0], footing, s0[1]], [s0[0], floor + 3.6, s0[1]], [s1[0], floor + 3.6, s1[1]], [s1[0], footing, s1[1]], storefront);
  });

  // The drum: blue ribbon glass with a cream band at every floor, a solid cream base storey.
  faces(drum, (a, b, length) => {
    const m = along(a, b, length, length / 2, 1.2 * out);
    if (inRing(m, block)) return;
    const q0 = along(a, b, length, 0, 0), q1 = along(a, b, length, length, 0);
    body.quad([q0[0], footing, q0[1]], [q0[0], floor + H.drum, q0[1]], [q1[0], floor + H.drum, q1[1]], [q1[0], footing, q1[1]], glass);
    const b0 = along(a, b, length, -0.02, 0.06 * out), b1 = along(a, b, length, length + 0.02, 0.06 * out);
    for (let y = floor + H.base; y < floor + H.drum - 0.5; y += H.storey)
      body.quad([b0[0], y - 0.45, b0[1]], [b0[0], y + 0.45, b0[1]], [b1[0], y + 0.45, b1[1]], [b1[0], y - 0.45, b1[1]], band);
    body.quad([b0[0], floor + H.drum - 1, b0[1]], [b0[0], floor + H.drum, b0[1]], [b1[0], floor + H.drum, b1[1]], [b1[0], floor + H.drum - 1, b1[1]], band);
    // The lobby glows behind the lowest glass at night, and a few offices above.
    const l0 = along(a, b, length, 0.05, 0.08 * out), l1 = along(a, b, length, length - 0.05, 0.08 * out);
    lights.quad([l0[0], floor + 0.3, l0[1]], [l0[0], floor + H.base - 0.6, l0[1]], [l1[0], floor + H.base - 0.6, l1[1]], [l1[0], floor + 0.3, l1[1]], glass);
  });
  top(drum, floor + H.drum, roof);
  // The open ring crown on the drum: a cream ring on posts, about 1.5 m out from the glass.
    // The drum part includes a wedge back into the block, so take the curve's radius from the
  // round side: the median distance of its vertices from the rounded front's centre.
  const front = drum.filter(([, z]) => z > 3); // the rounded south front (local z points south)
  const fx = front.reduce((s, p) => s + p[0], 0) / front.length, fz = (Math.min(...front.map(p => p[1])) + Math.max(...front.map(p => p[1]))) / 2;
  const radii = front.map(([x, z]) => Math.hypot(x - fx, z - fz)).sort((a, b) => a - b);
  const r = radii[radii.length >> 1] + 1.2, n = 16;
  const y0 = floor + H.ring - 0.8, y1 = floor + H.ring;
  for (let i = 0; i < n; i++) {
    const t0 = (i / n) * 2 * Math.PI, t1 = ((i + 1) / n) * 2 * Math.PI;
    const p: P2 = [fx + r * Math.cos(t0), fz + r * Math.sin(t0)], q: P2 = [fx + r * Math.cos(t1), fz + r * Math.sin(t1)];
    if (inRing([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], block)) continue; // the ring meets the block behind
    body.quad([p[0], y0, p[1]], [p[0], y1, p[1]], [q[0], y1, q[1]], [q[0], y0, q[1]], band);
    const pi: P2 = [fx + (r - 1.6) * Math.cos(t0), fz + (r - 1.6) * Math.sin(t0)], qi: P2 = [fx + (r - 1.6) * Math.cos(t1), fz + (r - 1.6) * Math.sin(t1)];
    body.quad([p[0], y1, p[1]], [pi[0], y1, pi[1]], [qi[0], y1, qi[1]], [q[0], y1, q[1]], band);
    if (i % 2 === 0) body.quad([pi[0], floor + H.drum, pi[1]], [pi[0], y0, pi[1]], [p[0], y0, p[1]], [p[0], floor + H.drum, p[1]], band);
  }
  return shell.finish('#f2d6a8', 0.6);
}

function inRing([x, z]: P2, ring: P2[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
