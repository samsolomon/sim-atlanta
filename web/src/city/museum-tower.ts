import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { along, faces, litHash, outwardSign, seedOf, wound } from './skin-kit';

// Museum Tower at Centennial Hill, 285 Centennial Olympic Park Drive (Smallwood,
// Reynolds, Stewart, Stewart, 2002), a 25-storey condominium tower over the
// Children's Museum.
// - Base: buff brick, three storeys, under a cream cornice.
// - Shaft: red-brown brick with punched white-framed windows and a thin cream
//   band every four or five floors, under a cream top band.
// - Corners: chamfered, each a full-height bay of pale blue-green glass.
// - Balconies: two stacks of concrete balconies with white rails on each face.
// - Roof: a cream penthouse box over a third of the planted deck.
// - Night: the crown band's piers have carried amber uplights since October 2012.
// Heights are NAVD88: the 2019 lidar puts the ring ground at 298.1 m, the roof
// deck at its 84 m median and the penthouse at its 93.9 m 95th percentile (the
// mapped 94 m agrees). Band spacing, chamfer size and penthouse placement are
// estimated from photographs (see docs/museum-tower.md).

export const museumTowerId = '2ff341bc-095f-44d6-8360-b3b8a785295a';
const G = 298.1, BASE = G + 11, BAND = G + 74, ROOF = G + 85.5, PENTHOUSE = G + 93.9;
const BUFF = '#d3c19c', BRICK = '#8b4c3b', CREAM = '#e3dac4', WINDOW = '#7d9198', CORNER = '#9db6b4';
const SLAB = '#c9c6bd', RAIL = '#eceae4', UPLIGHT = '#f0d6a2';

export function createMuseumTower(buildings: VBuilding[], grid: GroundGrid) {
  const s = landmarkShell(buildings, grid, museumTowerId, 'Museum Tower at Centennial Hill',
    [-10.4, -967.1], [1, 0], [[0, 0], [-12, -15], [12, 15], [-12, 15]]);
  if (!s) return null;
  const { body, lights } = s;
  const seed = seedOf(museumTowerId);
  // The mapped rectangle with its corners chamfered 3.5 m for the glass bays.
  const xs = s.ring.map(([u]) => u), vs = s.ring.map(([, v]) => v);
  const [u0, u1, v0, v1] = [Math.min(...xs), Math.max(...xs), Math.min(...vs), Math.max(...vs)], c = 3.5;
  const plan: P2[] = wound([[u0 + c, v0], [u1 - c, v0], [u1, v0 + c], [u1, v1 - c], [u1 - c, v1], [u0 + c, v1], [u0, v1 - c], [u0, v0 + c]], 1);
  const out = outwardSign(plan);
  s.prism(plan, s.base, BASE, BUFF, BUFF);
  s.prism(plan, BASE, BAND, BRICK, BRICK);
  s.prism(plan, BAND, ROOF, CREAM, '#a7a59c');
  const pitch = (ROOF - BASE) / 25 * 1.0;
  let wall = 0;
  faces(plan, (a, b, len) => {
    const face = wall++;
    const p = (t: number, y: number, off: number) => { const [x, z] = along(a, b, len, t, out * off); return [x, y, z]; };
    if (len < 6) {
      // A chamfered corner: full-height glass with a light line at each floor.
      body.quad(p(.1, BASE, .06), p(.1, ROOF - 1, .06), p(len - .1, ROOF - 1, .06), p(len - .1, BASE, .06), CORNER);
      for (let y = BASE + pitch; y < ROOF - 1; y += pitch)
        body.quad(p(0, y - .15, .09), p(0, y + .15, .09), p(len, y + .15, .09), p(len, y - .15, .09), RAIL);
      for (let j = 0, y = BASE; y < BAND; j++, y += pitch)
        if (litHash(seed, face, j, 0) < .35) lights.quad(p(.3, y + .4, .1), p(.3, y + pitch - .4, .1), p(len - .3, y + pitch - .4, .1), p(len - .3, y + .4, .1), CORNER);
      return;
    }
    // Storefronts in the buff base, and its cream cornice.
    body.quad(p(1, s.base + .8, .06), p(1, BASE - 4, .06), p(len - 1, BASE - 4, .06), p(len - 1, s.base + .8, .06), '#46545b');
    body.quad(p(0, BASE - .8, .25), p(0, BASE, .25), p(len, BASE, .25), p(len, BASE - .8, .25), CREAM);
    // Punched windows: a strip per 3 m bay with a wall spandrel each floor; two balcony stacks.
    const cols = Math.round(len / 3), w = len / cols, stacks = [Math.round(cols * .3), Math.round(cols * .7)];
    for (let i = 0; i < cols; i++) {
      const l = (i + .28) * w, r = (i + .72) * w, balcony = stacks.includes(i);
      body.quad(p(l, BASE, .06), p(l, ROOF - 1.5, .06), p(r, ROOF - 1.5, .06), p(r, BASE, .06), WINDOW);
      for (let j = 0, y = BASE; y < ROOF - 2; j++, y += pitch) {
        if (litHash(seed, face, j, i) < (y > BAND ? .3 : .35))
          lights.quad(p(l, y + .7, .1), p(l, y + pitch - .5, .1), p(r, y + pitch - .5, .1), p(r, y + .7, .1), WINDOW);
        if (balcony) {
          body.quad(p(l - .9, y - .25, 1.5), p(l - .9, y, 1.5), p(r + .9, y, 1.5), p(r + .9, y - .25, 1.5), SLAB);
          body.quad(p(l - .9, y, 1.55), p(l - .9, y + .95, 1.55), p(r + .9, y + .95, 1.55), p(r + .9, y, 1.55), RAIL);
        }
      }
    }
    for (let y = BASE + pitch; y < ROOF - 2; y += pitch) {
      const band = Math.abs((y - BASE) / pitch % 4.5) < .5 || Math.abs(y - BAND) < pitch / 2;
      const color = y > BAND ? CREAM : BRICK;
      body.quad(p(0, y - (band ? .55 : .8), band ? .2 : .08), p(0, y + .4, band ? .2 : .08),
        p(len, y + .4, band ? .2 : .08), p(len, y - (band ? .55 : .8), band ? .2 : .08), band ? CREAM : color);
    }
    // Amber uplight on the crown band's piers (2012 relighting).
    for (let i = 0; i <= cols; i++) {
      const t = Math.min(len - .2, Math.max(.2, i * w));
      lights.quad(p(t - .3, BAND + .3, .14), p(t - .3, ROOF - 1.6, .14), p(t + .3, ROOF - 1.6, .14), p(t + .3, BAND + .3, .14), UPLIGHT);
    }
    body.quad(p(0, ROOF - 1, .3), p(0, ROOF, .3), p(len, ROOF, .3), p(len, ROOF - 1, .3), CREAM);
  });
  // The cream penthouse over the west third of the planted roof deck.
  s.prism([[u0 + 2, v0 + 4], [u0 + 12, v0 + 4], [u0 + 12, v1 - 4], [u0 + 2, v1 - 4]], ROOF, PENTHOUSE, CREAM, '#b4b0a5');
  s.prism([[u0 + 14, v0 + 4], [u1 - 4, v0 + 4], [u1 - 4, v1 - 4], [u0 + 14, v1 - 4]], ROOF, ROOF + .3, '#6f8455', '#6f8455');
  return s.finish('#ffcf8a', .7);
}
