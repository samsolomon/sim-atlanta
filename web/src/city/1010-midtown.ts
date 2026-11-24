import { Mesh } from 'three';
import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

/**
 * 1010 Midtown, the 35-storey condominium tower at Peachtree and 12th (2008). Its mapped outline
 * crosses the midtown-central / midtown-upper seam at z = -3300. Midtown-upper holds the curved
 * tower and most of the podium; midtown-central holds the rest of the podium and a 4 m bump of the
 * tower part, drawn at podium height. Each clip builds its own parts, so neither row keeps a
 * generic box. Heights are NAVD88 metres from the April 2019 3DEP lidar
 * (docs/log/ui/1010-midtown/README.md).
 */
export const midtown1010Id = 'osm:way:1427534504';
const towerPart = 'osm:way:234935281';
/** Lidar roof of each low part, NAVD88 metres. */
const lowTops: Record<string, number> = {
  'osm:way:234935279': 321.5, // stone podium and garage under the tower's west side
  'osm:way:1454188324': 309, // Peachtree retail
  'osm:way:1454188325': 309, // 12th Street retail
  [towerPart]: 321.5, // the tower part's bump south of the seam, under the podium roof line
};

/** Along the tower's straight west face, from its south end to its north end. */
const seamZ = -3300;
const axis: P2 = [0.592, -0.806];
const upperOrigin: P2 = [722, -3335];
const centralOrigin: P2 = [690, -3288];

const stone = '#cdc2ad',
  stoneShade = '#b4a994',
  glass = '#7ea6bf',
  recess = '#55707f',
  slab = '#e6e4de',
  storefront = '#3e4a50',
  roof = '#9a968c';

/** One tolerance for every part, so walls the tower shares with the podium stay together. */
const tolerance = 0.3;
const shaftBase = 312,
  roofTop = 413.9,
  plantTop = 419.5,
  floor = 3.22;

/** Douglas-Peucker on a closed ring: keeps the curve's shape with far fewer walls. */
export function simplifyRing(ring: P2[], tolerance: number): P2[] {
  const unique = ring.filter((p, i) => {
    const q = ring[(i + 1) % ring.length];
    return Math.hypot(q[0] - p[0], q[1] - p[1]) > 1e-6;
  });
  if (unique.length < 4) return unique;
  // Split at the two most distant vertices, then simplify each open chain.
  let a = 0, b = 0, best = -1;
  for (let i = 0; i < unique.length; i++) for (let j = i + 1; j < unique.length; j++) {
    const d = Math.hypot(unique[i][0] - unique[j][0], unique[i][1] - unique[j][1]);
    if (d > best) { best = d; a = i; b = j; }
  }
  const chain = (from: number, to: number) => {
    const out: P2[] = [];
    for (let i = from; ; i = (i + 1) % unique.length) { out.push(unique[i]); if (i === to) break; }
    return out;
  };
  const dp = (pts: P2[]): P2[] => {
    if (pts.length < 3) return pts;
    const [p, q] = [pts[0], pts[pts.length - 1]];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    let index = 0, far = -1;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = Math.abs((q[0] - p[0]) * (p[1] - pts[i][1]) - (p[0] - pts[i][0]) * (q[1] - p[1])) / len;
      if (d > far) { far = d; index = i; }
    }
    return far <= tolerance ? [p, q] : [...dp(pts.slice(0, index + 1)).slice(0, -1), ...dp(pts.slice(index))];
  };
  return [...dp(chain(a, b)).slice(0, -1), ...dp(chain(b, a)).slice(0, -1)];
}

/** Stable per-window hash in [0, 1). */
function hash(a: number, b: number, c: number) {
  const h = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return h - Math.floor(h);
}

