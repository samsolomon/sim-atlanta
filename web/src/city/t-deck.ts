import { ShapeUtils, Vector2 } from 'three';
import type { GroundGrid } from '../terrain/grid';
import { pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

/**
 * Georgia State University's T Deck at 29 Peachtree Center Avenue: open
 * concrete parking levels with pale spandrel bands over dark openings, a curved
 * north-east corner, a tan stone base with glazed storefronts, an open light
 * well and stair cores. Lidar (April 2019): top deck 25.1 m above grade
 * (mapped 18.3 m), cores to about 28 m. No wordmarks.
 */
export const tDeckId = 'e055f75a-34aa-4c0c-b5c2-8bddedfb58da';

const spandrel = '#d4cfc4',
  opening = '#3c4044',
  pier = '#c9c3b6',
  stone = '#b9a68a',
  storefront = '#6d8299',
  deck = '#9d9a93',
  core = '#c4beb2';

export function createTDeck(buildings: VBuilding[], grid: GroundGrid) {
  const origin: P2 = [452, -127];
  const s = landmarkShell(buildings, grid, tDeckId, 'T Deck', origin, [1, 0], [[-25, -30], [0, 30], [30, -20]]);
  if (!s) return null;
  const g0 = s.base + 0.35;
  const shopTop = g0 + 5.2, levels = 6, level = (25.1 - 5.2) / levels, top = g0 + 25.1, parapet = top + 1.1;
  const area = s.ring.reduce((t, [x, z], i) => { const [x2, z2] = s.ring[(i + 1) % s.ring.length]; return t + x * z2 - x2 * z; }, 0);
  const plan = area > 0 ? s.ring : [...s.ring].reverse();

  // Open light well (lidar: grade inside x 458–470, z −156…−114).
  const well: P2[] = [[458 - origin[0], -156 - origin[1]], [470 - origin[0], -156 - origin[1]],
    [470 - origin[0], -114 - origin[1]], [458 - origin[0], -114 - origin[1]]];
  const wellCCW = ShapeUtils.isClockWise(well.map(([x, z]) => new Vector2(x, z))) ? well : [...well].reverse();

  // Solid mass with the well cut out: walls on the outer ring, a roof deck with a hole.
  const wallRing = (ring: P2[], lo: number, hi: number, color: string) => ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length];
    s.body.quad([a[0], lo, a[1]], [a[0], hi, a[1]], [b[0], hi, b[1]], [b[0], lo, b[1]], color);
  });
  wallRing(plan, s.base, parapet, opening);
  wallRing(wellCCW, g0, top, pier);
  const tris = ShapeUtils.triangulateShape(plan.map(([x, z]) => new Vector2(x, z)), [wellCCW.map(([x, z]) => new Vector2(x, z))]);
  const all = [...plan, ...wellCCW];
  for (const [i, j, k] of tris) {
    const v = (n: number) => [all[n][0], top, all[n][1]];
    s.body.tri(v(i), v(k), v(j), deck);
  }

  // Facades on each ring segment (the curved corner is many short segments).
  plan.forEach((a, i) => {
    const b = plan[(i + 1) % plan.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    if (len < 0.3) return;
    let nx = dz / len, nz = -dx / len;
    if (pointInRing((a[0] + b[0]) / 2 + nx * 0.3, (a[1] + b[1]) / 2 + nz * 0.3, plan)) { nx = -nx; nz = -nz; }
    const at = (t: number, y: number, o: number) => [a[0] + t * dx + nx * o, y, a[1] + t * dz + nz * o];
    const quad = (l: number, r: number, y0: number, y1: number, o: number, c: string, lit = false) =>
      (lit ? s.lights : s.body).quad(at(l, y0, o), at(l, y1, o), at(r, y1, o), at(r, y0, o), c);
    // Stone base with storefront glazing (lit).
    quad(0, 1, s.base, shopTop, 0.04, stone);
    if (len > 4) quad(0.06, 0.94, g0 + 0.4, shopTop - 1.1, 0.08, storefront, true);
    // Pale spandrel band at every deck edge; dark openings between.
    for (let k = 0; k <= levels; k++) {
      const y = shopTop + k * level;
      quad(0, 1, y - 1.05, y, 0.09, spandrel);
    }
    // Pilasters about every 9 m.
    if (len > 6) {
      const n = Math.max(1, Math.round(len / 9));
      for (let k = 0; k <= n; k++) quad(Math.max(0, k / n - 0.4 / len), Math.min(1, k / n + 0.4 / len), shopTop, parapet, 0.13, pier);
    }
    quad(0, 1, top, parapet, 0.09, spandrel);
  });

  // Stair/elevator cores at the corners (lidar returns ~28 m).
  for (const [x, z] of [[-40, -48], [40, -45], [-15, 33]] as P2[]) {
    if (!pointInRing(x, z, plan)) continue;
    s.body.box(5, 28.3 - 25.1, 5, x, top + (28.3 - 25.1) / 2, z, core);
  }
  return s.finish('#f5ead0', 0.4);
}
