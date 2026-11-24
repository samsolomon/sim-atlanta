import type { GroundGrid } from '../terrain/grid';
import type { TerrainQuality } from '../terrain/surface';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { along, faces, litHash, outwardSign, seedOf, wound } from './skin-kit';

export const parkCentralId = 'osm:way:234933267';
const origin: P2 = [934, -3440];

// Park Central (1101 Juniper Street, 1998): an 18-storey buff stucco condominium slab on 12th
// Street with a south wing on Juniper, paired white-framed windows, recessed balcony stacks, a
// red-brick base with an arched entry and a grey hipped roof, over a parking deck. Heights are the
// April 2019 lidar per mapped part above median grade: main eave 49.6 m (p50), ridge 54.6 m (p95);
// south wing 36.9 m, ridge 39.9 m; deck 18.5 m.
type Bar = { x0: number; x1: number; z0: number; z1: number; eave: number; ridge: number };
const bars: Bar[] = [
  { x0: 884.9, x1: 984.1, z0: -3418.0, z1: -3395.0, eave: 49.6, ridge: 54.6 }, // 12th Street slab
  { x0: 883.5, x1: 905.3, z0: -3459.8, z1: -3418.0, eave: 49.6, ridge: 54.6 }, // Juniper leg
  { x0: 885.6, x1: 907.1, z0: -3491.6, z1: -3459.8, eave: 36.9, ridge: 39.9 }, // south wing
];
const deckPart = 'osm:way:234933263', deckH = 18.5;
const base = 7.2, storey = 2.95;

const stucco = '#d9c49f', brick = '#8e4b3a', cream = '#efe8d8', roofGrey = '#6e7174', recess = '#5b5750';
// Glass base #6f7b85: HSV saturation 17%, value 52% (the glass rules' 50-60 band, S ≤ 22).
const glass = '#6f7b85';

