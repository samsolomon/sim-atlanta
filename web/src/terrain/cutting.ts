import type { GroundYield } from './surface';

type V = readonly number[];
/** One drawn ballast quad: a, b at the previous station (left, right), d, c at the next. */
export type BallastQuad = readonly [a: V, b: V, c: V, d: V];

/**
 * A graded cutting for ground ballast. Where the drawn terrain stands above the ballast
 * (a bank on a 5 m grid reaching over a 4.2 m bed), the terrain is lowered to a formation
 * just under the ballast, with side slopes rising at 1:1.5 for 3 m on each side.
 */
export const CUTTING = { below: 0.05, slope: 1.5, width: 3, tolerance: 0.03, maxGrade: 0.2 } as const;

/**
 * Ground yields that grade the terrain to the ballast formation, as triangles sharing
 * their edges: the bed under each flagged quad, plus a side slope on either side. Carve
 * skirts only edges with no yield beyond them, so a run carves one smooth cutting.
 * `runs` are consecutive quads of one strip; a flagged quad also carves its neighbours,
 * so the cutting eases out over a few metres. Yields are clipped to `inside` (the board
 * less its edge cells, which carve never moves).
 *
 * Only plausible formations are graded: a flag needs the terrain more than `tolerance`
 * above the ballast (the drape lifts the ballast over smaller rises), and a quad steeper
 * than `maxGrade` along the track is a DEM pit or a missing structure, not a cutting.
 */
export function cuttingYields(runs: readonly (readonly BallastQuad[])[], ground: (x: number, z: number) => number | null,
  inside: { minX: number; maxX: number; minZ: number; maxZ: number }): GroundYield[] {
  const beds: V[][] = [], sides: V[][] = [];
  for (const run of runs) {
    const plausible = run.map(q => grade(q) <= CUTTING.maxGrade);
    const flagged = run.map(q => bedded(q, ground));
    for (let i = 0; i < run.length; i++) {
      if (!plausible[i] || !(flagged[i] || flagged[i - 1] || flagged[i + 1])) continue;
      const [a, b, c, d] = run[i].map(floorPoint);
      // The bed, split on the same a-c diagonal as the drawn ballast quad.
      beds.push([a, b, c], [a, c, d]);
      // Side slopes: from each ballast edge outward, away from the other edge.
      const [a2, d2] = [outer(a, b), outer(d, c)], [b2, c2] = [outer(b, a), outer(c, d)];
      sides.push([a, d, d2], [a, d2, a2], [b, b2, c2], [b, c2, c]);
    }
  }
  // Side slopes must not overlap other yields: where two overlap, a face on one side of
  // an edge is split where its neighbour isn't, and lowering opens a slit at that
  // T-junction. A slope that would overlap gives way, and the edge it leaves uncovered
  // gets a skirt. Beds always stay: they hold the terrain under the ballast, and where two
  // overlap (a turnout) their floors nearly agree.
  const kept: V[][] = [], cells = new Map<string, V[][]>();
  const side = new Set(sides);
  const cellsOf = (t: V[]) => {
    const xs = t.map(p => Math.floor(p[0] / 10)), zs = t.map(p => Math.floor(p[2] / 10)), out: string[] = [];
    for (let x = Math.min(...xs); x <= Math.max(...xs); x++) for (let z = Math.min(...zs); z <= Math.max(...zs); z++) out.push(x + ',' + z);
    return out;
  };
  for (const t of [...beds, ...sides]) {
    const keys = cellsOf(t);
    if (side.has(t) && keys.some(k => cells.get(k)?.some(o => overlaps(o, t)))) continue;
    kept.push(t);
    for (const k of keys) cells.set(k, [...cells.get(k) ?? [], t]);
  }
  // Each floor is the plane of its unclipped triangle; a clipped sliver can't define one.
  return kept.map(t => ({ t: clip(t, inside), floor: plane(t) }))
    .filter(({ t }) => t.length >= 3 && area(t) > 1e-4)
    .map(({ t, floor }) => ({ ring: t.map(p => [p[0], p[2]] as const), floor }));
}

