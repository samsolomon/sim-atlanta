import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

/**
 * Colony Square's 1970s office towers (100 and 400) on the 45° Peachtree grid:
 * white precast punched with dark windows, a blank band under the roof, and a
 * core penthouse. Plans come from the April 2018 lidar returns, which put each
 * shaft about 1.5 m beyond its mapped part on the side the low parts claimed.
 * The low parts stay as the plaza's concrete-and-glass bases.
 */
export const colony100Id = 'osm:way:536737548';

const precast = '#e6e3db',
  shade = '#cbc8c0',
  glass = '#586168',
  base = '#c9c4b8',
  storefront = '#56646c',
  roofDeck = '#a3a19b';

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;

/** Quads on one face of an axis-aligned local box, offset outward. */
function side(s: Shell, a: P2, b: P2, center: P2) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  let nx = dz / len, nz = -dx / len;
  if (((a[0] + b[0]) / 2 - center[0]) * nx + ((a[1] + b[1]) / 2 - center[1]) * nz < 0) { nx = -nx; nz = -nz; }
  const at = (t: number, y: number, out: number) => [a[0] + t * dx + nx * out, y, a[1] + t * dz + nz * out];
  return {
    len,
    quad(l: number, r: number, y0: number, y1: number, out: number, c: string, lit = false) {
      (lit ? s.lights : s.body).quad(at(l, y0, out), at(l, y1, out), at(r, y1, out), at(r, y0, out), c);
    },
  };
}

/**
 * A punched precast grid: continuous piers and spandrels over a recessed dark
 * glass box, so the window count costs rows + columns, not rows × columns.
 * Lit panes (sparse, stable) sit in front of the glass in the lamp mesh.
 */
function punchedShaft(s: Shell, half: [number, number], lo: number, floors: number, pitch: number, bay: number,
  spandrel: number, pier: number, seed: number, occupancy: number) {
  const [hx, hz] = half, top = lo + floors * pitch;
  const box = (x: number, z: number): P2[] => [[-x, -z], [x, -z], [x, z], [-x, z]];
  s.prism(box(hx - 0.7, hz - 0.7), lo, top, glass, glass);
  const corners = box(hx, hz);
  corners.forEach((a, i) => {
    const b = corners[(i + 1) % 4];
    const f = side(s, a, b, [0, 0]);
    const n = Math.max(1, Math.round(f.len / bay)), w = pier / 2 / f.len;
    for (let k = 0; k <= n; k++) f.quad(Math.max(0, k / n - w), Math.min(1, k / n + w), lo, top, 0, precast);
    for (let j = 0; j < floors; j++) {
      const y = lo + j * pitch;
      f.quad(0, 1, y, y + spandrel, 0, precast);
      for (let k = 0; k < n; k++) {
        if ((j * 31 + k * 17 + i * 43 + seed) % Math.round(1 / occupancy) !== 0) continue;
        f.quad(k / n + w, (k + 1) / n - w, y + spandrel, y + pitch, -0.5, glass, true);
      }
    }
  });
  return top;
}

export function createColony100(buildings: VBuilding[], grid: GroundGrid) {
  // Frame: origin at the lidar diamond's centre, x along Peachtree's 45° grid.
  const s = landmarkShell(buildings, grid, colony100Id, '100 Colony Square', [822.15, -3673.5], [1, -1],
    [[0, 0], [-15, -15], [15, 15]]);
  if (!s) return null;
  const site = buildings.find(b => b.id === colony100Id)!;
  const grade = s.base + 0.35;
  // Lidar (2018, ground 296.1 m NAVD88): main roof 89.3 m, core 96.3 m.
  const half: [number, number] = [19.7, 19.7];
  const shaftLo = grade + 8.7,
    floors = 21,
    pitch = 3.62,
    roof = grade + 89.3,
    core = grade + 96.3;

  // Low plaza bases: the mapped low parts, as pale concrete over street glazing.
  const toLocal = ([x, z]: P2): P2 => {
    const c = Math.SQRT1_2, dx = x - 822.15, dz = z + 3673.5;
    return [dx * c - dz * c, dx * c + dz * c];
  };
  for (const part of site.parts ?? []) {
    if (!part.h || part.h > 20 || part.rings.length !== 1) continue;
    const plan = part.rings[0].map(toLocal);
    const top = grade + part.h;
    s.prism(plan, s.base, top, base, roofDeck);
    const c: P2 = [plan.reduce((t, p) => t + p[0], 0) / plan.length, plan.reduce((t, p) => t + p[1], 0) / plan.length];
    plan.forEach((a, i) => {
      const b = plan[(i + 1) % plan.length];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 4) return;
      side(s, a, b, c).quad(0.04, 0.96, grade + 0.3, Math.min(top - 1.2, grade + 4.6), 0.04, storefront, true);
    });
  }

  // Tower: a recessed glazed lobby, the punched shaft, a blank band and the core.
  const box = (x: number, z: number): P2[] => [[-x, -z], [x, -z], [x, z], [-x, z]];
  s.prism(box(half[0] - 1.8, half[1] - 1.8), s.base, shaftLo, storefront, roofDeck);
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    s.body.box(1.4, shaftLo - s.base, 1.4, x * (half[0] - 0.7), (shaftLo + s.base) / 2, z * (half[1] - 0.7), precast);
  }
  const gridTop = punchedShaft(s, half, shaftLo, floors, pitch, 2.5, 2.3, 1.2, 7, 1 / 16);
  s.prism(box(half[0], half[1]), gridTop, roof, precast, roofDeck);
  s.prism(box(8, 5.8), roof, core, shade, roofDeck);
  // Warm lobby behind the recessed glazing.
  box(half[0] - 1.8, half[1] - 1.8).forEach((a, i, plan) => {
    side(s, a, plan[(i + 1) % 4], [0, 0]).quad(0.08, 0.92, grade + 0.3, shaftLo - 1.4, 0.04, storefront, true);
  });
  return s.finish('#f5d8a8', 0.5);
}
