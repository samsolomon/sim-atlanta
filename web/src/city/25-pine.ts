import type { GroundGrid } from '../terrain/grid';
import type { TerrainQuality } from '../terrain/surface';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

export const pine25Id = 'osm:way:270470130';
const origin: P2 = [422, -1458];

// NAVD88 from the 22 April 2019 3DEP returns (docs/log/ui/25-pine/README.md).
const grade = 302.8;
const deck = grade + 32.4;
const parapet = grade + 33.6;
const tiers = 10;

// The mapped outline, squared, with the west stair tower left to its own prism.
const plan: P2[] = [
  [398.3, -1490.9], [449.0, -1490.3], [448.3, -1426.3], [403.3, -1426.8], [403.6, -1449.0],
  [397.8, -1449.0], [398.1, -1476.3], [398.3, -1485.8],
];
// Precast stair and lift towers: west on West Peachtree, north-east on Pine, and the step.
const towers: { ring: P2[]; top: number }[] = [
  { ring: [[395.0, -1486.5], [402.5, -1486.5], [402.5, -1476.3], [395.0, -1476.3]], top: grade + 38.5 },
  { ring: [[443.5, -1490.6], [449.0, -1490.6], [449.0, -1480.5], [443.5, -1480.5]], top: grade + 36.0 },
  { ring: [[397.6, -1455.5], [404.2, -1455.5], [404.2, -1448.6], [397.6, -1448.6]], top: grade + 35.9 },
];
// Pine Street service drives at x 410 and 427 meet the deck's two portals.
const portals = [[405.5, 414.5], [422.5, 431.5]];

const local = (ring: P2[]): P2[] => ring.map(([x, z]) => [x - origin[0], z - origin[1]]);

/** Edges with the outward side to the right of a → b in plan (x east, z south). */
function edges(ring: P2[], draw: (a: P2, b: P2, length: number) => void) {
  let area = 0;
  ring.forEach(([x, z], i) => { const [u, v] = ring[(i + 1) % ring.length]; area += x * v - u * z; });
  const r = area > 0 ? ring : [...ring].reverse();
  r.forEach((a, i) => {
    const b = r[(i + 1) % r.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length > 4) draw(a, b, length);
  });
}

export function create25Pine(buildings: VBuilding[], grid: GroundGrid, quality: TerrainQuality) {
  const found = landmarkShell(buildings, grid, pine25Id, '25 Pine Street NE Parking Garage', origin, [1, 0],
    [[0, 0], [-20, -28], [24, 28]]);
  if (!found) return null;
  const shell = found;
  const high = quality === 'high';
  const concrete = '#d6d2c8', precast = '#cec8bb', interior = '#505354';
  const pitch = (deck - grade) / tiers;
  const ground = Math.max(shell.base + 0.35, grade);

  shell.prism(local(plan), shell.base, parapet, concrete, '#8e8c86');
  for (const t of towers) shell.prism(local(t.ring), shell.base, t.top, precast, '#a9a397');

  edges(local(plan), (a, b, length) => {
    const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length;
    const nx = uz, nz = -ux;
    const at = (u: number, y: number, out: number) => [a[0] + ux * u + nx * out, y, a[1] + uz * u + nz * out];
    const quad = (u0: number, u1: number, y0: number, y1: number, out: number, color: string, lit = false) =>
      (lit ? shell.lights : shell.body).quad(at(u0, y0, out), at(u0, y1, out), at(u1, y1, out), at(u1, y0, out), color);
    const pine = a[1] < -25 && Math.abs(uz) < 0.1;
    // Each open tier: a dark, lit band between the spandrels.
    for (let k = 0; k < tiers; k++) {
      const y0 = grade + k * pitch + (k === 0 ? 0.3 : 1.05), y1 = grade + (k + 1) * pitch - 0.05;
      if (k === 0 && pine) {
        for (const [x0, x1] of portals) {
          const u0 = (x0 - origin[0]) - a[0], u1 = (x1 - origin[0]) - a[0];
          quad(u0, u1, Math.max(y0, ground), grade + 4.2, 0.06, '#2c2d2c', true);
        }
        continue;
      }
      quad(0.4, length - 0.4, y0, y1, 0.05, interior, true);
      // Pine Street's spandrels cantilever past the frame.
      if (pine && high) {
        const lo = grade + (k + 1) * pitch - 0.05, hi = lo + 1.1, d = 1.4;
        quad(0, length, lo, hi, d, concrete);
        shell.body.quad(at(0, hi, 0), at(0, hi, d), at(length, hi, d), at(length, hi, 0), '#d6d1c6');
        shell.body.quad(at(0, lo, 0), at(length, lo, 0), at(length, lo, d), at(0, lo, d), '#a7a296');
        shell.body.quad(at(0, lo, 0), at(0, lo, d), at(0, hi, d), at(0, hi, 0), concrete);
        shell.body.quad(at(length, lo, 0), at(length, hi, 0), at(length, hi, d), at(length, lo, d), concrete);
      }
    }
    // Columns on the open faces, about 8 m apart. Pine Street's frame hides behind its bands.
    if (!pine || !high) {
      const bays = Math.max(1, Math.round(length / 8.2));
      for (let i = 0; i <= bays; i++) {
        const u = Math.min(length - 0.35, Math.max(0.35, i * length / bays));
        quad(u - 0.35, u + 0.35, ground, deck, 0.1, concrete);
      }
    }
  });

  if (high) {
    // Panel joints on the tall west tower and rooftop light poles.
    const west = local(towers[0].ring);
    edges(west, (a, b, length) => {
      const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length;
      for (let y = grade + 3; y < towers[0].top - 1; y += 3)
        shell.body.quad([a[0] + uz * 0.04, y, a[1] - ux * 0.04], [a[0] + uz * 0.04, y + 0.12, a[1] - ux * 0.04],
          [b[0] + uz * 0.04, y + 0.12, b[1] - ux * 0.04], [b[0] + uz * 0.04, y, b[1] - ux * 0.04], '#a9a294');
    });
    for (const [x, z] of [[412, -1474], [436, -1474], [412, -1440], [436, -1440]] as const)
      shell.prism(local([[x - 0.1, z - 0.1], [x + 0.1, z - 0.1], [x + 0.1, z + 0.1], [x - 0.1, z + 0.1]]),
        deck, deck + 9, '#b4b6b4', '#b4b6b4');
  }

  return shell.finish('#e8e3d2', 0.24);
}
