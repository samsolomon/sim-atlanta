import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { along, faces, outwardSign, wound } from './skin-kit';

// The former Atlanta Journal-Constitution printing plant and its roof parking deck, between
// Marietta Street and Ted Turner Drive, behind the 1972 AJC office tower (72 Marietta, now Two City
// Plaza, which is a separate building). Overture maps it as two outlines, both named for the AJC:
// the north-west block (`08b3e01b`) carries a parking deck on its roof, and the larger south-east
// block (`df3490e1`, no mapped height) the plant roof. One skin replaces both.
// - Walls: windowless, of large pale grey precast panels split by dark vertical drain channels,
//   over a buff glazed-tile base about 4 m high (2023 street photograph of the plant wall).
// - Roofs: 2019 lidar over the Gulch-side grade (314 m NAVD88; the Marietta side is 321 m). The deck
//   is at 36.5 m inside an edge wall to about 39 m, with two stair towers to about 43 m; the plant
//   roof is at 37.2 m with mechanical units to 41-44 m and a raised block to 45 m in its
//   north-east corner, where it runs on into the neighbour. Stall stripes and cars on the deck show in the 2026 aerial; neither is
//   drawn (stripes under 0.2 m wide only alias at City range). Unit sizes and positions are read from the lidar grid (estimated).
// - Night: the plant has no windows and no photographed lighting, so nothing is lit.
// See docs/log/ui/ajc-plant/README.md.

export const ajcDeckId = '08b3e01b-1bfd-48e8-b679-129876eac5c6';
export const ajcPlantId = 'df3490e1-d4b8-4c6f-95eb-76b9bb915b7f';
const DECK = 314 + 36.5, DECK_WALL = 314 + 39, PLANT = 314.5 + 37.2, PLANT_HIGH = 314.5 + 45;
const PANEL = '#c4c1b7', TILE = '#cdb98f', CHANNEL = '#3b3d3f', CONCRETE = '#8f8d87', MEMBRANE = '#9a917f';
const PLANT_BOX = '#b9b6ad';
const origin: P2 = [-118, -292];
const axis: P2 = [0.753, -0.659];

export function createAjcPlant(buildings: VBuilding[], grid: GroundGrid) {
  const plantSite = buildings.find(b => b.id === ajcPlantId);
  const s = landmarkShell(buildings, grid, ajcDeckId, 'Former AJC printing plant', origin, axis, [[0, 0], [-15, 0], [15, 0]]);
  if (!s) return null;
  const { body } = s;
  const angle = Math.atan2(axis[1], axis[0]), c = Math.cos(angle), sn = Math.sin(angle);
  const local = ([x, z]: P2): P2 => [(x - origin[0]) * c + (z - origin[1]) * sn, -(x - origin[0]) * sn + (z - origin[1]) * c];
  const world = ([u, v]: P2): P2 => [origin[0] + u * c - v * sn, origin[1] + u * sn + v * c];
  const gradeAt = (p: P2) => grid.sample(...world(p)) ?? s.base;
  const inside = (ring: P2[], [x, z]: P2) => {
    let hit = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, zi] = ring[i], [xj, zj] = ring[j];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
    }
    return hit;
  };

  const deck = wound(s.ring, 1);
  const plant = plantSite ? wound(plantSite.rings[0].map(local), 1) : null;

  function block(ring: P2[], roof: number, roofColor: string, edgeWall: number) {
    s.prism(ring, s.base, roof, PANEL, roofColor);
    const out = outwardSign(ring);
    faces(ring, (a, b, len) => {
      const p = (t: number, y: number, off: number) => { const [x, z] = along(a, b, len, t, out * off); return [x, y, z]; };
      // The wall the two blocks share gets no facade and no roof edge wall.
      const other = ring === deck ? plant : deck;
      if (other && inside(other, along(a, b, len, len / 2, out * 0.5))) return;
      // Buff tile base, 4 m above the lower end of this wall's grade.
      const tileTop = Math.min(gradeAt(a), gradeAt(b)) + 4;
      body.quad(p(0, s.base, .05), p(0, tileTop, .05), p(len, tileTop, .05), p(len, s.base, .05), TILE);
      // Dark drain channels about every 6.5 m.
      const n = Math.max(1, Math.round(len / 6.5));
      for (let i = 1; i < n; i++) {
        const t = (i * len) / n;
        body.quad(p(t - .2, s.base, .08), p(t - .2, roof - .3, .08), p(t + .2, roof - .3, .08), p(t + .2, s.base, .08), CHANNEL);
      }
      // The roof edge wall, 0.4 m thick, inside the outline.
      if (edgeWall > roof) {
        const q = (t: number, off: number): P2 => along(a, b, len, t, -out * off);
        s.prism(wound([q(0, 0), q(len, 0), q(len, .4), q(0, .4)], 1), roof, edgeWall, PANEL, PANEL);
      }
    });
  }

  block(deck, DECK, CONCRETE, DECK_WALL);
  if (plant) block(plant, PLANT, MEMBRANE, PLANT + 1);

  // Stair towers on the deck, and the plant's rooftop units and raised north-east block (lidar).
  const box = (cx: number, cz: number, w: number, d: number, lo: number, hi: number, color: string) => {
    const [u, v] = local([cx, cz]);
    s.prism(wound([[u - w / 2, v - d / 2], [u + w / 2, v - d / 2], [u + w / 2, v + d / 2], [u - w / 2, v + d / 2]], 1), lo, hi, color, color);
  };
  box(-114, -298, 6, 6, DECK, 314 + 43, PANEL);
  box(-111, -314, 5, 7, DECK, 314 + 42, PANEL);
  if (plant) {
    for (const [x, z, w, d, h] of [[-110, -256, 7, 5, 4], [-98, -251, 5, 4, 3.5], [-71, -251, 7, 6, 5.5], [-84, -240, 6, 8, 5], [-92, -228, 5, 6, 5]])
      box(x, z, w, d, PLANT, PLANT + h, PLANT_BOX);
    // The raised block: along the east end of the north-east wall, 8 m deep (the lidar's 45 m
    // area continues past the outline into the neighbour there).
    const ring = plantSite!.rings[0];
    const [ea, eb] = [ring[5], ring[6]].map(local) as [P2, P2];
    const elen = Math.hypot(eb[0] - ea[0], eb[1] - ea[1]);
    const inward = inside(plant, along(ea, eb, elen, elen / 2, 1)) ? 1 : -1;
    const r = (t: number, off: number): P2 => along(ea, eb, elen, t, inward * off);
    s.prism(wound([r(28, 0), r(elen - .5, 0), r(elen - .5, 8), r(28, 8)], 1), PLANT, PLANT_HIGH, PANEL, MEMBRANE);
  }

  const result = s.finish('#f4d9a8', .5);
  return { ...result, buildings: result.buildings.filter(b => b.id !== ajcPlantId) };
}
