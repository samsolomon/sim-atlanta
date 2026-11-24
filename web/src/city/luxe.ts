import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { along, faces, litHash, outwardSign, seedOf, wound } from './skin-kit';

export const luxeId = 'osm:way:269843447';
const origin: P2 = [1072, -3415];

// Luxe (222 12th Street, 2008): a 22-storey white residential tower with a blue glass corner drum
// at its north-east, a recessed balcony slot down the middle of the 12th Street face, over a
// white-and-grey garage podium with a pool deck. Heights from the April 2019 lidar above median
// grade: tower roof about 67 m (p50), plant to 71 m (p95); podium deck about 13-15 m.
const tower = { x0: 1049.2, x1: 1094.5, z0: -3430.2, z1: -3401.3 };
const roofH = 67, plantH = 71, podiumH = 13.5, storey = 2.95, base = 15.5;
const drum = { cx: 1088.5, cz: -3405.5, r: 7.2 }; // the rounded south-east corner on 12th Street

const white = '#e9e8e3', grey = '#b7b8b6', slot = '#4d5459';
// Glass base #7b8fa5: HSV saturation 25%, value 65% (the glass rules' V ≥ 62 band, S ≤ 30).
const glass = '#7b8fa5';
// The drum's blue glass, photo-backed: base #7a93ad (S 29%, V 68%).
const drumGlass = '#7a93ad';

export function createLuxe(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const ring = site.rings[0];
  if (!ring || ring.length < 4) return null;
  const shell = landmarkShell(buildings, grid, site.id, 'Luxe', origin, [1, 0], [[0, 0], [-30, 15], [35, -10]]);
  if (!shell) return null;
  const floor = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const footing = Math.min(floor, shell.base) - 0.65;
  const { body, lights } = shell;
  const seed = seedOf(site.id);
  const L = ([x, z]: P2): P2 => [x - origin[0], z - origin[1]];

  // Podium: the whole lot to the deck, grey with dark garage bands; the pool on the east deck.
  const podium = wound(ring.map(([x, z]) => L([x, z])), 1);
  shell.prism(podium, footing, floor + podiumH, grey, '#c9cbc8');
  const pOut = outwardSign(podium);
  faces(podium, (a, b, length) => {
    if (length < 8) return;
    const p = along(a, b, length, 0.5, 0.05 * pOut), q = along(a, b, length, length - 0.5, 0.05 * pOut);
    for (const y of [4.5, 8.3])
      body.quad([p[0], floor + y, p[1]], [p[0], floor + y + 1.8, p[1]], [q[0], floor + y + 1.8, q[1]], [q[0], floor + y, q[1]], '#4a4e51');
    lights.quad([p[0], footing, p[1]], [p[0], floor + 3.4, p[1]], [q[0], floor + 3.4, q[1]], [q[0], footing, q[1]], glass);
  });
  const pool: P2[] = [L([1100, -3425]), L([1112, -3425]), L([1112, -3410]), L([1100, -3410])];
  shell.prism(wound(pool, 1), floor + podiumH, floor + podiumH + 0.05, '#5aa7c4', '#5aa7c4');

  // Tower: white with grey piers, punched windows as horizontal strips on the end faces, and the
  // balcony slot as one dark recess on the long faces.
  const t = wound([L([tower.x0, tower.z0]), L([tower.x1, tower.z0]), L([tower.x1, tower.z1]), L([tower.x0, tower.z1])], 1);
  const out = outwardSign(t);
  shell.prism(t, floor + podiumH, floor + roofH, white, '#c6c7c4');
  const rows = Math.floor((roofH - base - 1) / storey);
  faces(t, (a, b, length, face) => {
    const long = length > 40;
    // Window bands: one glass strip per floor across the face, minus the slot; lit runs by litHash.
    const slotU = long ? [length / 2 - 3, length / 2 + 3] : null;
    const runs = Math.max(2, Math.round(length / 4.2));
    for (let j = 0; j < rows; j++) {
      const y = floor + base + j * storey;
      for (let k = 0; k < runs; k++) {
        let u0 = k * length / runs + 0.8, u1 = (k + 1) * length / runs - 0.8;
        if (slotU && u1 > slotU[0] && u0 < slotU[1]) {
          if (u0 < slotU[0]) u1 = slotU[0] - 0.4; else if (u1 > slotU[1]) u0 = slotU[1] + 0.4; else continue;
        }
        const p = along(a, b, length, u0, 0.05 * out), q = along(a, b, length, u1, 0.05 * out);
        const lit = litHash(seed, face, j, k) < 0.3;
        (lit ? lights : body).quad([p[0], y + 0.8, p[1]], [p[0], y + 2.2, p[1]], [q[0], y + 2.2, q[1]], [q[0], y + 0.8, q[1]], glass);
      }
    }
    if (slotU) {
      const p = along(a, b, length, slotU[0], 0.04 * out), q = along(a, b, length, slotU[1], 0.04 * out);
      body.quad([p[0], floor + base - 1, p[1]], [p[0], floor + roofH - 1.5, p[1]], [q[0], floor + roofH - 1.5, q[1]], [q[0], floor + base - 1, q[1]], slot);
    }
  });
  // Rooftop plant, set back.
  const plant: P2[] = [L([1058, -3424]), L([1084, -3424]), L([1084, -3407]), L([1058, -3407])];
  shell.prism(wound(plant, 1), floor + roofH, floor + plantH, white, '#a9aba8');

  // The blue glass drum at the south-east corner, full height, as 10 facets.
  const c = L([drum.cx, drum.cz]), n = 10;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    const p: P2 = [c[0] + Math.cos(a0) * drum.r, c[1] + Math.sin(a0) * drum.r];
    const q: P2 = [c[0] + Math.cos(a1) * drum.r, c[1] + Math.sin(a1) * drum.r];
    body.quad([q[0], floor + podiumH, q[1]], [q[0], floor + roofH + 1, q[1]], [p[0], floor + roofH + 1, p[1]], [p[0], floor + podiumH, p[1]], drumGlass);
    body.tri([c[0], floor + roofH + 1, c[1]], [p[0], floor + roofH + 1, p[1]], [q[0], floor + roofH + 1, q[1]], '#c6c7c4');
  }
  return shell.finish('#f2d6a8', 0.6);
}
