import * as THREE from 'three';
import { Builder, hashStr, pointInRing, rng, type P2 } from '../vignette/geom';

/**
 * Reusable landscape primitives in City's low-poly, ink-lined style.
 *
 * Every primitive appends to one vertex-coloured `Builder`, so a whole garden
 * is a single draw call; call `landscapeMesh` once at the end. Each takes the
 * ground as a sampler (scene metres) and follows it. `quality: 'low'` halves
 * or drops the small detail.
 *
 * Tiers: positions come from the caller (reported or inferred); the planting,
 * materials and seasonal colour drawn here are illustrative.
 *
 *   const b = new Builder();
 *   flowerBed(b, ring, ground, { doy, quality });
 *   hedge(b, line, ground, { height: 1.1 });
 *   stairRun(b, [x0, z0], [x1, z1], 3, ground);
 *   const garden = landscapeMesh(b);   // { mesh, triangles, draws: 1 }
 */
export type Ground = (x: number, z: number) => number | null;
export type Quality = 'high' | 'low';

const STONE = '#a29c90', CAP = '#bdb7ab', CURB = '#b6b0a4';
const LEAF = ['#4d6b3a', '#5b7a44', '#45613a', '#628048'];
const CLIPPED = '#4a6838';

/** Atlanta's garden seasons by day of year, shared by beds and ornamentals. */
export function season(doy: number): 'spring' | 'summer' | 'fall' | 'winter' {
  return doy >= 60 && doy < 140 ? 'spring' : doy >= 140 && doy < 260 ? 'summer' : doy >= 260 && doy < 335 ? 'fall' : 'winter';
}

/** Seasonal flower colours for a day of year (Atlanta: tulips and pansies in spring, annuals in summer, mums in fall). */
export function bloom(doy: number): string[] {
  const s = season(doy);
  if (s === 'spring') return ['#f2d24b', '#e4566b', '#f5f0e6', '#9b6ad0', '#f08a3c'];
  if (s === 'summer') return ['#e8483f', '#f7a33b', '#fbe7f0', '#d4457f', '#ffd84a'];
  if (s === 'fall') return ['#d9822b', '#b33d2e', '#e8c547', '#8a3d6b'];
  return ['#6c7d5a', '#8f8a6c', '#d9d2bd'];   // winter: pansies and cabbages read as muted
}

function along(line: P2[], step: number) {
  const out: { x: number; z: number; nx: number; nz: number }[] = [];
  const segs = line.slice(1).map((c, i) => {
    const a = line[i], len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    return { a, c, len, nx: len ? -(c[1] - a[1]) / len : 0, nz: len ? (c[0] - a[0]) / len : 0 };
  }).filter(s => s.len > 1e-6);
  // Interior corners take a mitred normal, so curbs and hedges turn without twisting.
  const mitre = (p: typeof segs[number], q: typeof segs[number]) => {
    let mx = p.nx + q.nx, mz = p.nz + q.nz;
    const m = Math.hypot(mx, mz) || 1;
    mx /= m; mz /= m;
    const k = 1 / Math.max(.3, mx * q.nx + mz * q.nz);
    return { nx: mx * k, nz: mz * k };
  };
  segs.forEach((s, i) => {
    const n = Math.max(1, Math.ceil(s.len / step));
    for (let k = i === 0 ? 0 : 1; k <= n; k++) out.push({ x: s.a[0] + (s.c[0] - s.a[0]) * k / n, z: s.a[1] + (s.c[1] - s.a[1]) * k / n, nx: s.nx, nz: s.nz });
    if (i + 1 < segs.length) Object.assign(out[out.length - 1], mitre(s, segs[i + 1]));
  });
  // A closed ring mitres its start and end too.
  const first = segs[0], last = segs[segs.length - 1];
  if (segs.length > 1 && Math.hypot(first.a[0] - last.c[0], first.a[1] - last.c[1]) < 1e-6) {
    const m = mitre(last, first);
    Object.assign(out[0], m);
    Object.assign(out[out.length - 1], m);
  }
  return out;
}

