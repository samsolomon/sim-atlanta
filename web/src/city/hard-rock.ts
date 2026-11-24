import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, litHash, seedOf } from './skin-kit';

/**
 * The six-storey pale stone commercial block at Peachtree Street and Andrew Young
 * International Boulevard that houses the Hard Rock Cafe. Paired windows sit in
 * bays between flat piers over a storefront of maroon awnings, under a cornice
 * and short parapet. The neon guitar and rooftop signs are logos and are left off.
 * The Overture height (69 m) is wrong; the 2019 lidar puts the roof at 22–26 m.
 */
export const hardRockId = '2734ea6e-3114-4acb-a02f-06ff16fe76d5';

const stone = '#d6cdbd',
  stoneShade = '#c4baa8',
  glass = '#8a9499',
  storefront = '#4f5a5f',
  awning = '#6e2c30',
  roofDeck = '#b3aea4';

export function createHardRock(buildings: VBuilding[], grid: GroundGrid) {
  const origin: P2 = [410.25, -670.55];
  const s = landmarkShell(buildings, grid, hardRockId, 'Hard Rock Cafe building', origin, [1, 0],
    [[0, 0], [-20, -10], [20, 10]]);
  if (!s) return null;
  const seed = seedOf(hardRockId);
  const g0 = s.base + 0.35;
  // Lidar (April 2019) roof p50 22.3, p95 26.3 m; the maximum is the rooftop sign.
  const shop = g0 + 5.2, floors = 5, pitch = 3.5,
    top = shop + floors * pitch, // 22.7 m
    cornice = top + 0.8, parapet = g0 + 24.2;
  const hx = 27.6, hz = 15.95;
  const box = (x: number, z: number): P2[] => [[-x, -z], [x, -z], [x, z], [-x, z]];

  s.prism(box(hx - 0.25, hz - 0.25), s.base, shop, storefront, roofDeck);
  s.prism(box(hx, hz), shop, top, stone, roofDeck);
  s.prism(box(hx + 0.35, hz + 0.35), top, cornice, stoneShade, stoneShade);
  s.prism(box(hx, hz), cornice, parapet, stone, roofDeck);
  s.body.box(8, 2.6, 6, 6, parapet + 1.3, 2, '#8d8a84');

  const plan = box(hx, hz);
  plan.forEach((a, face) => {
    const b = plan[(face + 1) % 4];
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    const at = (t: number, y: number, out: number) => [a[0] + t * dx + out * dz / len, y, a[1] + t * dz - out * dx / len];
    const quad = (l: number, r: number, y0: number, y1: number, out: number, c: string, lit = false) =>
      (lit ? s.lights : s.body).quad(at(l, y0, out), at(l, y1, out), at(r, y1, out), at(r, y0, out), c);
    // Upper floors: paired windows (2.65 m module) between piers every 5.3 m.
    // Offices above a restaurant: a few rooms lit late.
    litFacade(s, seed, face, a, b, shop + 0.5, top - 0.3, floors, 2.65, 0.5, 0.58, [glass, '#8f979b'], 0.08);
    const bays = Math.round(len / 5.3);
    for (let k = 0; k <= bays; k++) {
      const w = (k === 0 || k === bays ? 0.7 : 0.35) / len;
      quad(Math.max(0, k / bays - w), Math.min(1, k / bays + w), shop, top, 0.12, stone);
    }
    // Storefront: glazing lit by the restaurant, awnings above it on the two streets.
    // Faces: 0 north (+z is south in City), 1 east, 2 south on International, 3 west on Peachtree.
    const street = face === 2 || face === 3;
    quad(0.02, 0.98, g0 + 0.3, shop - 1.4, 0.03, storefront, street);
    quad(0, 1, shop - 0.6, shop, 0.1, stoneShade);
    if (street) {
      const n = Math.round(len / 5.3);
      for (let k = 0; k < n; k++) {
        if (litHash(seed, face + 8, 0, k) < 0.15) continue; // a few bays without awnings
        const l = (k + 0.12) / n, r = (k + 0.88) / n;
        s.body.quad(at(l, shop - 1.3, 1.4), at(l, shop - 0.5, 0.15), at(r, shop - 0.5, 0.15), at(r, shop - 1.3, 1.4), awning);
      }
    }
  });
  return s.finish('#f4d6a6', 0.55);
}
