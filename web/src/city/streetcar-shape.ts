/**
 * The Atlanta Streetcar's drawn shape: the GTFS path with its street corners filleted.
 *
 * GTFS turns 60-120 degrees at a single vertex at each downtown corner, so rails cornered hard and
 * the articulated S70 folded into an L across the intersection (its tail entered a building at
 * (289,-63)). Each corner here becomes a circular arc of STREETCAR_RADIUS. The rails
 * (streetcarLines), the cars (streetcarPaths) and every consumer of either read this one
 * shape, built once per path and shared.
 *
 * Inferred geometry on a scheduled-tier shape: the radius is the S70's 18 m option, and the
 * built Overture tram corners measure 17-30 m. The timetable distance `cum` is interpolated onto
 * the new points, so a stop or a trip's GTFS `s` keeps its meaning. The 2D map, Schedule and data
 * contract keep the raw GTFS shape.
 */
import { lonLatToScene } from '../core/places';
import type { RoutesFile } from '../model/types';
import type { P2 } from '../vignette/geom';

/** Siemens Atlanta S70 data sheet: 82 ft (25 m) standard, 59 ft (18 m) optional minimum radius. */
export const STREETCAR_RADIUS = 18;
/** Turns gentler than this keep their vertex. */
const MIN_TURN = (6 * Math.PI) / 180;
/** A corner may absorb up to this many consecutive GTFS vertices into one compound turn. */
const MAX_GROUP = 4;
/** Arc sample spacing (m). */
const ARC_STEP = 1.5;

export interface FilletCorner {
  /** The legs' intersection, where GTFS turned. */
  at: P2;
  /** Turn angle, radians. */
  turn: number;
  /** Radius used (STREETCAR_RADIUS unless the legs were too short). */
  radius: number;
  /** Arc midpoint's distance inside `at`. */
  shift: number;
}

type Origin = { lon: number; lat: number };

const unit = (a: P2, b: P2): P2 => {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    l = Math.hypot(dx, dz) || 1;
  return [dx / l, dz / l];
};
const dot = (a: P2, b: P2) => a[0] * b[0] + a[1] * b[1];
const sub = (a: P2, b: P2): P2 => [a[0] - b[0], a[1] - b[1]];
const signedTurn = (u: P2, v: P2) => Math.atan2(u[0] * v[1] - u[1] * v[0], dot(u, v));

/**
 * Fillet every corner of a polyline at `radius`, carrying the per-vertex distance `cum` onto the
 * new points. A corner whose legs are too short to hold the arc grows into a compound turn over
 * its neighbouring vertices (up to MAX_GROUP), and only then takes a smaller radius.
 */