/** A wall-like strip along a polyline: bottom from `bottom(x,z)`, top from `top(x,z)`, `width` thick, capped. */
function strip(b: Builder, line: P2[], width: number, bottom: (x: number, z: number) => number, top: (x: number, z: number) => number,
  color: string, cap: string, step: number) {
  const pts = along(line, step);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], q = pts[i], h = width / 2;
    const l0 = [p.x + p.nx * h, p.z + p.nz * h], r0 = [p.x - p.nx * h, p.z - p.nz * h];
    const l1 = [q.x + q.nx * h, q.z + q.nz * h], r1 = [q.x - q.nx * h, q.z - q.nz * h];
    const [b0, b1, t0, t1] = [bottom(p.x, p.z), bottom(q.x, q.z), top(p.x, p.z), top(q.x, q.z)];
    b.quad([l0[0], b0, l0[1]], [l1[0], b1, l1[1]], [l1[0], t1, l1[1]], [l0[0], t0, l0[1]], color);
    b.quad([r1[0], b1, r1[1]], [r0[0], b0, r0[1]], [r0[0], t0, r0[1]], [r1[0], t1, r1[1]], color);
    b.quad([l0[0], t0, l0[1]], [l1[0], t1, l1[1]], [r1[0], t1, r1[1]], [r0[0], t0, r0[1]], cap);
  }
}

/** Low faceted clump (octahedron): shrubs, flower drifts and ornamental tufts. */
// Kept for the octahedron look of City's tree canopies, should a caller want it.
export function clump(b: Builder, x: number, y: number, z: number, r: number, h: number, color: string, twist = 0) {
  const c = Math.cos(twist), s = Math.sin(twist);
  const ring: number[][] = [[r, 0], [0, r], [-r, 0], [0, -r]].map(([u, v]) => [x + u * c - v * s, y + h * .4, z + u * s + v * c]);
  const top = [x, y + h, z], bot = [x, y, z];
  for (let i = 0; i < 4; i++) {
    const a = ring[i], d = ring[(i + 1) % 4];
    b.tri(a, d, top, color);
    b.tri(d, a, bot, color);
  }
}

/** Vary a colour per vertex or face for a crumbly, leafy speckle that survives the ink pass. */
function speckle(color: string, r: () => number, amount: number) {
  const c = new THREE.Color(color), k = 1 + (r() - .5) * 2 * amount;
  return '#' + c.multiplyScalar(k).getHexString();
}

/**
 * A tuft of blades rooted at one point, as in the trail-planting study: each blade is
 * one triangle with two fixed feet on the ground, leaning outward, heights varied.
 */
function tuft(b: Builder, x: number, y: number, z: number, height: number, blades: number, color: string, r: () => number) {
  for (let i = 0; i < blades; i++) {
    const a = (i + r() * .6) / blades * Math.PI * 2, lean = .25 + r() * .35, h = height * (.65 + r() * .5);
    const fx = Math.cos(a), fz = Math.sin(a), w = .035;
    b.tri([x - fz * w, y - .02, z + fx * w], [x + fz * w, y - .02, z - fx * w],
      [x + fx * h * lean, y + h, z + fz * h * lean], speckle(color, r, .12));
  }
}

/** Small blooms: crossed petal pairs clustered above a foliage tuft. */
function blooms(b: Builder, x: number, y: number, z: number, count: number, color: string, r: () => number) {
  for (let i = 0; i < count; i++) {
    const bx = x + (r() - .5) * .3, bz = z + (r() - .5) * .3, by = y + r() * .12, s = .12 + r() * .07;
    const c = speckle(color, r, .1);
    b.tri([bx - s, by, bz], [bx + s, by, bz], [bx, by + s * 1.2, bz + s * .3], c);
    b.tri([bx, by, bz - s], [bx, by, bz + s], [bx + s * .3, by + s * 1.2, bz], c);
  }
}

