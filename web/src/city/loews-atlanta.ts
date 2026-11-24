import type { GroundGrid } from '../terrain/grid';
import { pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

/**
 * Loews Atlanta Hotel, 1065 Peachtree Street (2010), part of the 12th & Midtown development.
 * The mapped site splits into a west wing (`osm:way:1434982550`), three 8 m arrival and retail
 * pieces, and the tower itself (the largest remaining part, 79.9 m mapped). Heights are NAVD88
 * metres from the April 2019 3DEP lidar, which puts the tower at 405 m with a higher north-west
 * block on the Peachtree side at 411.5 m and the west wing at 369 m
 * (docs/log/ui/loews-atlanta/README.md). Flat vertex colours, no library surfaces: the low tier
 * has no shader-program headroom for a painted variant.
 */
export const loewsId = 'osm:way:234935283';
const wingPart = 'osm:way:1434982550';

/** Along the tower's long faces; +u points east-south-east, away from Peachtree. */
const axis: P2 = [0.854, 0.52];
const origin: P2 = [770, -3272];

const glass = '#9db4c4',
  frame = '#dfe3e3',
  stone = '#cbbfa8',
  storefront = '#3e4a50',
  slab = '#e3e1db',
  roof = '#9a968c';

const towerRoof = 405,
  upperRoof = 411.5,
  wingRoof = 369,
  glassBase = 310,
  floor = 3.3;

/** The part of a counter-clockwise polygon on the side of the line where `side(p) >= 0`. */
function clip(plan: P2[], side: (p: P2) => number): P2[] {
  const out: P2[] = [];
  plan.forEach((p, i) => {
    const q = plan[(i + 1) % plan.length], sp = side(p), sq = side(q);
    if (sp >= 0) out.push(p);
    if (sp >= 0 !== sq >= 0) {
      const t = sp / (sp - sq);
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  });
  return out;
}

/** Ring area, positive when counter-clockwise. */
function area(plan: P2[]) {
  return plan.reduce((sum, [x, z], i) => sum + x * plan[(i + 1) % plan.length][1] - plan[(i + 1) % plan.length][0] * z, 0) / 2;
}

/** Drops vertices closer than `min` metres to the last one kept, and collinear runs (facades only). */
function tidy(ring: P2[], min = 0.8): P2[] {
  const kept: P2[] = [];
  for (const p of ring) {
    const last = kept.at(-1);
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > min) kept.push(p);
  }
  if (kept.length > 3 && Math.hypot(kept[0][0] - kept.at(-1)![0], kept[0][1] - kept.at(-1)![1]) <= min) kept.pop();
  return kept.filter((p, i) => {
    const a = kept[(i + kept.length - 1) % kept.length], b = kept[(i + 1) % kept.length];
    const ux = p[0] - a[0], uz = p[1] - a[1], vx = b[0] - p[0], vz = b[1] - p[1];
    return Math.abs(ux * vz - uz * vx) / (Math.hypot(ux, uz) * Math.hypot(vx, vz)) > 0.05 || ux * vx + uz * vz < 0;
  });
}

/** Stable per-window hash in [0, 1). */
function hash(a: number, b: number, c: number) {
  const h = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return h - Math.floor(h);
}

export function createLoews(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const wing = site.parts?.find(part => part.id === wingPart);
  // The tower is the largest tall part; the import's name for it ('podium') is not stable.
  const tower = (site.parts ?? []).filter(part => part !== wing && part.h > 60 && part.rings.length === 1)
    .reduce<NonNullable<VBuilding['parts']>[number] | undefined>((a, b) =>
      !a || Math.abs(area(b.rings[0])) > Math.abs(area(a.rings[0])) ? b : a, undefined);
  if (!tower || wing?.rings.length !== 1) return null;
  const s = landmarkShell(buildings, grid, site.id, 'Loews Atlanta Hotel', origin, axis, [[0, 0], [-15, 0], [20, 0]]);
  if (!s) return null;
  const angle = Math.atan2(axis[1], axis[0]), c = Math.cos(angle), sn = Math.sin(angle);
  /** Exact mapped ring in the street frame, counter-clockwise; masses share these edges. */
  const local = (ring: P2[]): P2[] => {
    const plan = ring.map(([x, z]): P2 => [(x - origin[0]) * c + (z - origin[1]) * sn, -(x - origin[0]) * sn + (z - origin[1]) * c]);
    return area(plan) < 0 ? plan.reverse() : plan;
  };
  const toWorld = (u: number, v: number): P2 => [origin[0] + u * c - v * sn, origin[1] + u * sn + v * c];
  const gradeAt = (u: number, v: number) => grid.sample(...toWorld(u, v)) ?? s.base;

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

  /** Masses that hide a face standing against them, with the height they reach. */
  const covers: { plan: P2[]; top: number }[] = [];
  const exposed = (f: Face, y: number) => {
    const p = at(f, 0.5, y, 0.8);
    return !covers.some(m => m.top > y && pointInRing(p[0], p[2], m.plan));
  };
  /** Pale gridded curtain wall: a mullion per room bay, a transom every second floor, lit rooms. */
  const curtain = (plan: P2[], lo: number, hi: number, seed: number) => {
    faces(tidy(plan)).forEach((f, edge) => {
      if (f.length < 2 || !exposed(f, hi - 1)) return;
      const bays = Math.max(1, Math.round(f.length / 3.2));
      const floors = Math.floor((hi - 1 - lo) / floor);
      for (let k = 0; k <= bays; k++) panel(f, k / bays - 0.12 / f.length, k / bays + 0.12 / f.length, lo, hi - 0.6, 0.1, frame);
      for (let j = 2; j < floors; j += 2) panel(f, 0, 1, lo + j * floor - 0.18, lo + j * floor + 0.18, 0.1, frame);
      // A hotel is noticeably lit at night (illustrative occupancy), one pane per room bay.
      const units = bays;
      for (let j = 0; j < floors; j++) for (let k = 0; k < units; k++) {
        if (hash(seed + edge, j, k) > 0.32) continue;
        const y = lo + j * floor + 0.5;
        if (!exposed(f, y + 1)) continue;
        panel(f, (k + 0.1) / units, (k + 0.9) / units, y, y + 2.3, 0.07, glass, true);
      }
      panel(f, -0.005, 1.005, hi - 0.6, hi, 0.12, frame);
    });
  };

  // Stone base under every mass, then glass above it.
  const towerPlan = local(tower.rings[0]);
  const wingPlan = local(wing.rings[0]);
  const lowParts = (site.parts ?? []).filter(part => part !== tower && part !== wing && part.rings.length === 1)
    .map(part => {
      const plan = local(part.rings[0]);
      const [cu, cv] = plan.reduce(([a, b], [u, v]) => [a + u / plan.length, b + v / plan.length], [0, 0]);
      return { plan, top: gradeAt(cu, cv) + part.h };
    });
  covers.push({ plan: towerPlan, top: towerRoof }, { plan: wingPlan, top: wingRoof }, ...lowParts);
  s.prism(towerPlan, s.base, glassBase, stone, roof);
  s.prism(wingPlan, s.base, glassBase, stone, roof);
  for (const plan of [towerPlan, wingPlan]) for (const f of faces(tidy(plan))) {
    if (f.length < 5 || !exposed(f, glassBase - 4)) continue;
    const mid = at(f, 0.5, 0, 0), y = gradeAt(mid[0], mid[2]);
    if (y + 5 < glassBase) panel(f, 0.05, 0.95, y + 0.3, Math.min(y + 5.5, glassBase - 1), 0.06, storefront, true);
  }

  // The tower steps: its Peachtree (north-west) half rises to 411.5 m, the rest stops at 405 m.
  const split = (p: P2) => 2 - p[0];
  const upper = clip(towerPlan, split), lower = clip(towerPlan, p => -split(p));
  s.prism(lower, glassBase, towerRoof, glass, roof);
  s.prism(upper, glassBase, upperRoof, glass, roof);
  curtain(lower, glassBase, towerRoof, 0);
  curtain(upper, glassBase, upperRoof, 40);
  s.prism(wingPlan, glassBase, wingRoof, glass, roof);
  curtain(wingPlan, glassBase, wingRoof, 80);

  // Hotel residences on the top floors carry a stack of balcony slabs on the face most squarely
  // toward Peachtree (world west). Each slab is a horizontal plate with a front edge.
  const west: P2 = [-c, sn];
  const facing = (f: Face) => f.n[0] * west[0] + f.n[1] * west[1];
  const candidates = faces(tidy(upper)).filter(f => f.length > 6);
  const peachtree = candidates.length ? candidates.reduce((a, b) => (facing(b) > facing(a) ? b : a)) : null;
  if (peachtree) for (let j = 0; j < 12; j++) {
    const y = upperRoof - 4 - j * floor;
    s.body.quad(at(peachtree, 0.15, y, 0), at(peachtree, 0.15, y, 1.6), at(peachtree, 0.85, y, 1.6), at(peachtree, 0.85, y, 0), slab);
    panel(peachtree, 0.15, 0.85, y - 0.35, y, 1.6, slab);
  }

  // Low arrival and retail pieces keep their mapped 8 m. No canopy: the photos don't fix where it sits.
  for (const { plan, top } of lowParts) if (plan.length >= 3) s.prism(plan, s.base, top, stone, roof);

  return s.finish('#ffdcae', 0.62);
}
