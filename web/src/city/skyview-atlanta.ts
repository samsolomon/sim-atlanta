import type { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

// SkyView Atlanta, the Bussink R60 observation wheel by Centennial Olympic Park
// (opened 2013). A white wheel about 50 m across.
// - Structure: a two-ring rim, 21 spokes and two white tubular A-frames, one on
//   each side, carrying the axle.
// - Hub: a dark oval hub.
// - Gondolas: 42 white capsules with dark glass, hung outside the rim.
// - Base: a boarding deck under an arched steel canopy.
// - Plane: runs about 42° (NE–SW) along the mapped 50.3 × 2.3 m footprint, so
//   the wheel faces the park broadside.
// - Height: the 2019 lidar profile along that plane traces the rim's circle,
//   with the axle about 29 m up and the rim top near 54 m. The official
//   "200 ft" counts the site and gondolas. Thin tubes under-sample in lidar, so
//   gondola tops are allowed to reach about 57 m.
// - Night: LEDs, lit each evening from one show console with colours that vary.
//   City uses the blue-violet seen in 2018–2020 photographs on rim and spokes,
//   leaves the gondolas dark, and does not animate the wheel.
// See docs/skyview-atlanta.md.

export const skyViewId = 'a7661a6c-82d6-4347-98fe-f0acff8b918e';
const R = 25, AXLE = 29, SPOKES = 21, CARS = 42, HALF = 1.6;
const WHITE = '#eef0ef', STEEL = '#d9dcdc', GLASS = '#2c3237', HUB = '#22262a', CANOPY = '#5b6168';

export function createSkyView(buildings: VBuilding[], grid: GroundGrid) {
  const s = landmarkShell(buildings, grid, skyViewId, 'SkyView Atlanta', [-23.3, -548.35], [-33.4, 37.7],
    [[0, 0], [20, 0], [-20, 0], [10, 0]]);
  if (!s) return null;
  const { body, lights } = s;
  const g = s.base + .35, cy = g + AXLE;
  // u runs along the wheel's plane, y up, v across (the axle direction).
  const at = (a: number, r: number, v: number) => [r * Math.cos(a), cy + r * Math.sin(a), v];

  // The rim: two rings (v = ±HALF), each a ribbon with an outward band, 42 segments;
  // the lamp copy carries the LEDs.
  for (const v of [-HALF, HALF])
    for (let k = 0; k < CARS; k++) {
      const a0 = (k * 2 * Math.PI) / CARS, a1 = ((k + 1) * 2 * Math.PI) / CARS;
      body.quad(at(a0, R - .5, v), at(a0, R, v), at(a1, R, v), at(a1, R - .5, v), WHITE);
      body.quad(at(a0, R, v - .25), at(a0, R, v + .25), at(a1, R, v + .25), at(a1, R, v - .25), STEEL);
      lights.quad(at(a0, R - .4, v * 1.01), at(a0, R - .1, v * 1.01), at(a1, R - .1, v * 1.01), at(a1, R - .4, v * 1.01), WHITE);
    }
  // 21 tapered spokes on each face, converging on the hub; the LED wash runs along them.
  for (let k = 0; k < SPOKES; k++) {
    const a = (k * 2 * Math.PI) / SPOKES + Math.PI / 2, n = [-Math.sin(a), Math.cos(a)];
    for (const v of [-HALF, HALF]) {
      const hub = (w: number, o = 0) => [n[0] * w, cy + n[1] * w, v * .35 + o];
      const rim = (w: number, o = 0) => { const p = at(a, R - .5, v + o); return [p[0] + n[0] * w, p[1] + n[1] * w, p[2]]; };
      body.quad(hub(-.7), rim(-.25), rim(.25), hub(.7), WHITE);
      // The LED strip stands 5 cm proud of the spoke's outer face, so the two never z-fight.
      const o = Math.sign(v) * .05;
      lights.quad(hub(-.35, o), rim(-.12, o), rim(.12, o), hub(.35, o), WHITE);
    }
  }
  // The hub: a dark disc each side and its drum.
  const disc = 14;
  for (let k = 0; k < disc; k++) {
    const a0 = (k * 2 * Math.PI) / disc, a1 = ((k + 1) * 2 * Math.PI) / disc;
    for (const v of [-1.1, 1.1]) body.tri(at(0, 0, v), at(a0, 2.4, v), at(a1, 2.4, v), HUB);
    body.quad(at(a0, 2.4, -1.1), at(a0, 2.4, 1.1), at(a1, 2.4, 1.1), at(a1, 2.4, -1.1), HUB);
  }
  // 42 gondolas hung outside the rim: white capsule blocks with a dark glass band.
  for (let k = 0; k < CARS; k++) {
    // Each hangs between the two rim rings from a pivot 1 m outside the rim: at the top it rides
    // just above the rim (54.7 m, the lidar top), and at the bottom its floor clears the boarding deck.
    const a = (k * 2 * Math.PI) / CARS, p = at(a, R + 1, 0);
    const [x, y] = [p[0], p[1]];
    s.prism([[x - 1.1, -1.1], [x + 1.1, -1.1], [x + 1.1, 1.1], [x - 1.1, 1.1]], y - 2.3, y - 1.5, WHITE, WHITE);
    s.prism([[x - 1.15, -1.15], [x + 1.15, -1.15], [x + 1.15, 1.15], [x - 1.15, 1.15]], y - 1.5, y - .3, GLASS, WHITE);
  }
  // Two white A-frames, one on each side, from the ground to the axle.
  for (const v of [-4.5, 4.5])
    for (const u of [-14, 14]) {
      const foot = [u, g, v], top = [0, cy, v * .45];
      const d = [top[0] - foot[0], top[1] - foot[1]], l = Math.hypot(d[0], d[1]), w = [.45 * d[1] / l, -.45 * d[0] / l];
      body.quad([foot[0] - w[0], foot[1] - w[1], foot[2]], [top[0] - w[0], top[1] - w[1], top[2]], [top[0] + w[0], top[1] + w[1], top[2]], [foot[0] + w[0], foot[1] + w[1], foot[2]], WHITE);
      body.quad([foot[0], foot[1], foot[2] - .45], [top[0], top[1], top[2] - .45], [top[0], top[1], top[2] + .45], [foot[0], foot[1], foot[2] + .45], STEEL);
    }
  // The boarding deck under its arched canopy.
  s.prism([[-9, 3], [9, 3], [9, 11], [-9, 11]], g, g + .6, '#b8b6ae', '#c9c6bd');
  for (let k = 0; k < 6; k++) {
    const t0 = k / 6, t1 = (k + 1) / 6, y0 = g + 4 + 1.5 * Math.sin(Math.PI * t0), y1 = g + 4 + 1.5 * Math.sin(Math.PI * t1);
    body.quad([-9 + 18 * t0, y0, 3], [-9 + 18 * t0, y0, 11], [-9 + 18 * t1, y1, 11], [-9 + 18 * t1, y1, 3], CANOPY);
  }
  return s.finish('#8f86ff', .85);
}