// One shared unit icosahedron (already non-indexed) for every shrub lump.
const ICOSA = new THREE.IcosahedronGeometry(1, 0);

/** A rounded shrub mass: a few jittered icosahedra with leafy per-face colour. */
function shrubMass(b: Builder, x: number, y: number, z: number, radius: number, height: number, color: string, r: () => number, lumps: number) {
  for (let k = 0; k < lumps; k++) {
    const a = r() * Math.PI * 2, d = k ? radius * (.35 + r() * .3) : 0;
    const rad = radius * (k ? .6 + r() * .25 : .85), cx = x + Math.cos(a) * d, cz = z + Math.sin(a) * d;
    const pos = ICOSA.getAttribute('position');
    // Jitter shared corners identically, so faces stay closed.
    const jitter = (vx: number, vy: number, vz: number) => {
      const h = Math.sin(vx * 12.9 + vy * 78.2 + vz * 37.7 + k * 9.1) * 43758.5;
      return 1 + (h - Math.floor(h) - .5) * .28;
    };
    for (let i = 0; i < pos.count; i += 3) {
      const c = speckle(color, r, .14), tri: number[][] = [];
      for (let v = i; v < i + 3; v++) {
        const j = jitter(pos.getX(v), pos.getY(v), pos.getZ(v));
        // Flatten the underside so masses sit on the ground.
        const vy = Math.max(-.35, pos.getY(v));
        tri.push([cx + pos.getX(v) * rad * j, y + (vy + .35) * height / 1.35 * (k ? .8 : 1), cz + pos.getZ(v) * rad * j]);
      }
      b.tri(tri[0], tri[1], tri[2], c);
    }
  }
}

/**
 * Drapes a ring on the ground: its triangulation, each triangle subdivided to about `cell`
 * metres, with a height sampled at every vertex. The edge is exactly the ring, and the surface
 * follows any slope, which a flat outline fill or a cell grid alone does not.
 */
export function drapeRing(ring: P2[], cell: number, y: (x: number, z: number) => number, emit: (a: number[], b: number[], c: number[]) => void, holes: P2[][] = []) {
  // Holes (mounds, paths, pads) are cut by the triangulation itself; indices run over ring then holes.
  const all = [...ring, ...holes.flat()];
  const v2 = (r: P2[]) => r.map(([x, z]) => new THREE.Vector2(x, z));
  for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(v2(ring), holes.map(v2))) {
    const A = all[i], B = all[k], C = all[j];
    const n = Math.max(1, Math.ceil(Math.max(Math.hypot(B[0] - A[0], B[1] - A[1]), Math.hypot(C[0] - B[0], C[1] - B[1]), Math.hypot(A[0] - C[0], A[1] - C[1])) / cell));
    const at = (u: number, v: number) => {
      const x = A[0] + (B[0] - A[0]) * u / n + (C[0] - A[0]) * v / n, z = A[1] + (B[1] - A[1]) * u / n + (C[1] - A[1]) * v / n;
      return [x, y(x, z), z];
    };
    for (let u = 0; u < n; u++) for (let v = 0; v < n - u; v++) {
      emit(at(u, v), at(u + 1, v), at(u, v + 1));
      if (u + v + 1 < n) emit(at(u + 1, v), at(u + 1, v + 1), at(u, v + 1));
    }
  }
}

// Off-board or in a hole, a sampler returns null. Reuse its last valid height rather than 0,
// which in City's frame can be 30 m away from the real ground.
const lastValid = new WeakMap<Ground, number>();
export const g0 = (ground: Ground, x: number, z: number) => {
  const y = ground(x, z);
  if (y !== null) { lastValid.set(ground, y); return y; }
  return lastValid.get(ground) ?? 0;
};

