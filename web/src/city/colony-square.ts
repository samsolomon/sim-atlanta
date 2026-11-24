import type { GroundGrid } from '../terrain/grid';
import { pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litHash } from './skin-kit';

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

/** Per-tower facade palette and rhythm (the shared Colony Square palette lives in docs/research/colony-square.md). */
type Style = {
  glass: string; pier: string; crown: string; lobby: string;
  bay: number; spandrel: number; pierWidth: number;
  /** Piers stand proud of the spandrels by this much (0: flush grid). */
  pierDepth: number;
  /** Every nth pier is a wider major pier; 0 for none. */
  majorEvery: number;
  /** A darker shadow band under every nth spandrel; 0 for none. */
  bandEvery: number; band: string;
  /** Solid precast at each end of a face, in metres (the photographed blank corners). */
  cornerSolid: number;
  /** Spandrel colour inside the window slots (default: the pier colour). */
  spandrelColor?: string;
  /** Colour of the blank corners (default: the pier colour). */
  cornerColor?: string;
  /** A continuous dark mechanical band at this floor index; -1 for none. */
  mechFloor: number;
};

const DEFAULT_STYLE: Style = {
  glass, pier: precast, crown: precast, lobby: storefront,
  bay: 2.5, spandrel: 2.3, pierWidth: 1.2, pierDepth: 0, majorEvery: 0, bandEvery: 0, band: shade,
  cornerSolid: 0, mechFloor: -1,
};

/**
 * A punched precast grid: continuous piers and spandrels over a recessed dark
 * glass box, so the window count costs rows + columns, not rows × columns.
 * Lit panes (sparse, stable) sit in front of the glass in the lamp mesh.
 */
function punchedShaft(s: Shell, half: [number, number], lo: number, floors: number, pitch: number,
  st: Style, seed: number, occupancy: number) {
  const [hx, hz] = half, top = lo + floors * pitch;
  const box = (x: number, z: number): P2[] => [[-x, -z], [x, -z], [x, z], [-x, z]];
  s.prism(box(hx - 0.7, hz - 0.7), lo, top, st.glass, st.glass);
  const corners = box(hx, hz);
  corners.forEach((a, i) => {
    const b = corners[(i + 1) % 4];
    const f = side(s, a, b, [0, 0]);
    const n = Math.max(1, Math.round(f.len / st.bay));
    const d = st.pierDepth;
    for (let k = 0; k <= n; k++) {
      const major = k === 0 || k === n || (st.majorEvery > 0 && k % st.majorEvery === 0);
      const w = (major && st.majorEvery ? st.pierWidth * 1.8 : st.pierWidth) / 2 / f.len;
      const l = Math.max(0, k / n - w), r = Math.min(1, k / n + w);
      f.quad(l, r, lo, top, d, st.pier);
      if (d > 0) {
        // Pier cheeks: the returns that make the verticals read in raking light.
        if (k > 0) f.quad(l, l + 0.0001, lo, top, d / 2, st.band);
        if (k < n) f.quad(r - 0.0001, r, lo, top, d / 2, st.band);
      }
    }
    if (st.cornerSolid > 0) {
      const c = st.cornerSolid / f.len;
      f.quad(0, c, lo, top, d + 0.02, st.cornerColor ?? st.pier);
      f.quad(1 - c, 1, lo, top, d + 0.02, st.cornerColor ?? st.pier);
    }
    for (let j = 0; j < floors; j++) {
      const y = lo + j * pitch;
      if (j === st.mechFloor) {
        // The mechanical floor reads as one continuous dark glazed band.
        const c = st.cornerSolid / f.len;
        f.quad(c, 1 - c, y + 0.3, y + pitch - 0.3, d + 0.01, st.band === shade ? st.glass : '#5c5751');
        continue;
      }
      f.quad(0, 1, y, y + st.spandrel, 0, st.spandrelColor ?? st.pier);
      if (st.bandEvery && j % st.bandEvery === 0) f.quad(0, 1, y + st.spandrel - 0.45, y + st.spandrel, 0.02, st.band);
      const w = st.pierWidth / 2 / f.len;
      for (let k = 0; k < n; k++) {
        if (j === st.mechFloor || litHash(seed, i, j, k) >= occupancy) continue;
        if (st.cornerSolid > 0 && ((k + 0.5) / n < st.cornerSolid / f.len || (k + 0.5) / n > 1 - st.cornerSolid / f.len)) continue;
        f.quad(k / n + w, (k + 1) / n - w, y + st.spandrel, y + pitch, -0.5, st.glass, true);
      }
    }
  });
  return top;
}

type Tower = {
  id: string; name: string; origin: P2; probes: P2[];
  half: [number, number]; lobby: number; floors: number; pitch: number; roof: number;
  parapet?: number; podium?: number; style?: Partial<Style>; cores: { at: P2; size: [number, number]; top: number }[]; seed: number;
};