const floorPoint = (p: V): V => [p[0], p[1] - CUTTING.below, p[2]];

/** The point a side slope's width outward from edge point p, away from q, risen by its slope. */
function outer(p: V, q: V): V {
  const dx = p[0] - q[0], dz = p[2] - q[2], len = Math.hypot(dx, dz) || 1;
  return [p[0] + dx / len * CUTTING.width, p[1] + CUTTING.width / CUTTING.slope, p[2] + dz / len * CUTTING.width];
}

function area(t: V[]) {
  let a = 0;
  for (let i = 0; i < t.length; i++) { const p = t[i], q = t[(i + 1) % t.length]; a += p[0] * q[2] - q[0] * p[2]; }
  return Math.abs(a) / 2;
}

/** Clip a planar polygon to a rectangle in x and z; y follows the polygon's plane. */
function clip(t: V[], r: { minX: number; maxX: number; minZ: number; maxZ: number }) {
  let poly = t;
  for (const [axis, bound, sign] of [[0, r.minX, 1], [0, r.maxX, -1], [2, r.minZ, 1], [2, r.maxZ, -1]] as const) {
    const out: V[] = [];
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length];
      const dp = sign * (p[axis] - bound), dq = sign * (q[axis] - bound);
      if (dp >= 0) out.push(p);
      if (dp * dq < 0) { const f = dp / (dp - dq); out.push(p.map((v, k) => v + f * (q[k] - v))); }
    }
    poly = out;
    if (poly.length < 3) return poly;
  }
  return poly;
}

/** True where two convex polygons share interior area in plan (separating-axis test). */
function overlaps(a: V[], b: V[]) {
  for (const poly of [a, b]) for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], nx = q[2] - p[2], nz = p[0] - q[0];
    const span = (s: V[]) => s.map(v => nx * v[0] + nz * v[2]);
    const sa = span(a), sb = span(b), eps = 1e-6 * (Math.hypot(nx, nz) || 1);
    if (Math.max(...sa) <= Math.min(...sb) + eps || Math.max(...sb) <= Math.min(...sa) + eps) return false;
  }
  return true;
}

/** Along-track grade of a quad's smoother edge. One edge can drop onto a lower terrain
 * step beside the track (a wall foot) while the other follows the real formation. */
function grade([a, b, c, d]: BallastQuad) {
  const slope = (p: V, q: V) => Math.abs(q[1] - p[1]) / (Math.hypot(q[0] - p[0], q[2] - p[2]) || 1);
  return Math.min(slope(a, d), slope(b, c));
}

/** The plane through a triangle's three points, as a height function. */
function plane(t: V[]) {
  const [p, q, r] = t;
  const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2];
  const vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  return (x: number, z: number) => p[1] - (nx * (x - p[0]) + nz * (z - p[2])) / ny;
}

/** True where a quad gets a cutting bed: a plausible grade, with terrain above it.
 * Exported so those quads skip the drape and stay flat over the carved bed. */
export function bedded(q: BallastQuad, ground: (x: number, z: number) => number | null) {
  return grade(q) <= CUTTING.maxGrade && penetrates(q, ground);
}

/** True where the terrain stands above the ballast top, sampled over the quad's two
 * drawn triangles (split on the a-c diagonal). */
function penetrates([a, b, c, d]: BallastQuad, ground: (x: number, z: number) => number | null) {
  for (const [p, q, r] of [[a, b, c], [a, c, d]]) for (let i = 0; i <= 4; i++) for (let j = 0; i + j <= 4; j++) {
    const u = i / 4, v = j / 4, w = 1 - u - v;
    const at = (k: number) => w * p[k] + u * q[k] + v * r[k];
    const g = ground(at(0), at(2));
    if (g !== null && g > at(1) + CUTTING.tolerance) return true;
  }
  return false;
}