/**
 * Planting bed: dark, crumbly soil, slightly mounded (`mound`, 0.12 m by default), behind a
 * clean spade-cut edge (or a stone curb with `edge: 'stone'` or a `curb` height), filled with
 * blade tufts topped by blooms in drifts of two or three of the season's colours.
 */
export function flowerBed(b: Builder, ring: P2[], ground: Ground,
  o: { doy: number; quality?: Quality; curb?: number; density?: number; seed?: string; mound?: number; flowers?: number; edge?: 'spade' | 'stone' }) {
  const quality = o.quality ?? 'high', density = (o.density ?? 1) * (quality === 'low' ? .45 : 1);
  const r = rng(hashStr(o.seed ?? ring.map(p => p.join(',')).join(';')));
  // Rich dark soil, slightly mounded (0.12 m by default), with a clean spade-cut edge where
  // the turf meets it, or a stone curb when asked.
  const lift = .06, edge = o.edge ?? (o.curb ? 'stone' : 'spade');
  const cx = ring.reduce((a, p) => a + p[0], 0) / ring.length, cz = ring.reduce((a, p) => a + p[1], 0) / ring.length;
  const reach = Math.max(...ring.map(p => Math.hypot(p[0] - cx, p[1] - cz)));
  const dome = (x: number, z: number) => (o.mound ?? .12) * Math.max(0, 1 - (Math.hypot(x - cx, z - cz) / reach) ** 2);
  const surface = (x: number, z: number) => g0(ground, x, z) + lift + dome(x, z);
  if (edge === 'stone') strip(b, [...ring, ring[0]], .15, (x, z) => g0(ground, x, z) - .1, (x, z) => g0(ground, x, z) + (o.curb ?? .15), CURB, CURB, quality === 'low' ? 4 : 2);
  else {
    const rim = along([...ring, ring[0]], quality === 'low' ? 2 : 1);
    for (let i = 1; i < rim.length; i++) {
      const a = rim[i - 1], c = rim[i];
      b.quad([a.x, g0(ground, a.x, a.z) - .03, a.z], [c.x, g0(ground, c.x, c.z) - .03, c.z], [c.x, surface(c.x, c.z), c.z], [a.x, surface(a.x, a.z), a.z], '#3a2d24');
    }
  }
  // Dark beds, but dark brown rather than black: they never weigh heavily on the board.
  const SOIL = ['#4a3a2e', '#523f31', '#45362b', '#574535'];
  const xs = ring.map(p => p[0]), zs = ring.map(p => p[1]);
  // Crumbly dark soil draped exactly to the bed's outline, speckled per triangle.
  drapeRing(ring, quality === 'low' ? 1.2 : .5, surface, (p, q, w) => b.tri(p, q, w, speckle(SOIL[Math.floor(r() * 4)], r, .1)));
  // Drifts of two or three colours, not confetti: a seeded axis splits the bed into bands.
  const palette = bloom(o.doy), n = 2 + Math.floor(r() * 2), start = Math.floor(r() * palette.length);
  const drift = Array.from({ length: n }, (_, k) => palette[(start + k) % palette.length]);
  const axis = r() * Math.PI, ax = Math.cos(axis), az = Math.sin(axis);
  const span = reach * 2, area = Math.abs(ring.reduce((a, p, i) => { const q = ring[(i + 1) % ring.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
  const count = Math.round(area * 2.2 * density), share = o.flowers ?? .75;
  for (let i = 0, tries = 0; i < count && tries < count * 6; tries++) {
    const x = Math.min(...xs) + r() * (Math.max(...xs) - Math.min(...xs)), z = Math.min(...zs) + r() * (Math.max(...zs) - Math.min(...zs));
    if (!pointInRing(x, z, ring)) continue;
    i++;
    const y = surface(x, z), t = ((x - cx) * ax + (z - cz) * az) / span + .5 + (r() - .5) * .12;
    const leaf = LEAF[Math.floor(r() * LEAF.length)];
    const tall = .35 + r() * .25;
    tuft(b, x, y, z, tall, quality === 'low' ? 3 : 6, leaf, r);
    if (r() < share) blooms(b, x, y + tall * .8, z, quality === 'low' ? 2 : 3, drift[Math.min(n - 1, Math.max(0, Math.floor(t * n)))], r);
  }
}

/** Clipped hedge (a squared box run that follows the ground) or a loose shrub row. */
export function hedge(b: Builder, line: P2[], ground: Ground, o: { height?: number; width?: number; clipped?: boolean; quality?: Quality; seed?: string } = {}) {
  const height = o.height ?? 1.1, width = o.width ?? .8, quality = o.quality ?? 'high';
  const r = rng(hashStr(o.seed ?? line.map(p => p.join(',')).join(';')));
  if (o.clipped ?? true) {
    // Clipped box with a soft, slightly irregular top: sides, chamfered shoulders and a crown.
    const pts = along(line, quality === 'low' ? 2 : 1), hw = width / 2, sh = Math.min(.18, height * .2, width * .4);
    const tops = pts.map(() => (r() - .5) * .08);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], q = pts[i];
      const at = (pt: typeof p, side: number, y: number) => [pt.x + pt.nx * side, y, pt.z + pt.nz * side];
      const gp = g0(ground, p.x, p.z), gq = g0(ground, q.x, q.z), hp = gp + height + tops[i - 1], hq = gq + height + tops[i];
      for (const side of [1, -1]) {
        b.quad(at(p, side * hw, gp - .05), at(q, side * hw, gq - .05), at(q, side * hw, hq - sh), at(p, side * hw, hp - sh), speckle(CLIPPED, r, .1));
        b.quad(at(p, side * hw, hp - sh), at(q, side * hw, hq - sh), at(q, side * (hw - sh), hq), at(p, side * (hw - sh), hp), speckle('#557a40', r, .1));
      }
      b.quad(at(p, hw - sh, hp), at(q, hw - sh, hq), at(q, -(hw - sh), hq), at(p, -(hw - sh), hp), speckle('#5d8446', r, .12));
    }
    return;
  }
  for (const p of along(line, quality === 'low' ? 1.6 : 1)) {
    const rad = width * (.6 + r() * .3), x = p.x + (r() - .5) * .3, z = p.z + (r() - .5) * .3;
    shrubMass(b, x, g0(ground, p.x, p.z) - .05, z, rad, height * (.85 + r() * .3), LEAF[Math.floor(r() * LEAF.length)], r, quality === 'low' ? 1 : 3);
  }
}

/** Retaining edge: holds the higher grade, with its cap `reveal` above the high side. */
export function retainingEdge(b: Builder, line: P2[], ground: Ground, o: { reveal?: number; width?: number; quality?: Quality } = {}) {
  const width = o.width ?? .35, reveal = o.reveal ?? .3;
  // Sample both faces and stand the wall from the low side to the high side plus the reveal.
  const pts = along(line, o.quality === 'low' ? 3 : 1);
  const at = (x: number, z: number) => {
    const p = pts.reduce((best, q) => Math.hypot(q.x - x, q.z - z) < Math.hypot(best.x - x, best.z - z) ? q : best, pts[0]);
    const a = g0(ground, x + p.nx * 1.2, z + p.nz * 1.2), c = g0(ground, x - p.nx * 1.2, z - p.nz * 1.2);
    return [Math.min(a, c, g0(ground, x, z)), Math.max(a, c, g0(ground, x, z))];
  };
  strip(b, line, width, (x, z) => at(x, z)[0] - .25, (x, z) => at(x, z)[1] + reveal, STONE, CAP, o.quality === 'low' ? 3 : 1);
}

/** Seat wall: a level-topped bench wall, about 0.45 m above the ground at its high end. */
export function seatWall(b: Builder, line: P2[], ground: Ground, o: { height?: number; width?: number; quality?: Quality } = {}) {
  const height = o.height ?? .45, width = o.width ?? .45;
  const top = Math.max(...along(line, 1).map(p => g0(ground, p.x, p.z))) + height;
  strip(b, line, width, (x, z) => g0(ground, x, z) - .2, () => top, STONE, CAP, o.quality === 'low' ? 4 : 2);
}

/**
 * Stair run between two points, with treads at `riser` spacing from the
 * ground at the bottom to the ground at the top, and cheek walls.
 */
export function stairRun(b: Builder, from: P2, to: P2, width: number, ground: Ground,
  o: { riser?: number; cheeks?: boolean; fromY?: number; toY?: number } = {}) {
  // Elevations default to the ground at each end; pass fromY/toY (scene metres) for surveyed landings.
  if (Math.hypot(to[0] - from[0], to[1] - from[1]) < 1e-6 || !(width > 0)) return;
  const y0 = o.fromY ?? g0(ground, ...from), y1 = o.toY ?? g0(ground, ...to);
  const [lo, hi, a, c] = y0 <= y1 ? [y0, y1, from, to] : [y1, y0, to, from];
  const steps = Math.min(400, Math.max(1, Math.round((hi - lo) / Math.max(.05, o.riser ?? .16))));
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]), ux = (c[0] - a[0]) / len, uz = (c[1] - a[1]) / len, nx = -uz, nz = ux;
  const go = len / steps, rise = (hi - lo) / steps, h = width / 2;
  for (let k = 0; k < steps; k++) {
    const s0 = k * go, s1 = (k + 1) * go, top = lo + (k + 1) * rise;
    const p = (s: number, side: number, y: number) => [a[0] + ux * s + nx * side, y, a[1] + uz * s + nz * side];
    b.quad(p(s0, -h, top), p(s1, -h, top), p(s1, h, top), p(s0, h, top), CAP);
    b.quad(p(s0, h, lo - .1), p(s0, -h, lo - .1), p(s0, -h, top), p(s0, h, top), STONE);
    for (const side of [-h, h]) b.quad(p(s0, side, lo - .1), p(s1, side, lo - .1), p(s1, side, top), p(s0, side, top), STONE);
  }
  if (o.cheeks ?? true) for (const side of [-1, 1]) {
    const edge: P2[] = [[a[0] + nx * side * (h + .2), a[1] + nz * side * (h + .2)], [c[0] + nx * side * (h + .2), c[1] + nz * side * (h + .2)]];
    strip(b, edge, .3, (x, z) => Math.min(g0(ground, x, z), lo) - .2,
      (x, z) => { const t = Math.max(0, Math.min(1, ((x - a[0]) * ux + (z - a[1]) * uz) / len)); return lo + (hi - lo) * t + .35; }, STONE, CAP, 1);
  }
}