export function createParkCentral(buildings: VBuilding[], site: VBuilding, grid: GroundGrid, quality: TerrainQuality = 'high') {
  const deckRing = site.parts?.find(p => p.id === deckPart)?.rings[0];
  if (!deckRing) return null;
  const shell = landmarkShell(buildings, grid, site.id, 'Park Central', origin, [1, 0], [[-30, 30], [-40, -10], [-40, -40]]);
  if (!shell) return null;
  const floor = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const footing = Math.min(floor, shell.base) - 0.65;
  const { body, lights } = shell;
  const seed = seedOf(site.id);
  const L = ([x, z]: P2): P2 => [x - origin[0], z - origin[1]];

  // Parking deck behind the slab, open bands on its outer faces.
  const deck = wound(deckRing.map(([x, z]) => L([x, z])), 1);
  shell.prism(deck, footing, floor + deckH, '#c9bfae', '#a7a49c');
  const dOut = outwardSign(deck);
  faces(deck, (a, b, length) => {
    if (length < 8) return;
    const p = along(a, b, length, 0.6, 0.05 * dOut), q = along(a, b, length, length - 0.6, 0.05 * dOut);
    for (const y of [4.2, 7.6, 11, 14.4])
      body.quad([p[0], floor + y, p[1]], [p[0], floor + y + 1.6, p[1]], [q[0], floor + y + 1.6, q[1]], [q[0], floor + y, q[1]], '#45433f');
  });

  bars.forEach((bar, bi) => {
    const ring = wound([L([bar.x0, bar.z0]), L([bar.x1, bar.z0]), L([bar.x1, bar.z1]), L([bar.x0, bar.z1])], 1);
    const out = outwardSign(ring);
    const eave = floor + bar.eave, ridge = floor + bar.ridge;
    shell.prism(ring, footing, floor + base, brick, brick);
    shell.prism(ring, floor + base, eave, stucco, stucco);
    // A cream band over the brick base and a cornice under the roof.
    faces(ring, (a, b, length) => {
      for (const [y0, y1] of [[base - 0.5, base + 0.3], [bar.eave - 0.7, bar.eave]] as const) {
        const p = along(a, b, length, -0.3, 0.3 * out), q = along(a, b, length, length + 0.3, 0.3 * out);
        body.quad([p[0], floor + y0, p[1]], [p[0], floor + y1, p[1]], [q[0], floor + y1, q[1]], [q[0], floor + y0, q[1]], cream);
      }
    });
    // Hipped roof: four slopes up to a short ridge (or a flat top on the wide bars).
    const w = Math.abs(bar.x1 - bar.x0), d = Math.abs(bar.z1 - bar.z0), inset = Math.min(w, d) / 2 - 1.2;
    const [a0, , c0] = ring;
    const inner = ring.map(([x, z]): P2 => {
      const cx = (a0[0] + c0[0]) / 2, cz = (a0[1] + c0[1]) / 2;
      return [x + Math.sign(cx - x) * inset, z + Math.sign(cz - z) * inset];
    });
    for (let i = 0; i < 4; i++) {
      const p = ring[i], q = ring[(i + 1) % 4], pi = inner[i], qi = inner[(i + 1) % 4];
      body.quad([p[0], eave, p[1]], [pi[0], ridge, pi[1]], [qi[0], ridge, qi[1]], [q[0], eave, q[1]], roofGrey);
    }
    body.quad([inner[0][0], ridge, inner[0][1]], [inner[3][0], ridge, inner[3][1]], [inner[2][0], ridge, inner[2][1]], [inner[1][0], ridge, inner[1][1]], roofGrey);

    // Windows: paired sash windows in white frames; balcony stacks in two recessed bays per long face.
    faces(ring, (a, b, length, face) => {
      // Faces that sit against another bar or the deck get no windows.
      const m = along(a, b, length, length / 2, 2 * out);
      const inside = bars.some((o, oi) => oi !== bi && within(m, L([o.x0, o.z0]), L([o.x1, o.z1])));
      if (inside || length < 6) return;
      const bays = Math.max(1, Math.round(length / 3.4));
      const stacks = length > 40 ? [Math.round(bays * 0.3), Math.round(bays * 0.7)] : length > 25 ? [Math.round(bays / 2)] : [];
      const rows = Math.floor((bar.eave - 1.2 - base - 0.8) / storey);
      if (quality === 'low') {
        // Phone tier: each window column is one glass strip, crossed by one stucco band per floor;
        // balcony stacks are one recess strip; only lit windows get their own quads.
        const y0 = floor + base + 0.8, y1 = y0 + rows * storey;
        for (let k = 0; k < bays; k++) {
          const u = (k + 0.5) * length / bays, half = stacks.includes(k) ? 1.6 : 0.7;
          const p = along(a, b, length, u - half, 0.05 * out), q = along(a, b, length, u + half, 0.05 * out);
          body.quad([p[0], y0, p[1]], [p[0], y1, p[1]], [q[0], y1, q[1]], [q[0], y0, q[1]], stacks.includes(k) ? recess : glass);
        }
        const p = along(a, b, length, 0, 0.1 * out), q = along(a, b, length, length, 0.1 * out);
        for (let j = 0; j <= rows; j++) {
          const yb = y0 + j * storey - 0.55, yt = yb + (j === rows ? 0.55 : 1.0);
          body.quad([p[0], yb, p[1]], [p[0], yt, p[1]], [q[0], yt, q[1]], [q[0], yb, q[1]], stucco);
        }
        for (let j = 0; j < rows; j++)
          for (let k = 0; k < bays; k++) {
            if (litHash(seed, face + 10 * bi, j, k) >= (stacks.includes(k) ? 0.32 : 0.3)) continue;
            const u = (k + 0.5) * length / bays, half = stacks.includes(k) ? 1.1 : 0.7, y = y0 + j * storey;
            const g0 = along(a, b, length, u - half, 0.13 * out), g1 = along(a, b, length, u + half, 0.13 * out);
            lights.quad([g0[0], y + 0.45, g0[1]], [g0[0], y + 2.15, g0[1]], [g1[0], y + 2.15, g1[1]], [g1[0], y + 0.45, g1[1]], glass);
          }
      } else for (let j = 0; j < rows; j++) {
        const y = floor + base + 0.8 + j * storey;
        for (let k = 0; k < bays; k++) {
          const u = (k + 0.5) * length / bays;
          if (stacks.includes(k)) {
            // A recessed balcony bay: dark recess, a cream slab edge and a rail line.
            const p = along(a, b, length, u - 1.6, 0.04 * out), q = along(a, b, length, u + 1.6, 0.04 * out);
            body.quad([p[0], y - 0.3, p[1]], [p[0], y + storey - 0.3, p[1]], [q[0], y + storey - 0.3, q[1]], [q[0], y - 0.3, q[1]], recess);
            const s0 = along(a, b, length, u - 1.6, 0.08 * out), s1 = along(a, b, length, u + 1.6, 0.08 * out);
            body.quad([s0[0], y - 0.3, s0[1]], [s0[0], y + 0.05, s0[1]], [s1[0], y + 0.05, s1[1]], [s1[0], y - 0.3, s1[1]], cream);
            const lit = litHash(seed, face + 10 * bi, j, k) < 0.32;
            const g0 = along(a, b, length, u - 1.1, 0.06 * out), g1 = along(a, b, length, u + 1.1, 0.06 * out);
            (lit ? lights : body).quad([g0[0], y + 0.4, g0[1]], [g0[0], y + 2.3, g0[1]], [g1[0], y + 2.3, g1[1]], [g1[0], y + 0.4, g1[1]], glass);
            continue;
          }
          const lit = litHash(seed, face + 10 * bi, j, k) < 0.3;
          // White frames only on the lowest storeys, where street views can resolve them; above,
          // one quad per window keeps the geometry budget (a frame is invisible at the orbit).
          if (j < 3) {
            const f0 = along(a, b, length, u - 0.85, 0.05 * out), f1 = along(a, b, length, u + 0.85, 0.05 * out);
            body.quad([f0[0], y + 0.35, f0[1]], [f0[0], y + 2.25, f0[1]], [f1[0], y + 2.25, f1[1]], [f1[0], y + 0.35, f1[1]], cream);
          }
          const w = j < 3 ? 0.62 : 0.7;
          const g0 = along(a, b, length, u - w, 0.08 * out), g1 = along(a, b, length, u + w, 0.08 * out);
          (lit ? lights : body).quad([g0[0], y + 0.45, g0[1]], [g0[0], y + 2.15, g0[1]], [g1[0], y + 2.15, g1[1]], [g1[0], y + 0.45, g1[1]], glass);
        }
      }
      // The brick base: tall white-framed shopfront windows, and the arched entry on Juniper.
      const shops = Math.max(1, Math.round(length / 4.5));
      for (let k = 0; k < shops; k++) {
        const u = (k + 0.5) * length / shops;
        const p = along(a, b, length, u - 1.2, 0.06 * out), q = along(a, b, length, u + 1.2, 0.06 * out);
        lights.quad([p[0], footing, p[1]], [p[0], floor + 5.4, p[1]], [q[0], floor + 5.4, q[1]], [q[0], footing, q[1]], glass);
      }
    });
  });
  return shell.finish('#f2d6a8', 0.6);
}

function within([x, z]: P2, a: P2, b: P2) {
  return x > Math.min(a[0], b[0]) && x < Math.max(a[0], b[0]) && z > Math.min(a[1], b[1]) && z < Math.max(a[1], b[1]);
}