// Heights above the 2018 lidar ground (296.1 m NAVD88). Frames are centred on
// each tower's lidar roof, with x along Peachtree's 45° grid.
const TOWERS: Record<string, Tower> = {
  [colony100Id]: {
    id: colony100Id, name: '100 Colony Square', origin: [822.15, -3673.5], probes: [[0, 0], [-15, -15], [15, 15]],
    half: [19.7, 19.7], lobby: 8.7, floors: 21, pitch: 3.62, roof: 89.3,
    // Shared Colony Square palette, with 100's own rhythm from the 2025 Commons photograph
    // (AColonySq1002511-0966): a crisp white square shaft, about 18 small square windows per face
    // in a dominant white grid (no floor bands), narrow blank corners and a tall blank crown.
    style: {
      glass: '#6b655e', pier: '#efebe2', crown: '#f8f6f0', lobby: '#3f4448', band: '#b9b3a7',
      cornerColor: '#f8f6f0',
      // At 600 m a 2.2 m bay blurs, so the windows are sized to give the field a mid-dark tone
      // that the bright blank corners and crown frame: the coarse read that sets it apart.
      bay: 2.2, spandrel: 1.8, pierWidth: 0.95, pierDepth: 0.25, majorEvery: 0, bandEvery: 0,
      cornerSolid: 2.4, mechFloor: -1,
    },
    cores: [{ at: [0, 0], size: [16, 11.6], top: 96.3 }], seed: 7,
  },
  [colony400Id]: {
    id: colony400Id, name: '400 Colony Square', origin: [796.77, -3752.77], probes: [[0, 0], [-12, -20], [12, 20]],
    half: [19, 27.75], lobby: 7.8, floors: 19, pitch: 3.6, roof: 83.3, parapet: 86, podium: 7.8,
    // Shared Colony Square palette (agreed with skins-6): warm bronze-grey glass,
    // bright precast, proud piers with a major pier every fourth bay, a floor
    // shadow band every second floor, a pale crown and a dark two-storey lobby.
    style: {
      glass: '#6b655e', pier: '#ece8de', crown: '#f3f0e9', lobby: '#3f4448', band: '#b9b3a7',
      // Spandrels inside the slots go near the glass, so each slot reads as a
      // continuous dark vertical between the light piers; corners frame the shaft.
      spandrelColor: '#625d57', cornerColor: '#f5f2eb',
      // Tall narrow slit windows (2007 photo): wide piers, short spandrels.
      bay: 2.5, spandrel: 1.2, pierWidth: 1.55, pierDepth: 0.35, majorEvery: 0, bandEvery: 0,
      cornerSolid: 3.2, mechFloor: 13,
    },
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
  const st: Style = { ...DEFAULT_STYLE, ...tower.style };

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
  s.prism(box(half[0] - 1.8, half[1] - 1.8), s.base, shaftLo, st.lobby, roofDeck);
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    s.body.box(1.4, shaftLo - s.base, 1.4, x * (half[0] - 0.7), (shaftLo + s.base) / 2, z * (half[1] - 0.7), st.pier);
  }
  if (st.majorEvery) {
    // Major piers carry down through the recessed lobby to grade.
    box(half[0], half[1]).forEach((a, i, ring) => {
      const f = side(s, a, ring[(i + 1) % 4], [0, 0]);
      const n = Math.max(1, Math.round(f.len / st.bay));
      for (let k = st.majorEvery; k < n; k += st.majorEvery) {
        const w = st.pierWidth * 0.9 / f.len;
        f.quad(k / n - w, k / n + w, s.base, shaftLo, st.pierDepth, st.pier);
      }
    });
  }
  const gridTop = punchedShaft(s, half, shaftLo, tower.floors, tower.pitch, st, tower.seed, 1 / 16);
  s.prism(box(half[0], half[1]), gridTop, roof, st.crown, roofDeck);
  if (tower.parapet) {
    // Parapet ring above the roof deck.
    const top = grade + tower.parapet, t = 0.6;
    const ring = box(half[0], half[1]);
    ring.forEach((a, i) => {
      const f = side(s, a, ring[(i + 1) % 4], [0, 0]);
      f.quad(0, 1, roof, top, 0, st.crown);
      f.quad(0, 1, roof, top, -t, shade);
    });
    s.body.quad([-half[0], top, -half[1]], [half[0], top, -half[1]], [half[0], top, -half[1] + t], [-half[0], top, -half[1] + t], precast);
    s.body.quad([-half[0], top, half[1] - t], [half[0], top, half[1] - t], [half[0], top, half[1]], [-half[0], top, half[1]], precast);
    s.body.quad([-half[0], top, -half[1]], [-half[0] + t, top, -half[1]], [-half[0] + t, top, half[1]], [-half[0], top, half[1]], precast);
    s.body.quad([half[0] - t, top, -half[1]], [half[0], top, -half[1]], [half[0], top, half[1]], [half[0] - t, top, half[1]], precast);
  }
  for (const c of tower.cores) s.prism(box(c.size[0] / 2, c.size[1] / 2, c.at[0], c.at[1]), roof, grade + c.top, tower.style ? st.crown : shade, roofDeck);
  // Warm lobby behind the recessed glazing.
  box(half[0] - 1.8, half[1] - 1.8).forEach((a, i, plan) => {
    side(s, a, plan[(i + 1) % 4], [0, 0]).quad(0.08, 0.92, grade + 0.3, shaftLo - 1.4, 0.04, storefront, true);
  });
  return s.finish('#f5d8a8', 0.5);
}
