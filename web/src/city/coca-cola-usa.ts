import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

/**
 * The Coca-Cola USA Building (Heery International, 1987) on the North Avenue
 * campus: a 20-storey tower of dark slate glass in a red-brown granite grid,
 * with a deep frieze band under the roof and a long penthouse. Heights are
 * NAVD88 from the April 2019 lidar: roof deck 382.1, parapet 383.2, penthouse
 * 388.8 m, on a plaza near 316 m (the site falls to 297 m on the west).
 * The frieze is plain: no logos.
 */
export const cokeUsaId = 'osm:way:536718218';

const glass = '#a2aeb6',
  granite = '#a07a66',
  graniteShade = '#8d6a57',
  storefront = '#6b7880',
  roofDeck = '#a3a09a',
  plant = '#b8b4ab';

export function createCocaColaUsa(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const s = landmarkShell(buildings, grid, site.id, 'Coca-Cola USA Building', [-582.5, -1816.9], [1, 0],
    [[0, 0], [0, -40], [0, 40]]);
  if (!s) return null;
  const seed = seedOf(cokeUsaId);
  const plaza = 316, firstFloor = plaza + 6.5, roof = 382.1, parapet = 383.2, frieze = roof - 4.2,
    penthouse = 388.8;
  const floors = Math.round((frieze - firstFloor) / 3.9), pitch = (frieze - firstFloor) / floors;

  const area = s.ring.reduce((t, [x, z], i) => {
    const [x2, z2] = s.ring[(i + 1) % s.ring.length];
    return t + x * z2 - x2 * z;
  }, 0);
  const plan = area > 0 ? s.ring : [...s.ring].reverse();

  // Granite base from the low west grade up to the plaza, then the glass shaft.
  s.prism(plan, s.base, firstFloor, granite, roofDeck);
  s.prism(plan, firstFloor, frieze, glass, roofDeck);
  s.prism(plan, frieze, parapet, granite, roofDeck);
  // Long penthouse over the core (lidar: x −584…−570, z −1849…−1794).
  const pen: P2[] = [[-1.5, -32], [12.5, -32], [12.5, 23], [-1.5, 23]];
  s.prism(pen, roof, penthouse, plant, roofDeck);

  plan.forEach((a, face) => {
    const b = plan[(face + 1) % plan.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    if (len < 0.2) return;
    const at = (t: number, y: number, out: number) => [a[0] + t * dx + out * dz / len, y, a[1] + t * dz - out * dx / len];
    const quad = (l: number, r: number, y0: number, y1: number, out: number, c: string, lit = false) =>
      (lit ? s.lights : s.body).quad(at(l, y0, out), at(l, y1, out), at(r, y1, out), at(r, y0, out), c);
    // Granite grid: a pier every ~3 m and a spandrel at each floor.
    const bays = Math.max(1, Math.round(len / 3));
    for (let k = 0; k <= bays; k++) {
      const w = (k === 0 || k === bays ? 0.6 : 0.3) / len;
      quad(Math.max(0, k / bays - w), Math.min(1, k / bays + w), firstFloor, frieze, 0.1, granite);
    }
    for (let f = 0; f <= floors; f++) {
      const y = firstFloor + f * pitch;
      quad(0, 1, y - 0.35, y + 0.35, 0.08, graniteShade);
    }
    // Offices at 23:30: a sparse, well-mixed set of panes.
    if (len > 3) litFacade(s, seed, face, a, b, firstFloor, frieze, floors, len / bays, 0.86, 0.78, [glass], 0.06);
    // Below the plaza the granite plinth faces the low west grade: storey bands
    // and recessed openings, so it reads as occupied podium, not a blank wall.
    for (let y = plaza - 3.9; y > s.base + 2; y -= 3.9) {
      quad(0, 1, y - 0.3, y + 0.3, 0.06, graniteShade);
      quad(0.04, 0.96, y + 0.9, y + 2.9, 0.03, storefront);
    }
    // Lit lobby glazing at plaza level.
    quad(0.03, 0.97, plaza + 0.4, firstFloor - 0.8, 0.05, storefront, true);
  });
  return s.finish('#f5d8a8', 0.5);
}