export function filletShape(raw: readonly P2[], rawCum: readonly number[], radius = STREETCAR_RADIUS) {
  // Drop repeated vertices, which have no direction.
  const pts: P2[] = [],
    cum: number[] = [];
  raw.forEach((p, i) => {
    const q = pts[pts.length - 1];
    if (q && Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.01) return;
    pts.push([p[0], p[1]]);
    cum.push(rawCum[i]);
  });
  const n = pts.length;
  const U = [0];
  for (let i = 1; i < n; i++) U.push(U[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const turnAt = (i: number) => (i <= 0 || i >= n - 1 ? 0 : Math.abs(signedTurn(unit(pts[i - 1], pts[i]), unit(pts[i], pts[i + 1]))));

  const outPts: P2[] = [],
    outU: number[] = [];
  const corners: FilletCorner[] = [];
  const emit = (p: P2, u: number) => {
    outPts.push(p);
    outU.push(Math.max(u, outU.length ? outU[outU.length - 1] : -Infinity));
  };
  emit(pts[0], 0);
  // The previous corner: where its arc left the leg it may share with the next corner, and how to
  // undo it when the next corner needs that leg (the two merge into one compound turn).
  type Done = { a: number; b: number; out: P2; mark: number; before: Done | null };
  let prev: Done | null = null;
  let i = 1;
  while (i < n - 1) {
    if (turnAt(i) < MIN_TURN) {
      emit(pts[i], U[i]);
      i++;
      continue;
    }
    let a = i,
      b = i,
      undo: Done | null = null,
      fit: { C: P2; inDir: P2; outDir: P2; turn: number; T: number; r: number } | null = null;
    for (;;) {
      const inDir = unit(pts[a - 1], pts[a]),
        outDir = unit(pts[b], pts[b + 1]);
      const turn = signedTurn(inDir, outDir);
      if (Math.abs(turn) < MIN_TURN || Math.abs(turn) > Math.PI * 0.95) break;
      // Intersection of the incoming leg line and the outgoing leg line.
      const d = sub(pts[b], pts[a]),
        cross = inDir[0] * outDir[1] - inDir[1] * outDir[0];
      const t = (d[0] * outDir[1] - d[1] * outDir[0]) / cross;
      const C: P2 = [pts[a][0] + inDir[0] * t, pts[a][1] + inDir[1] * t];
      const before: Done | null = undo ? undo.before : prev;
      const legStart = before && before.b === a - 1 ? before.out : pts[a - 1];
      const availIn = dot(sub(C, legStart), inDir);
      const nextIsCorner = b + 1 < n - 1 && turnAt(b + 1) >= MIN_TURN;
      const availOut = dot(sub(pts[b + 1], C), outDir) * (nextIsCorner ? 0.5 : 1);
      const need = radius * Math.tan(Math.abs(turn) / 2);
      if (need <= availIn && need <= availOut) {
        fit = { C, inDir, outDir, turn, T: need, r: radius };
        break;
      }
      if (b - a + 1 < MAX_GROUP && b + 2 < n && availOut < need) {
        b++;
        continue;
      }
      if (b - a + 1 < MAX_GROUP && a - 1 > (before ? before.b + 1 : 0) && availIn < need) {
        a--;
        continue;
      }
      // The previous corner holds the incoming leg: fold it into this one, a single compound turn.
      if (availIn < need && before && before.b === a - 1 && b - before.a + 1 <= MAX_GROUP + 1) {
        undo = before;
        a = before.a;
        continue;
      }
      const T = Math.max(0, Math.min(availIn, availOut));
      if (T > 0.5) fit = { C, inDir, outDir, turn, T, r: T / Math.tan(Math.abs(turn) / 2) };
      break;
    }
    if (!fit) {
      emit(pts[i], U[i]);
      i++;
      continue;
    }
    // A merged previous corner is withdrawn, then its vertices are re-covered by this one.
    if (undo) {
      outPts.length = undo.mark;
      outU.length = undo.mark;
      corners.pop();
      prev = undo.before;
    }
    // A backward extension re-covers vertices already emitted: drop them.
    while (outPts.length > 1 && outU[outU.length - 1] >= U[a] - 1e-9) {
      outPts.pop();
      outU.pop();
    }
    const { C, inDir, outDir, turn, T, r } = fit;
    const tIn: P2 = [C[0] - inDir[0] * T, C[1] - inDir[1] * T];
    const tOut: P2 = [C[0] + outDir[0] * T, C[1] + outDir[1] * T];
    const uIn = Math.min(U[a - 1] + dot(sub(tIn, pts[a - 1]), inDir), U[a]);
    const uOut = Math.max(U[b + 1] - dot(sub(pts[b + 1], tOut), outDir), U[b], uIn);
    // Arc centre: perpendicular to the incoming leg, toward the turn.
    const side = Math.sign(turn);
    const centre: P2 = [tIn[0] - inDir[1] * r * side, tIn[1] + inDir[0] * r * side];
    const a0 = Math.atan2(tIn[1] - centre[1], tIn[0] - centre[0]);
    const steps = Math.max(2, Math.ceil((r * Math.abs(turn)) / ARC_STEP));
    const mark = outPts.length;
    emit(tIn, uIn);
    for (let k = 1; k < steps; k++) {
      const f = k / steps,
        ang = a0 + turn * f;
      emit([centre[0] + r * Math.cos(ang), centre[1] + r * Math.sin(ang)], uIn + (uOut - uIn) * f);
    }
    emit(tOut, uOut);
    corners.push({ at: C, turn: Math.abs(turn), radius: r, shift: r / Math.cos(Math.abs(turn) / 2) - r });
    prev = { a, b, out: tOut, mark, before: prev };
    i = b + 1;
  }
  emit(pts[n - 1], U[n - 1]);

  // GTFS distance at each new point, interpolated along the original polyline.
  const outCum = outU.map((u) => {
    let k = 0;
    while (k < n - 2 && U[k + 1] < u) k++;
    const span = U[k + 1] - U[k];
    const f = span > 0 ? Math.min(1, Math.max(0, (u - U[k]) / span)) : 0;
    return cum[k] + f * (cum[k + 1] - cum[k]);
  });
  return { pts: outPts, cum: outCum, corners };
}

export interface StreetcarShape {
  id: string;
  pts: P2[];
  cum: number[];
  corners: FilletCorner[];
}

const memo = new WeakMap<object, Map<string, StreetcarShape[]>>();

/** Every streetcar path's filleted scene shape, built once per routes file and origin and shared. */
export function streetcarShapes(rf: Pick<RoutesFile, 'paths'>, origin: Origin, route: string): StreetcarShape[] {
  const byOrigin = memo.get(rf.paths) ?? memo.set(rf.paths, new Map()).get(rf.paths)!;
  const key = `${route}@${origin.lon},${origin.lat}`;
  const hit = byOrigin.get(key);
  if (hit) return hit;
  const shapes = rf.paths
    .filter((p) => p.routeId === route)
    .map((p) => {
      const raw: P2[] = [];
      for (let i = 0; i + 1 < p.coords.length; i += 2) raw.push(lonLatToScene(origin, p.coords[i], p.coords[i + 1]));
      return { id: p.id, ...filletShape(raw, p.cum) };
    });
  for (const shape of shapes) for (const end of ['start', 'end'] as const) joinEnd(shape, end, shapes);
  byOrigin.set(key, shapes);
  return shapes;
}

const nearestOn = (pts: readonly P2[], x: number, z: number) => {
  let best = { d: Infinity, k: 0 };
  for (let k = 1; k < pts.length; k++) {
    const [ax, az] = pts[k - 1],
      [bx, bz] = pts[k];
    const dx = bx - ax,
      dz = bz - az,
      t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    const d = Math.hypot(x - ax - t * dx, z - az - t * dz);
    if (d < best.d) best = { d, k };
  }
  return best;
};

/**
 * A path that ends at a corner another path turns through (the loop's seam at Centennial Olympic
 * Park) can't fillet its own last vertex. Its end instead follows the other path's arc, from where
 * the two meet to the arc's closest approach to the raw corner, so its last cars stay on the rails.
 */
function joinEnd(shape: StreetcarShape, end: 'start' | 'end', shapes: readonly StreetcarShape[]) {
  const pts = end === 'end' ? shape.pts : [...shape.pts].reverse();
  const cum = end === 'end' ? shape.cum : [...shape.cum].reverse();
  const tip = pts[pts.length - 1];
  for (const other of shapes) {
    if (other === shape || !other.corners.some((c) => Math.hypot(c.at[0] - tip[0], c.at[1] - tip[1]) < 1)) continue;
    if (nearestOn(other.pts, tip[0], tip[1]).d < 0.3) continue;
    // Walk back to where this path rejoins the other's drawn line.
    let k = pts.length - 1;
    while (k > 0 && nearestOn(other.pts, pts[k][0], pts[k][1]).d > 0.3) k--;
    if (k === 0 || Math.hypot(pts[k][0] - tip[0], pts[k][1] - tip[1]) > 40) continue;
    const from = nearestOn(other.pts, pts[k][0], pts[k][1]).k,
      to = nearestOn(other.pts, tip[0], tip[1]).k;
    const step = from <= to ? 1 : -1;
    // From this path's own point where they meet, along the other's line to the closest approach.
    const tail: P2[] = [pts[k]];
    for (let j = from; j !== to + step; j += step) {
      const q = other.pts[j], last = tail[tail.length - 1];
      if (Math.hypot(q[0] - last[0], q[1] - last[1]) > 0.01) tail.push(q);
    }
    if (tail.length < 2) continue;
    const kept = pts.slice(0, k + 1).concat(tail.slice(1));
    // Spread the dropped stretch's GTFS distance over the spliced tail by length.
    const lens = [0];
    for (let j = 1; j < tail.length; j++) lens.push(lens[j - 1] + Math.hypot(tail[j][0] - tail[j - 1][0], tail[j][1] - tail[j - 1][1]));
    const c0 = cum[k],
      c1 = cum[cum.length - 1],
      total = lens[lens.length - 1] || 1;
    const keptCum = cum.slice(0, k + 1).concat(lens.slice(1).map((l) => c0 + ((c1 - c0) * l) / total));
    shape.pts = end === 'end' ? kept : kept.reverse();
    shape.cum = end === 'end' ? keptCum : keptCum.reverse();
    return;
  }
}

/** S70 half width (1.33 m) plus the worst measured swing (0.95 m) and a little margin. */
const SWEPT_HALF_WIDTH = 2.4;

/**
 * The ground a streetcar body sweeps through each filleted street corner, as one closed polygon
 * per corner and path: the drawn shape near the corner, offset SWEPT_HALF_WIDTH to either side.
 * Ground paint (ground-map.ts) can lay carriageway under it, so the track never crosses sidewalk.
 */
export function streetcarSweptCorners(rf: Pick<RoutesFile, 'paths'>, origin: Origin, route: string, minTurn = 0.5): P2[][] {
  const out: P2[][] = [];
  for (const shape of streetcarShapes(rf, origin, route))
    for (const c of shape.corners) {
      if (c.turn < minTurn) continue;
      const reach = c.radius * Math.tan(c.turn / 2) + 15;
      const run = shape.pts.filter((p) => Math.hypot(p[0] - c.at[0], p[1] - c.at[1]) <= reach);
      if (run.length < 2) continue;
      const left: P2[] = [],
        right: P2[] = [];
      run.forEach((p, i) => {
        const a = run[Math.max(0, i - 1)],
          b = run[Math.min(run.length - 1, i + 1)];
        const d = unit(a, b);
        left.push([p[0] - d[1] * SWEPT_HALF_WIDTH, p[1] + d[0] * SWEPT_HALF_WIDTH]);
        right.push([p[0] + d[1] * SWEPT_HALF_WIDTH, p[1] - d[0] * SWEPT_HALF_WIDTH]);
      });
      out.push([...left, ...right.reverse()]);
    }
  return out;
}
