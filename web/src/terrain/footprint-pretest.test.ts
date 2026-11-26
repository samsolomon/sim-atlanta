import { expect, it } from 'vitest';
import { eastLandingYields, seatLandingEdges } from '../../../pipeline/prototypes/highway-four-ground/landing';
import { runSync } from '../core/slice';
import { splitConvex } from './openings';
import { apartFromFootprint, footprintContains, tessellateSteps, yieldPlanes } from './surface-build';

/**
 * The box tests in front of the footprint plane tests may only skip work the planes would reject.
 * Random footprints (slivers included) and random points and faces around their boxes, at the
 * coordinates of R16's landing, where the dense footprints are.
 */
type Point = [number, number];

/** mulberry32: the same cases on every run. */
function random(seed: number) {
  return () => {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** A convex ring (3 to 6 corners on a stretched, turned ellipse), either way round. */
function ring(r: () => number): Point[] {
  const n = 3 + Math.floor(r() * 4), cx = 1480 + r() * 55, cz = -6290 + r() * 90;
  const long = .05 + r() * 8, short = long * 10 ** -(r() * 5), turn = r() * Math.PI;
  const angles = Array.from({ length: n }, () => r() * 2 * Math.PI).sort((a, b) => a - b);
  const out = angles.map((a): Point => {
    const u = Math.cos(a) * long, v = Math.sin(a) * short;
    return [cx + u * Math.cos(turn) - v * Math.sin(turn), cz + u * Math.sin(turn) + v * Math.cos(turn)];
  });
  return r() < .5 ? out : out.reverse();
}

/** A point near the footprint: past a corner along its bisector, along an edge line, or anywhere close. */
function near(r: () => number, points: Point[], scale: number): Point {
  const n = points.length, i = Math.floor(r() * n);
  const b = points[i], a = points[(i + n - 1) % n], c = points[(i + 1) % n];
  const unit = (p: Point): Point => { const l = Math.hypot(p[0] - b[0], p[1] - b[1]) || 1; return [(p[0] - b[0]) / l, (p[1] - b[1]) / l]; };
  const kind = r(), reach = scale * 10 ** (r() * 4);
  const jitter = () => (r() - .5) * scale * 4;
  if (kind < .4) {
    const u = unit(a), v = unit(c);
    return [b[0] - (u[0] + v[0]) * reach + jitter(), b[1] - (u[1] + v[1]) * reach + jitter()];
  }
  if (kind < .7) {
    const v = unit(c), along = (r() - .5) * 40;
    return [b[0] + v[0] * along + jitter(), b[1] + v[1] * along + jitter()];
  }
  return [b[0] + (r() - .5) * reach * 4, b[1] + (r() - .5) * reach * 4];
}

function footprints(r: () => number, count: number) {
  const out: { points: Point[]; yields: ReturnType<typeof yieldPlanes> }[] = [];
  while (out.length < count) {
    const points = ring(r);
    // Rings too small to be a footprint are refused by yieldPlanes, as in a build.
    try { out.push({ points, yields: yieldPlanes({ ring: points, floor: () => 0 }) }); } catch { continue; }
  }
  return out;
}

it('the box test never refuses a point the planes accept', () => {
  const r = random(1);
  let accepted = 0, outsideBox = 0;
  const wrong: unknown[] = [];
  for (const { points, yields: y } of footprints(r, 3000)) {
    for (const eps of [0, 1e-6, 1e-3, .05]) {
      for (let k = 0; k < 60; k++) {
        const [x, z] = near(r, points, Math.max(eps, 1e-6));
        const planes = y.planes.every(plane => plane(x, 0, z) >= -eps);
        if (x < y.minX || x > y.maxX || z < y.minZ || z > y.maxZ) outsideBox++;
        if (planes) accepted++;
        if (footprintContains(y, x, z, eps) !== planes) wrong.push({ points, x, z, eps, reach: y.reach });
      }
    }
  }
  expect(wrong.slice(0, 3)).toEqual([]);
  // Both sides of the question were really asked.
  expect(accepted).toBeGreaterThan(10_000);
  expect(outsideBox).toBeGreaterThan(10_000);
});

it('a face apart from the box comes back from splitConvex whole', () => {
  const r = random(2);
  let asked = 0, crossed = 0;
  for (const { points, yields: y } of footprints(r, 3000)) {
    if (y.reach === Infinity) continue;
    for (let k = 0; k < 60; k++) {
      const origin = near(r, points, 10 ** -(r() * 5)), size = 10 ** (r() * 3 - 2);
      const face: Point[] = [0, 1, 2].map(() => [origin[0] + (r() - .5) * size, origin[1] + (r() - .5) * size]);
      // Half the faces are pushed to sit just past one side of the box.
      if (r() < .5) {
        const axis = r() < .5 ? 0 : 1, low = r() < .5, gap = 1e-6 + 10 ** -(r() * 6);
        const edge = axis ? [y.minZ, y.maxZ] : [y.minX, y.maxX];
        const shift = low ? edge[0] - gap - Math.max(...face.map(p => p[axis])) : edge[1] + gap - Math.min(...face.map(p => p[axis]));
        for (const p of face) p[axis] += shift;
      }
      const positions = face.flatMap(([x, z]) => [x, 0, z]);
      if (!apartFromFootprint(y, positions, [0, 1, 2])) continue;
      let cuts = 0;
      const result = splitConvex([0, 1, 2], y.planes, positions, (x, py, z) => { cuts++; positions.push(x, py, z); return positions.length / 3 - 1; });
      asked++;
      if (cuts) crossed++;
      expect(result, JSON.stringify({ points, face })).toEqual({ inside: null, outside: [[0, 1, 2]] });
    }
  }
  expect(asked).toBeGreaterThan(10_000);
  // Some of these faces cross an extended edge line: the case where whole-in, whole-out matters.
  expect(crossed).toBeGreaterThan(100);
});

it('seating landing edges inside their boxes seats the same vertices as testing every footprint', () => {
  const r = random(3);
  let seated = 0;
  for (let run = 0; run < 40; run++) {
    const faces = footprints(r, 400).filter(f => f.points.length === 3);
    const floors = eastLandingYields(faces.map(f => ({
      way: 38983384,
      points: f.points.map(([x, z]) => [x, 5, z] as const) as unknown as [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]],
    })));
    const pos: number[] = [];
    for (let k = 0; k < 4000; k++) {
      const [x, z] = near(r, faces[Math.floor(r() * faces.length)].points, 1e-3);
      pos.push(x, 100, z);
    }
    // The same rule with no boxes: a vertex in the footprint's 5 m cells, not on both sides of its edges.
    const cell = (v: number) => Math.floor(v / 5);
    const expected = pos.slice();
    for (let i = 0; i < pos.length; i += 3) {
      const x = Math.fround(pos[i]), z = Math.fround(pos[i + 2]);
      if (x < 1470 || x > 1545 || z < -6300 || z > -6190) continue;
      for (const f of floors) {
        const xs = f.ring.map(p => p[0]), zs = f.ring.map(p => p[1]);
        if (cell(x) < cell(Math.min(...xs) - .001) || cell(x) > cell(Math.max(...xs) + .001) ||
          cell(z) < cell(Math.min(...zs) - .001) || cell(z) > cell(Math.max(...zs) + .001)) continue;
        const sides = f.ring.map((a, j) => {
          const b = f.ring[(j + 1) % f.ring.length], dx = b[0] - a[0], dz = b[1] - a[1];
          return (dx * (z - a[1]) - dz * (x - a[0])) / Math.hypot(dx, dz);
        });
        if (!(sides.some(s => s > .001) && sides.some(s => s < -.001))) expected[i + 1] = Math.min(expected[i + 1], f.floor(x, z));
      }
    }
    runSync(seatLandingEdges(pos, floors));
    for (let i = 1; i < pos.length; i += 3) if (expected[i] !== 100) seated++;
    expect(pos).toEqual(expected);
  }
  expect(seated).toBeGreaterThan(1000);
});

it('pauses inside one triangle crowded with footprints', () => {
  // One 10 m block of flat ground (eight triangles) under thousands of thin footprints.
  const spec = { rows: 3, cols: 3, stepM: 5, bounds: { minX: 0, maxX: 10, minZ: 0, maxZ: 10 }, sha256: '', sceneZeroNavd88M: 0 };
  const r = random(9);
  const yields = Array.from({ length: 3000 }, () => {
    const x = .5 + r() * 8.5, z = .5 + r() * 8.5;
    return { ring: [[x, z], [x + .4, z + .02], [x + .2, z + .05]] as Point[], floor: () => -1 };
  });
  let steps = 0;
  for (const _ of tessellateSteps(spec, new Float32Array(9), 'high', [], undefined, yields)) steps++;
  // Pausing only between triangles would give at most one step per triangle and pass.
  expect(steps).toBeGreaterThan(40);
});
