import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { along, faces, litHash, outwardSign, seedOf, wound } from './skin-kit';

export const marriottSuitesId = 'osm:way:269843461';
const origin: P2 = [477, -3600];

// The all-suite hotel at 35 14th Street: a 19-storey pale rose-beige precast tower with punched
// windows and stacked balcony recesses, a projecting bay of balconies over the 14th Street entry,
// and low wings behind. Heights from the April 2019 lidar above median grade: tower roof 56.4 m
// (p50), plant to 59 m; north wing about 13 m, west wing about 6 m.
const towerPart = 'osm:way:885777448';
const wings: [string, number][] = [['osm:way:885777451', 13.1], ['osm:way:885777455', 6.1], ['osm:way:885777450', 7.3]];
const roofH = 56.4, plantH = 59, base = 7.5, storey = 2.85;

const precast = '#dccbc2', precastShade = '#c8b7ae', recess = '#8a7872', canopy = '#5a4a44';
// Glass base #868e96: HSV saturation 11%, value 59% (the glass rules' 50-60 band, S ≤ 22).
const glass = '#868e96';

export function createMarriottSuites(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const part = (id: string) => site.parts?.find(p => p.id === id)?.rings[0];
  const towerRing = part(towerPart);
  if (!towerRing || wings.some(([id]) => !part(id))) return null;
  const shell = landmarkShell(buildings, grid, site.id, 'Atlanta Marriott Suites Midtown', origin, [1, 0], [[0, 0], [-15, 10], [15, 10]]);
  if (!shell) return null;
  const floor = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const footing = Math.min(floor, shell.base) - 0.65;
  const { body, lights } = shell;
  const seed = seedOf(site.id);
  const L = (r: [number, number][]) => wound(clean(r.map(([x, z]): P2 => [x - origin[0], z - origin[1]])), 1);

  for (const [id, h] of wings) shell.prism(L(part(id)!), footing, floor + h, precast, '#a9a39c');

  const t = L(towerRing);
  const out = outwardSign(t);
  shell.prism(t, footing, floor + roofH, precast, precastShade);
  const xs = t.map(p => p[0]), zs = t.map(p => p[1]);
  const plant: P2[] = [[Math.min(...xs) + 8, Math.min(...zs) + 6], [Math.max(...xs) - 8, Math.min(...zs) + 6], [Math.max(...xs) - 8, Math.max(...zs) - 6], [Math.min(...xs) + 8, Math.max(...zs) - 6]];
  shell.prism(wound(plant, 1), floor + roofH, floor + plantH, precast, '#a9a39c');

  const rows = Math.floor((roofH - base - 1.5) / storey);
  faces(t, (a, b, length, face) => {
    if (length < 4) return;
    // Punched windows in runs of about two bays; balcony recesses as one dark strip per stack.
    const bays = Math.max(1, Math.round(length / 3.3));
    const stack = length > 12 ? [Math.floor(bays / 2)] : [];
    for (const k of stack) {
      const u = (k + 0.5) * length / bays;
      const p = along(a, b, length, u - 1.2, 0.04 * out), q = along(a, b, length, u + 1.2, 0.04 * out);
      body.quad([p[0], floor + base, p[1]], [p[0], floor + roofH - 1.6, p[1]], [q[0], floor + roofH - 1.6, q[1]], [q[0], floor + base, q[1]], recess);
    }
    for (let j = 0; j < rows; j++) {
      const y = floor + base + j * storey;
      for (let k = 0; k < bays; k++) {
        if (stack.includes(k)) continue;
        const u = (k + 0.5) * length / bays;
        const p = along(a, b, length, u - 0.75, 0.05 * out), q = along(a, b, length, u + 0.75, 0.05 * out);
        // Hotel at 23:30: noticeably lit.
        const lit = litHash(seed, face, j, k) < 0.4;
        (lit ? lights : body).quad([p[0], y + 0.5, p[1]], [p[0], y + 2.15, p[1]], [q[0], y + 2.15, q[1]], [q[0], y + 0.5, q[1]], glass);
      }
    }
    // Street storey glazing on the 14th Street and side faces.
    const p = along(a, b, length, 0.6, 0.05 * out), q = along(a, b, length, length - 0.6, 0.05 * out);
    lights.quad([p[0], footing, p[1]], [p[0], floor + 4.4, p[1]], [q[0], floor + 4.4, q[1]], [q[0], footing, q[1]], glass);
  });
  // The entrance canopy on 14th Street (the south face): a plain dark canopy, no branding.
  const south = t.reduce((m, p) => (p[1] > m ? p[1] : m), -Infinity);
  const can: P2[] = [[-6, south - 0.2], [6, south - 0.2], [6, south + 4.5], [-6, south + 4.5]];
  shell.prism(wound(can, 1), floor + 4.6, floor + 5.6, canopy, canopy);
  return shell.finish('#f4d6a8', 0.62);
}

/** Drops vertices that close an edge shorter than 1 m. */
function clean(ring: P2[]): P2[] {
  const out: P2[] = [];
  for (const p of ring) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= 1) out.push(p);
  }
  while (out.length > 3 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) < 1) out.pop();
  return out;
}
