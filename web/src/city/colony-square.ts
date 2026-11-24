import type { GroundGrid } from '../terrain/grid';
import { pointInRing, type P2 } from '../vignette/geom';
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
export const colony400Id = 'osm:way:536737549';

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

/** A stable, well-mixed 0–1 value per window (a linear form makes diagonal stripes). */
function lit(seed: number, face: number, floor: number, bay: number) {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(face + 1, 0xc2b2ae35);
  h = Math.imul(h ^ (floor * 0x27d4eb2d), 0x165667b1) ^ Math.imul(bay + 7, 0x9e3779b1);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
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
        if (lit(seed, i, j, k) >= occupancy) continue;
        f.quad(k / n + w, (k + 1) / n - w, y + spandrel, y + pitch, -0.5, glass, true);
      }
    }
  });
  return top;
}

type Tower = {
  id: string; name: string; origin: P2; probes: P2[];
  half: [number, number]; lobby: number; floors: number; pitch: number; roof: number;
  parapet?: number; podium?: number; cores: { at: P2; size: [number, number]; top: number }[]; seed: number;
};

// Heights above the 2018 lidar ground (296.1 m NAVD88). Frames are centred on
// each tower's lidar roof, with x along Peachtree's 45° grid.
const TOWERS: Record<string, Tower> = {
  [colony100Id]: {
    id: colony100Id, name: '100 Colony Square', origin: [822.15, -3673.5], probes: [[0, 0], [-15, -15], [15, 15]],
    half: [19.7, 19.7], lobby: 8.7, floors: 21, pitch: 3.62, roof: 89.3,
    cores: [{ at: [0, 0], size: [16, 11.6], top: 96.3 }], seed: 7,
  },
  [colony400Id]: {
    id: colony400Id, name: '400 Colony Square', origin: [796.77, -3752.77], probes: [[0, 0], [-12, -20], [12, 20]],
    half: [19, 27.75], lobby: 7.8, floors: 20, pitch: 3.6, roof: 83.3, parapet: 86, podium: 7.8,
    cores: [{ at: [-0.5, -10], size: [11, 12], top: 91.2 }, { at: [-0.5, 0], size: [11, 8], top: 89.9 }], seed: 400,
  },
};

export function createColony100(buildings: VBuilding[], grid: GroundGrid) {
  return createColonyTower(buildings, grid, TOWERS[colony100Id]);
}

export function createColony400(buildings: VBuilding[], grid: GroundGrid) {
  return createColonyTower(buildings, grid, TOWERS[colony400Id]);
}

