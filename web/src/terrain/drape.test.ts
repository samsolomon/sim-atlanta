import { expect, it } from 'vitest';
import { cutOut, drapeTriangle, type TriangleSource } from './drape';
import { GroundGrid, type GroundManifest } from './grid';
import { GroundSurface } from './surface';

// A ridge along z at x = 1: y = x for x <= 1, y = 2 - x beyond, as four drawn triangles.
const ridgeY = (x: number) => (x <= 1 ? x : 2 - x);
const ridge: TriangleSource = {
  trianglesIn(_minX, _maxX, _minZ, _maxZ, visit) {
    for (const [x0, x1] of [[0, 1], [1, 2]]) {
      visit(x0, ridgeY(x0), 0, x1, ridgeY(x1), 0, x1, ridgeY(x1), 2);
      visit(x0, ridgeY(x0), 0, x1, ridgeY(x1), 2, x0, ridgeY(x0), 2);
    }
  },
};
const area = (p: number[], q: number[], r: number[]) => Math.abs((q[0] - p[0]) * (r[2] - p[2]) - (q[2] - p[2]) * (r[0] - p[0])) / 2;

it('splits a flat sheet at a terrain crease and lifts it clear of the ridge', () => {
  const pieces: number[][][] = [];
  drapeTriangle(ridge, [0, .05, 0], [2, .05, 0], [0, .05, 2], .02, (...v) => pieces.push(v));
  const vertices = pieces.flat();
  // A vertex lands on the crease, where the ridge peaks between the sheet's own corners.
  expect(vertices.some(v => Math.abs(v[0] - 1) < 1e-9)).toBe(true);
  for (const v of vertices) expect(v[1]).toBeGreaterThanOrEqual(ridgeY(v[0]) + .02 - 1e-9);
  // The pieces tile the original triangle exactly.
  expect(pieces.reduce((s, [p, q, r]) => s + area(p, q, r), 0)).toBeCloseTo(2, 9);
  // Barycentric weights reproduce the plan position, so other attributes interpolate.
  for (const v of vertices) expect(v[3] * 0 + v[4] * 2 + v[5] * 0).toBeCloseTo(v[0], 9);
});

it('caps the lift for deliberate cuts and leaves a voided triangle whole', () => {
  const tops: number[] = [];
  drapeTriangle(ridge, [0, .05, 0], [2, .05, 0], [0, .05, 2], .02, (...v) => tops.push(...v.map(p => p[1])), .25);
  expect(Math.max(...tops)).toBeCloseTo(.3, 9);
  const whole: number[][][] = [];
  drapeTriangle({ trianglesIn() {} }, [0, 0, 0], [1, 0, 0], [0, 0, 1], .02, (...v) => whole.push(v));
  expect(whole).toHaveLength(1);
});

it('cuts a convex footprint out of a cover triangle', () => {
  const kept: number[][][] = [];
  cutOut([0, 0, 0], [4, 0, 0], [0, 0, 4], [[0.5, 0.5], [1.5, 0.5], [1.5, 1.5], [0.5, 1.5]], (...v) => kept.push(v));
  expect(kept.reduce((s, [p, q, r]) => s + area(p, q, r), 0)).toBeCloseTo(8 - 1, 9);
  for (const [p, q, r] of kept) {
    const cx = (p[0] + q[0] + r[0]) / 3, cz = (p[2] + q[2] + r[2]) / 3;
    expect(cx > 0.5 && cx < 1.5 && cz > 0.5 && cz < 1.5).toBe(false);
  }
});

it.each(['high', 'low'] as const)('carves a yield on %s without moving the board outside it', quality => {
  // A 9 × 9 node, 5 m grid with a 1 m mound in the middle, NAVD88 metres.
  const rows = 9, cols = 9, raw = new Int16Array(rows * cols);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
    raw[r * cols + c] = Math.round(10 * (300 + Math.max(0, 1 - Math.hypot(r - 4, c - 4) / 3)));
  const manifest: GroundManifest = { version: 1, rows, cols, stepM: 5, bounds: { minX: 0, maxX: 40, minZ: 0, maxZ: 40 },
    scaleM: .1, offsetM: 0, noData: -32768, encoding: 'signed int16 little-endian', vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 }, sha256: 'synthetic' };
  const surface = new GroundSurface(new GroundGrid(manifest, raw.buffer), quality);
  const outside = [[3, 3], [37, 20], [20, 37]].map(([x, z]) => surface.sampleScene(x, z));
  surface.carve([{ ring: [[16, 17], [24, 17], [24, 23], [16, 23]], floor: () => 0.2 }]);
  // Inside the footprint the drawn terrain is at or below the floor, between vertices too.
  for (let x = 16.2; x < 24; x += .4) for (let z = 17.2; z < 23; z += .4)
    expect(surface.sampleScene(x, z)!).toBeLessThanOrEqual(0.2 + 1e-6);
  expect([[3, 3], [37, 20], [20, 37]].map(([x, z]) => surface.sampleScene(x, z))).toEqual(outside);
  // A rebuild must not keep a normal buffer of the old length (that blanked a whole board).
  const g = surface.geometry;
  expect(g.getAttribute('normal').count).toBe(g.getAttribute('position').count);
  // A yield at the board edge is skipped, not fatal.
  expect(() => surface.carve([{ ring: [[0, 0], [4, 0], [4, 4], [0, 4]], floor: () => 0 }])).not.toThrow();
});
