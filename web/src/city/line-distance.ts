import type { Line } from '../vignette/geom';

/** Segments per box: a MARTA alignment has thousands of points, and few are near any one query. */
const RUN = 32;
interface Box { from: number; to: number; minX: number; maxX: number; minZ: number; maxZ: number }
const runs = new WeakMap<Line, Box[]>();

function boxes(line: Line) {
  let out = runs.get(line);
  if (!out) {
    runs.set(line, out = []);
    const pts = line.pts;
    // Segment i joins points i - 1 and i; a box covers both ends of each of its segments.
    for (let from = 1; from < pts.length; from += RUN) {
      const box = { from, to: Math.min(pts.length, from + RUN), minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
      for (let i = from - 1; i < box.to; i++) {
        const [x, z] = pts[i];
        box.minX = Math.min(box.minX, x); box.maxX = Math.max(box.maxX, x);
        box.minZ = Math.min(box.minZ, z); box.maxZ = Math.max(box.maxZ, z);
      }
      out.push(box);
    }
  }
  return out;
}

/**
 * Distance from (x, z) to the polyline. With `within`, only "is it under `within`" is exact: runs
 * of segments farther than that are skipped (Infinity when all are), and the scan stops at the
 * first segment closer than `within`. This was a long task on a phone's City load.
 */
export function distToLine(line: Line, x: number, z: number, within = Infinity) {
  let best = Infinity;
  const pts = line.pts;
  for (const box of boxes(line)) {
    if (x < box.minX - within || x > box.maxX + within || z < box.minZ - within || z > box.maxZ + within) continue;
    for (let i = box.from; i < box.to; i++) {
      const [ax, az] = pts[i - 1];
      const [bx, bz] = pts[i];
      const dx = bx - ax;
      const dz = bz - az;
      const l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
      best = Math.min(best, Math.hypot(ax + dx * t - x, az + dz * t - z));
      if (within < Infinity && best < within) return best;
    }
  }
  return best;
}

/**
 * The nearest point of the polyline: its distance, station and position; the first such segment
 * wins a tie. The same answer as testing every segment, skipping runs too far to improve on it.
 */
export function nearestOnLine(line: Line, x: number, z: number) {
  let best = { d: Infinity, s: 0, x: 0, z: 0 };
  const pts = line.pts;
  for (const box of boxes(line)) {
    // No point of the run is nearer than its box (a rounding margin keeps that true).
    if (Math.hypot(Math.max(box.minX - x, 0, x - box.maxX), Math.max(box.minZ - z, 0, z - box.maxZ)) >= best.d + 1e-6) continue;
    for (let i = box.from; i < box.to; i++) {
      const [ax, az] = pts[i - 1],
        [bx, bz] = pts[i];
      const dx = bx - ax,
        dz = bz - az,
        l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
      const px = ax + t * dx,
        pz = az + t * dz,
        d = Math.hypot(x - px, z - pz);
      if (d < best.d) best = { d, s: line.cum[i - 1] + t * Math.sqrt(l2), x: px, z: pz };
    }
  }
  return best;
}