function createColonyTower(buildings: VBuilding[], grid: GroundGrid, tower: Tower) {
  const s = landmarkShell(buildings, grid, tower.id, tower.name, tower.origin, [1, -1], tower.probes);
  if (!s) return null;
  const site = buildings.find(b => b.id === tower.id)!;
  // Shell heights are NAVD88.
  const grade = 296.1;
  const half = tower.half;
  const shaftLo = grade + tower.lobby, roof = grade + tower.roof;

  // Low plaza bases: the mapped low parts, as pale concrete over street glazing.
  const toLocal = ([x, z]: P2): P2 => {
    const c = Math.SQRT1_2, dx = x - tower.origin[0], dz = z - tower.origin[1];
    return [dx * c - dz * c, dx * c + dz * c];
  };
  // A generated residual 'podium' part carries the tower's height in the data;
  // where the lidar shows it low, the tower config gives its base height.
  const lows = (site.parts ?? []).filter(p => p.rings.length === 1 && (p.id === 'podium' ? tower.podium : p.h && p.h <= 20))
    .map(p => p.id === 'podium' ? { ...p, h: tower.podium } : p);
  const others = lows.map(p => p.rings[0].map(toLocal));
  for (const [n, part] of lows.entries()) {
    const plan = others[n];
    // Each base stands on its own ground; the site falls about 2 m to the northeast.
    const ground = part.rings[0].map(([x, z]) => grid.sample(x, z)).filter((y): y is number => y !== null && Number.isFinite(y));
    const floor = ground.length ? Math.max(...ground) : grade;
    const top = floor + part.h!;
    s.prism(plan, s.base, top, base, roofDeck);
    // Outward by winding; skip edges against the tower or another base.
    const area = plan.reduce((t, [x, z], i) => { const [x2, z2] = plan[(i + 1) % plan.length]; return t + x * z2 - x2 * z; }, 0);
    plan.forEach((a, i) => {
      const b = plan[(i + 1) % plan.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 4) return;
      const sign = area > 0 ? -1 : 1, nx = sign * (b[1] - a[1]) / len, nz = -sign * (b[0] - a[0]) / len;
      const probe: P2 = [(a[0] + b[0]) / 2 + nx * 0.6, (a[1] + b[1]) / 2 + nz * 0.6];
      // A small tolerance also skips walls across the sub-metre slot to the tower.
      if (Math.abs(probe[0]) < half[0] + 0.8 && Math.abs(probe[1]) < half[1] + 0.8) return;
      if (others.some(r => r !== plan && pointInRing(probe[0], probe[1], r))) return;
      const at = (t: number, y: number) => [a[0] + t * (b[0] - a[0]) + nx * 0.04, y, a[1] + t * (b[1] - a[1]) + nz * 0.04];
      const hi = Math.min(top - 1.2, floor + 4.6);
      s.lights.quad(at(0.04, floor + 0.3), at(0.04, hi), at(0.96, hi), at(0.96, floor + 0.3), storefront);
    });
  }

  // Tower: a recessed glazed lobby, the punched shaft, a blank band and the core.
  const box = (x: number, z: number, cx = 0, cz = 0): P2[] => [[cx - x, cz - z], [cx + x, cz - z], [cx + x, cz + z], [cx - x, cz + z]];
  s.prism(box(half[0] - 1.8, half[1] - 1.8), s.base, shaftLo, storefront, roofDeck);
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    s.body.box(1.4, shaftLo - s.base, 1.4, x * (half[0] - 0.7), (shaftLo + s.base) / 2, z * (half[1] - 0.7), precast);
  }
  const gridTop = punchedShaft(s, half, shaftLo, tower.floors, tower.pitch, 2.5, 2.3, 1.2, tower.seed, 1 / 16);
  s.prism(box(half[0], half[1]), gridTop, roof, precast, roofDeck);
  if (tower.parapet) {
    // Parapet ring above the roof deck.
    const top = grade + tower.parapet, t = 0.6;
    const ring = box(half[0], half[1]);
    ring.forEach((a, i) => {
      const f = side(s, a, ring[(i + 1) % 4], [0, 0]);
      f.quad(0, 1, roof, top, 0, precast);
      f.quad(0, 1, roof, top, -t, shade);
    });
    s.body.quad([-half[0], top, -half[1]], [half[0], top, -half[1]], [half[0], top, -half[1] + t], [-half[0], top, -half[1] + t], precast);
    s.body.quad([-half[0], top, half[1] - t], [half[0], top, half[1] - t], [half[0], top, half[1]], [-half[0], top, half[1]], precast);
    s.body.quad([-half[0], top, -half[1]], [-half[0] + t, top, -half[1]], [-half[0] + t, top, half[1]], [-half[0], top, half[1]], precast);
    s.body.quad([half[0] - t, top, -half[1]], [half[0], top, -half[1]], [half[0], top, half[1]], [half[0] - t, top, half[1]], precast);
  }
  for (const c of tower.cores) s.prism(box(c.size[0] / 2, c.size[1] / 2, c.at[0], c.at[1]), roof, grade + c.top, shade, roofDeck);
  // Warm lobby behind the recessed glazing.
  box(half[0] - 1.8, half[1] - 1.8).forEach((a, i, plan) => {
    side(s, a, plan[(i + 1) % 4], [0, 0]).quad(0.08, 0.92, grade + 0.3, shaftLo - 1.4, 0.04, storefront, true);
  });
  return s.finish('#f5d8a8', 0.5);
}