/**
 * Stepped terraces down a slope: level platforms between `from` and `to`, each
 * held by a retaining edge, with an optional planted strip along each riser.
 */
export function terraces(b: Builder, from: P2, to: P2, width: number, levels: number, ground: Ground,
  o: { doy?: number; quality?: Quality; surface?: string; fromY?: number; toY?: number } = {}) {
  levels = Math.floor(levels);
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  if (levels < 1 || len < 1e-6 || !(width > 0)) return;
  const ux = (to[0] - from[0]) / len, uz = (to[1] - from[1]) / len, nx = -uz, nz = ux, h = width / 2;
  const pt = (s: number, side: number): P2 => [from[0] + ux * s + nx * side, from[1] + uz * s + nz * side];
  const cut = (k: number) => len * k / levels;
  // Highest ground under a level, sampled on a 1 m grid so nothing pokes through.
  const highest = (k: number) => {
    let top = -Infinity;
    const ns = Math.max(2, Math.ceil((cut(k + 1) - cut(k)))), nw = Math.max(2, Math.ceil(width));
    for (let i = 0; i <= ns; i++) for (let j = 0; j <= nw; j++)
      top = Math.max(top, g0(ground, ...pt(cut(k) + (cut(k + 1) - cut(k)) * i / ns, -h + width * j / nw)));
    return top + .05;
  };
  // With fromY and/or toY the levels step evenly between the surveyed elevations
  // (a missing end takes its level's own ground); otherwise each sits on its highest ground.
  const surveyed = o.fromY !== undefined || o.toY !== undefined;
  const first = o.fromY ?? highest(0), last = o.toY ?? highest(levels - 1);
  const ys = Array.from({ length: levels }, (_, k) => surveyed
    ? first + (last - first) * (levels === 1 ? 0 : k / (levels - 1)) : highest(k));
  for (let k = 0; k < levels; k++) {
    const y = ys[k], q = [pt(cut(k), -h), pt(cut(k + 1), -h), pt(cut(k + 1), h), pt(cut(k), h)].map(([x, z]) => [x, y, z]);
    b.quad(q[0], q[3], q[2], q[1], o.surface ?? '#8aa266');
    for (const side of [-h, h]) strip(b, [pt(cut(k), side), pt(cut(k + 1), side)], .3, (x, z) => Math.min(g0(ground, x, z), y) - .25, () => y + .2, STONE, CAP, 2);
    if (o.doy !== undefined) flowerBed(b, [pt(cut(k) + .5, -h + .5), pt(cut(k) + 1.5, -h + .5), pt(cut(k) + 1.5, h - .5), pt(cut(k) + .5, h - .5)],
      () => y, { doy: o.doy, quality: o.quality, curb: .12, seed: `terrace${k}` });
  }
  // Risers at every boundary stand from the lower neighbour to the higher, capped.
  for (let k = 0; k <= levels; k++) {
    const line = [pt(cut(k), -h - .15), pt(cut(k), h + .15)];
    const near = [ys[k - 1], ys[k]].filter((v): v is number => v !== undefined);
    const top = Math.max(...near) + .2;
    strip(b, line, .35, (x, z) => Math.min(g0(ground, x, z), ...near) - .25, () => top, STONE, CAP, 2);
  }
}