export function create1010Midtown(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const tower = site.parts?.find(part => part.id === towerPart);
  // The upper row holds the tower proper, everything north of the seam.
  const upper = !!tower?.rings[0].some(([, z]) => z < seamZ - 2);
  const origin = upper ? upperOrigin : centralOrigin;
  const s = landmarkShell(buildings, grid, site.id, '1010 Midtown', origin, axis, [[0, 0]]);
  if (!s) return null;
  const angle = Math.atan2(axis[1], axis[0]), c = Math.cos(angle), sn = Math.sin(angle);
  /** World ring to the shell's frame, counter-clockwise so (dv, -du) points outward. */
  const local = (ring: P2[]): P2[] => {
    const plan = ring.map(([x, z]): P2 => [(x - origin[0]) * c + (z - origin[1]) * sn, -(x - origin[0]) * sn + (z - origin[1]) * c]);
    const area = plan.reduce((sum, [x, z], i) => sum + x * plan[(i + 1) % plan.length][1] - plan[(i + 1) % plan.length][0] * z, 0);
    return area < 0 ? plan.reverse() : plan;
  };
  const gradeAt = (u: number, v: number) => grid.sample(origin[0] + u * c - v * sn, origin[1] + u * sn + v * c) ?? s.base;

  type Face = { a: P2; b: P2; length: number; n: P2 };
  const faces = (plan: P2[]): Face[] => plan.map((a, i) => {
    const b = plan[(i + 1) % plan.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return { a, b, length, n: [(b[1] - a[1]) / length, -(b[0] - a[0]) / length] as P2 };
  }).filter(f => f.length > 0.5);
  const at = (f: Face, t: number, y: number, depth: number) =>
    [f.a[0] + t * (f.b[0] - f.a[0]) + depth * f.n[0], y, f.a[1] + t * (f.b[1] - f.a[1]) + depth * f.n[1]];
  const panel = (f: Face, l: number, r: number, lo: number, hi: number, depth: number, color: string, lit = false) =>
    (lit ? s.lights : s.body).quad(at(f, l, lo, depth), at(f, l, hi, depth), at(f, r, hi, depth), at(f, r, lo, depth), color);

  // Low parts: stone podium and retail with a dark storefront band at street level.
  for (const part of site.parts ?? []) {
    if (part.rings.length !== 1 || (part.id === towerPart && upper)) continue;
    const plan = simplifyRing(local(part.rings[0]), tolerance);
    // Parts without a lidar roof (the 3.3 m strip on 12th Street) keep their mapped height.
    const [cu, cv] = plan.reduce(([a, b], [u, v]) => [a + u / plan.length, b + v / plan.length], [0, 0]);
    const top = lowTops[part.id] ?? gradeAt(cu, cv) + part.h;
    s.prism(plan, s.base, top, stone, roof);
    for (const f of faces(plan)) {
      if (f.length < 4) continue;
      const mid = at(f, 0.5, 0, 0), y = gradeAt(mid[0], mid[2]);
      if (y + 4.6 < top) panel(f, 0.04, 0.96, y + 0.3, y + 4.2, 0.06, storefront);
    }
  }

  if (upper && tower) {
    const plan = simplifyRing(local(tower.rings[0]), tolerance);
    s.prism(plan, s.base, shaftBase, stone, roof);
    s.prism(plan, shaftBase, roofTop, glass, roof);
    // The Peachtree side is the curve of continuous balcony ribbons; the rest is flat blue glass.
    const east: P2 = [c, -sn];
    const floors = Math.floor((roofTop - 1.5 - shaftBase) / floor);
    faces(plan).forEach((f, edge) => {
      const ribbon = f.n[0] * east[0] + f.n[1] * east[1] > 0.25 && f.length > 3;
      if (ribbon) {
        panel(f, 0, 1, shaftBase, roofTop - 1.2, 0.02, recess);
        // Bands run 0.6 m past each corner so neighbours overlap around the convex curve.
        const over = 0.6 / f.length;
        for (let j = 0; j < floors; j++) {
          const y = shaftBase + (j + 1) * floor;
          if (y + 1.0 > roofTop - 1.2) break;
          // One band per floor: the white slab edge under its glass rail read as a single ribbon.
          panel(f, -over, 1 + over, y - 0.45, y + 1.0, 1.9, slab);
        }
      }
      const bays = Math.max(1, Math.round(f.length / 3.4));
      if (!ribbon) {
        // White frames, in front of the lit panes: a mullion at every bay and a transom every fourth floor.
        for (let k = 0; k <= bays; k++) panel(f, k / bays - 0.14 / f.length, k / bays + 0.14 / f.length, shaftBase, roofTop - 1.2, 0.1, slab);
        for (let j = 4; j < floors; j += 4) panel(f, 0, 1, shaftBase + j * floor - 0.2, shaftBase + j * floor + 0.2, 0.1, slab);
      }
      // Residential windows are noticeably lit at night (illustrative occupancy).
      const units = Math.max(1, Math.round(f.length / 5));
      for (let j = 0; j < floors; j++) for (let k = 0; k < units; k++) {
        if (hash(edge, j, k) > 0.2) continue;
        const y = shaftBase + j * floor + (ribbon ? 1.1 : 0.45);
        panel(f, (k + 0.08) / units, (k + 0.92) / units, y, y + (ribbon ? 1.95 : 2.4), 0.07, ribbon ? recess : glass, true);
      }
    });
    // Roof plant along the slab's spine (lidar 417-420 m) behind a glass screen on the west edge.
    s.prism([[-22, -5], [14, -5], [14, 2], [-22, 2]], roofTop, plantTop, '#a29e94', roof);
    const back = faces(plan).filter(f => f.n[0] * east[0] + f.n[1] * east[1] < -0.5);
    const west = back.reduce((a, b) => (b.length > a.length ? b : a));
    panel(west, 0.02, 0.98, roofTop, roofTop + 2.2, 0, glass);
    // A pale cap edge finishes the curve and the flat faces alike.
    for (const f of faces(plan)) panel(f, -0.01, 1.01, roofTop - 1.2, roofTop, 0.12, slab);
  }

  const model = s.finish('#ffd9a6', 0.62);
  // Without tower windows the central clip has no lit panes; an empty lamp mesh still costs a draw.
  for (const child of model.group.children) {
    if (child instanceof Mesh && !child.geometry.getAttribute('position').count) child.visible = false;
  }
  return model;
}
