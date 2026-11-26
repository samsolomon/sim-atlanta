import { expect, it } from 'vitest';
import { Line, type P2 } from '../vignette/geom';
import { distToLine, nearestOnLine } from './line-distance';

function random(seed: number) {
  return () => {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** A wandering line that doubles back and repeats points, so runs overlap and ties happen. */
function wander(r: () => number) {
  const pts: P2[] = [[r() * 100, r() * 100]];
  const n = 2 + Math.floor(r() * 300);
  while (pts.length < n) {
    const [x, z] = pts[pts.length - 1];
    if (r() < .05) pts.push(pts[Math.floor(r() * pts.length)]);
    else pts.push([x + (r() - .4) * 12, z + (r() - .5) * 12]);
  }
  return new Line(pts);
}

/** Every segment in order: the rule the pruned searches replace. */
function every(line: Line, x: number, z: number) {
  return line.pts.slice(1).map(([bx, bz], i) => {
    const [ax, az] = line.pts[i];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    const px = ax + t * dx, pz = az + t * dz;
    return { d: Math.hypot(x - px, z - pz), s: line.cum[i] + t * Math.sqrt(l2), x: px, z: pz };
  });
}

it('finds the same nearest point, and the same answers within a distance, as testing every segment', () => {
  const r = random(7);
  let near = 0, far = 0;
  for (let n = 0; n < 200; n++) {
    const line = wander(r);
    for (let k = 0; k < 200; k++) {
      const [px, pz] = line.pts[Math.floor(r() * line.pts.length)];
      const spread = r() < .5 ? 8 : 400;
      // On a point now and then, where two segments tie.
      const x = r() < .1 ? px : px + (r() - .5) * spread, z = r() < .1 ? pz : pz + (r() - .5) * spread;
      const all = every(line, x, z);
      const first = all.reduce((best, c) => c.d < best.d ? c : best, { d: Infinity, s: 0, x: 0, z: 0 });
      expect(nearestOnLine(line, x, z)).toEqual(first);
      expect(distToLine(line, x, z)).toBe(first.d);
      for (const within of [.5, 6, 40]) {
        const hit = all.find(c => c.d < within), got = distToLine(line, x, z, within);
        if (hit) { near++; expect(got).toBe(hit.d); } else { far++; expect(got).toBeGreaterThanOrEqual(within); }
      }
    }
  }
  expect(near).toBeGreaterThan(5000);
  expect(far).toBeGreaterThan(5000);
});