/** A small cluster of specimen ornamentals (multi-stem shrubs and grasses, not trees): seasonal tint, seeded layout. */
export function ornamentals(b: Builder, centre: P2, radius: number, ground: Ground, o: { doy: number; count?: number; quality?: Quality; seed?: string }) {
  const r = rng(hashStr(o.seed ?? centre.join(','))), n = Math.max(2, Math.round((o.count ?? 7) * (o.quality === 'low' ? .5 : 1)));
  const fall = season(o.doy) === 'fall', winter = season(o.doy) === 'winter';
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = radius * Math.sqrt(r()), x = centre[0] + Math.cos(a) * d, z = centre[1] + Math.sin(a) * d, y = g0(ground, x, z);
    const grass = r() < .4, size = grass ? .5 + r() * .3 : .7 + r() * .6;
    const tone = grass ? (winter ? '#b9a57a' : fall ? '#c9a95a' : '#8fa36a') : winter ? '#6d6450' : fall ? ['#b8452f', '#d0782f', '#9c3b3b'][Math.floor(r() * 3)] : LEAF[Math.floor(r() * 4)];
    // Ornamental grasses are tall blade fountains; shrubs are rounded masses on the turf.
    if (grass) tuft(b, x, y, z, size * 1.5, o.quality === 'low' ? 5 : 9, tone, r);
    else shrubMass(b, x, y - .05, z, size, size * 1.2, tone, r, o.quality === 'low' ? 1 : 3);
  }
}

/** One vertex-coloured mesh for everything appended: one draw call. */
export function landscapeMesh(b: Builder) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, flatShading: true }));
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.name = 'landscape';
  return { mesh, triangles: b.pos.length / 9, draws: 1, dispose() { geometry.dispose(); (mesh.material as THREE.Material).dispose(); } };
}
