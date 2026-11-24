import { expect, it } from 'vitest';
import { clipped } from './connector-traffic-routes';
import { courseSignals, type CourseSignal, type SignalCluster } from './traffic-signals';
import { mix } from '../terrain/connector-corridor';
import { Line, rng, type P2 } from '../vignette/geom';
import type { TerrainCity } from '../terrain/transport-data';

// Verbatim copies of the implementations before the 2026-11-24 mount-cost cut, as references.
type Box = TerrainCity['bounds'];
const distance = (a: P2, b: P2) => Math.hypot(b[0] - a[0], b[1] - a[1]);
function inside(p: P2, b: Box) {
  return p[0] >= b.minX && p[0] <= b.maxX && p[1] >= b.minZ && p[1] <= b.maxZ;
}
function referenceClipped(points: P2[], boxes: Box[]) {
  const pieces: P2[][] = [];
  let part: P2[] | undefined;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      cuts = [0, 1];
    for (const box of boxes)
      for (const [axis, min, max] of [
        [0, box.minX, box.maxX],
        [1, box.minZ, box.maxZ],
      ]) {
        for (const edge of [min, max]) {
          const t = (edge - a[axis]) / (b[axis] - a[axis]);
          if (t > 0 && t < 1) cuts.push(t);
        }
      }
    cuts.sort((x, y) => x - y);
    for (let j = 1; j < cuts.length; j++) {
      const t = cuts[j - 1],
        u = cuts[j];
      if (u - t < 1e-9) continue;
      if (!boxes.some((box) => inside(mix(a, b, (t + u) / 2), box))) {
        part = undefined;
        continue;
      }
      if (!part) {
        part = [mix(a, b, t)];
        pieces.push(part);
      }
      const end = mix(a, b, u);
      if (distance(part.at(-1)!, end) > 0.00001) part.push(end);
    }
  }
  return pieces.filter((p) => p.length > 1);
}

function referenceCourseSignals(line: Line, clusters: readonly SignalCluster[], reach = 20): (CourseSignal & { dx: number; dz: number })[] {
  const out: (CourseSignal & { dx: number; dz: number })[] = [];
  for (const c of clusters) {
    let best = { d: Infinity, s: 0, dx: 0, dz: 0 };
    for (let i = 1; i < line.pts.length; i++) {
      const [ax, az] = line.pts[i - 1], [bx, bz] = line.pts[i];
      const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((c.x - ax) * dx + (c.z - az) * dz) / l2));
      const d = Math.hypot(ax + t * dx - c.x, az + t * dz - c.z);
      if (d < best.d) best = { d, s: line.cum[i - 1] + t * Math.sqrt(l2), dx, dz };
    }
    const s = best.s - 8;
    if (best.d > reach || s < 2 || s > line.length - 4) continue;
    const n = Math.hypot(best.dx, best.dz) || 1;
    out.push({ s, key: c.key, axis: Math.abs(best.dz) >= Math.abs(best.dx) ? 0 : 1, dx: best.dx / n, dz: best.dz / n });
  }
  // Twin lights within 30 m (a slip lane, a split intersection) act as one stop for this course.
  const kept: (CourseSignal & { dx: number; dz: number })[] = [];
  for (const sig of out.sort((a, b) => a.s - b.s)) if (!kept.length || sig.s - kept.at(-1)!.s >= 30) kept.push(sig);
  return kept;
}


it('clips lanes at mounted boards exactly as before, for random lanes and board sets', () => {
  const random = rng(20261124);
  let pieces = 0;
  for (let k = 0; k < 600; k++) {
    const pts: P2[] = [[random() * 4000 - 2000, random() * 4000 - 2000]];
    for (let i = 0; i < 2 + Math.floor(random() * 30); i++) pts.push([pts.at(-1)![0] + random() * 300 - 150, pts.at(-1)![1] + random() * 300 - 150]);
    if (k % 7 === 0) pts.push([pts.at(-1)![0], pts.at(-1)![1] + 50]); // axis-aligned segments
    const boxes: Box[] = Array.from({ length: 1 + Math.floor(random() * 14) }, () => {
      const x = random() * 3000 - 1500, z = random() * 3000 - 1500;
      return { minX: x, maxX: x + 200 + random() * 800, minZ: z, maxZ: z + 200 + random() * 800 };
    });
    const want = referenceClipped(pts, boxes);
    expect(clipped(pts, boxes)).toEqual(want);
    pieces += want.length;
  }
  expect(pieces).toBeGreaterThan(150);
});

it('finds each course’s signals exactly as before', () => {
  const random = rng(42);
  let found = 0;
  for (let k = 0; k < 300; k++) {
    const pts: P2[] = [[random() * 2000, random() * 2000]];
    for (let i = 0; i < 2 + Math.floor(random() * 40); i++) pts.push([pts.at(-1)![0] + random() * 60 - 30, pts.at(-1)![1] + random() * 60 - 30]);
    const clusters: SignalCluster[] = Array.from({ length: 200 }, (_, i) => ({ key: 'k' + i, x: random() * 2000, z: random() * 2000 }));
    // Plus clusters right beside the course, so many are within reach.
    for (let i = 0; i < 10; i++) { const p = pts[Math.floor(random() * pts.length)]; clusters.push({ key: 'n' + i, x: p[0] + random() * 30 - 15, z: p[1] + random() * 30 - 15 }); }
    const line = new Line(pts);
    const want = referenceCourseSignals(line, clusters);
    expect(courseSignals(line, clusters)).toEqual(want);
    found += want.length;
  }
  expect(found).toBeGreaterThan(200);
});
