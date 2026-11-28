import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { along, faces, litHash, outwardSign, seedOf, wound } from './skin-kit';

// Peachtree Towers, 300 Peachtree Street NE (Francis M. Daves, built by C.D. Spangler, 1962), a
// 23-storey condominium tower, once Atlanta's tallest residential building.
// - Plan: an H. The 2019 lidar shows a deep light court cut into the west side, floored at the
//   base roof, and a shallow notch in the east (Peachtree) face that holds a balcony stack.
// - Base: two storeys of brick over polished pink granite piers and tall shop glazing.
// - Shaft: painted buff tan, with columns of white-framed windows over sage-green panels, read
//   at City range as one grey-green strip per column, and full-height stacks of balconies
//   enclosed in glass with dark bronze frames and a light rail at every floor.
// - Roof: a tall tan plant penthouse with a perforated vent band near its top and a white hood.
// Heights are NAVD88: the lidar ring ground is 317.2 m, the roof 72.5 m above it (median) and
// the penthouse 84 m (95th percentile). The mapped 30.5 m is wrong. Stack and column positions on
// the south and east faces follow the 2024 Commons aerial; the north and west faces and the
// court walls are not photographed and repeat the south pattern (estimated). See
// docs/log/ui/peachtree-towers/README.md.

export const peachtreeTowersId = 'ac1b4307-c7ca-42f9-b1fd-9bb1bbb675f7';
const G = 317.2, BASE = G + 9, GRANITE_TOP = G + 4.5, ROOF = G + 72.5, PENTHOUSE = G + 84, FLOORS = 21;
const TAN = '#c4b48f', ROOF_TOP = '#9c9686', BRICK = '#b0725a', GRANITE = '#a56b63', SHOP = '#4f5c62';
const COLUMN = '#7f8c7a', STACK = '#4b473d', RAIL = '#c8c2ad', VENT = '#9a8a58', HOOD = '#e8e8e4';
const GLASS = '#5d6a6e', STACK_GLASS = '#58564e';
const origin: P2 = [344.5, -961];

// World plan of the tower (x east, z south): the mapped outline less the west court and east notch.
const towerWorld: P2[] = [
  [326.6, -941], [342.5, -941], [342.5, -938.7], [354.3, -938.6], [354.3, -940.9], [363.1, -940.8],
  [363.1, -957.5], [360, -957.5], [360, -968.5], [363.2, -968.5], [363.4, -981.9], [353.9, -982],
  [353.9, -984.2], [342.5, -984.3], [342.5, -982], [326.9, -982.1], [326.8, -968.5], [342, -968.5],
  [342, -955.5], [326.7, -955.5],
];
/** Balcony stacks, as world x ranges on the south and north faces (the north mirrors the south). */
const SIDE_STACKS: [number, number][] = [[328, 333.5], [335.5, 340], [355, 360.5]];
const local = ([x, z]: P2): P2 => [x - origin[0], z - origin[1]];

export function createPeachtreeTowers(buildings: VBuilding[], grid: GroundGrid) {
  const s = landmarkShell(buildings, grid, peachtreeTowersId, 'Peachtree Towers', origin, [1, 0],
    [[0, 0], [-15, -18], [15, -18], [15, 18], [-15, 18]]);
  if (!s) return null;
  const { body, lights } = s;
  const seed = seedOf(peachtreeTowersId);
  const tower = wound(towerWorld.map(local), 1);
  const out = outwardSign(tower);
  const pitch = (ROOF - BASE) / FLOORS;

  // Granite and brick base over the whole mapped outline; its roof floors the court and notch.
  const base = wound(s.ring, 1);
  s.prism(base, s.base, GRANITE_TOP, GRANITE, GRANITE);
  s.prism(base, GRANITE_TOP, BASE, BRICK, '#8e8a80');
  const baseOut = outwardSign(base);
  let face = 0;
  faces(base, (a, b, len) => {
    const f = face++;
    const p = (t: number, y: number, off: number) => { const [x, z] = along(a, b, len, t, baseOut * off); return [x, y, z]; };
    // Shop glazing between granite piers, and small square windows in the brick.
    const bays = Math.max(1, Math.round(len / 4.5)), w = len / bays;
    for (let i = 0; i < bays; i++) {
      const l = i * w + .5, r = (i + 1) * w - .5;
      if (r - l < .8) continue;
      (litHash(seed, f, 0, i) < .5 ? lights : body).quad(p(l, s.base + .7, .06), p(l, GRANITE_TOP - .4, .06), p(r, GRANITE_TOP - .4, .06), p(r, s.base + .7, .06), SHOP);
      const c = (l + r) / 2;
      (litHash(seed, f, 1, i) < .25 ? lights : body).quad(p(c - .6, G + 6, .06), p(c - .6, G + 7.3, .06), p(c + .6, G + 7.3, .06), p(c + .6, G + 6, .06), SHOP);
    }
  });

  s.prism(tower, BASE, ROOF, TAN, ROOF_TOP);
  faces(tower, (a, b, len) => {
    const f = face++;
    const p = (t: number, y: number, off: number) => { const [x, z] = along(a, b, len, t, out * off); return [x, y, z]; };
    const [nx, nz] = ((q: P2) => [q[0] - a[0], q[1] - a[1]])(along(a, b, len, 0, out));
    const world = (t: number): P2 => { const [x, z] = along(a, b, len, t); return [x + origin[0], z + origin[1]]; };
    const mid = world(len / 2);
    // Which spans of this face are balcony stacks, as [t0, t1] along it.
    const stacks: [number, number][] = [];
    const span = (lo: number, hi: number, coord: 0 | 1) => {
      const t0 = (lo - world(0)[coord]) / (world(len)[coord] - world(0)[coord]) * len;
      const t1 = (hi - world(0)[coord]) / (world(len)[coord] - world(0)[coord]) * len;
      const [u, v] = [Math.max(0, Math.min(t0, t1)), Math.min(len, Math.max(t0, t1))];
      if (v - u > 1.5) stacks.push([u, v]);
    };
    const outer = mid[1] > -945 || mid[1] < -978;
    if (Math.abs(nz) > .7 && outer) for (const [lo, hi] of SIDE_STACKS) span(lo, hi, 0);
    else if (Math.abs(nz) > .7 && mid[0] < 342.1) span(336.5, 341.5, 0); // court side walls, estimated
    else if (nx > .7 && Math.abs(mid[0] - 360) < .5) span(-967, -959, 1); // the east notch
    for (const [k, [t0, t1]] of stacks.entries()) {
      body.quad(p(t0, BASE + .3, .05), p(t0, ROOF - .6, .05), p(t1, ROOF - .6, .05), p(t1, BASE + .3, .05), STACK);
      for (let j = 0; j < FLOORS; j++) {
        const y = BASE + j * pitch;
        body.quad(p(t0, y + .9, .09), p(t0, y + 1.1, .09), p(t1, y + 1.1, .09), p(t1, y + .9, .09), RAIL);
        if (litHash(seed, f, j, 200 + k) < .28)
          lights.quad(p(t0 + .3, y + 1.2, .1), p(t0 + .3, y + pitch - .3, .1), p(t1 - .3, y + pitch - .3, .1), p(t1 - .3, y + 1.2, .1), STACK_GLASS);
      }
    }
    // Window columns: one strip per column (window over sage panel), lamps where a window is lit.
    const cols = Math.max(1, Math.round(len / 2.6)), w = len / cols;
    for (let i = 0; i < cols; i++) {
      const c = (i + .5) * w, l = c - .45, r = c + .45;
      if (l < .4 || r > len - .4 || stacks.some(([t0, t1]) => r > t0 - .5 && l < t1 + .5)) continue;
      body.quad(p(l, BASE + .5, .06), p(l, ROOF - .9, .06), p(r, ROOF - .9, .06), p(r, BASE + .5, .06), COLUMN);
      for (let j = 0; j < FLOORS; j++)
        if (litHash(seed, f, j, i) < .3) {
          const y = BASE + j * pitch;
          lights.quad(p(l + .1, y + 1.3, .1), p(l + .1, y + pitch - .2, .1), p(r - .1, y + pitch - .2, .1), p(r - .1, y + 1.3, .1), GLASS);
        }
    }
  });

  // The plant penthouse over the middle of the roof, its vent band, and the white hood on its south side.
  const penthouse = wound([local([342.5, -977]), local([352, -977]), local([352, -950]), local([342.5, -950])], 1);
  s.prism(penthouse, ROOF, PENTHOUSE, TAN, ROOF_TOP);
  const pOut = outwardSign(penthouse);
  faces(penthouse, (a, b, len) => {
    const p = (t: number, y: number) => { const [x, z] = along(a, b, len, t, pOut * .05); return [x, y, z]; };
    body.quad(p(.6, PENTHOUSE - 3.4), p(.6, PENTHOUSE - 1), p(len - .6, PENTHOUSE - 1), p(len - .6, PENTHOUSE - 3.4), VENT);
  });
  s.prism([local([346.5, -950]), local([349.5, -950]), local([349.5, -947]), local([346.5, -947])], ROOF, ROOF + 5, HOOD, HOOD);
  return s.finish('#f4d9a8', .62);
}
