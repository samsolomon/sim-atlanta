import { expect, it } from 'vitest';
import { CUTTING, cuttingYields, type BallastQuad } from './cutting';
import { GroundGrid, type GroundManifest } from './grid';
import { GroundSurface } from './surface';

// A 13 × 13 node, 5 m grid (60 m square) with a 1.5 m mound across two parallel tracks.
function mound(quality: 'high' | 'low') {
  const rows = 13, cols = 13, raw = new Int16Array(rows * cols);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
    raw[r * cols + c] = Math.round(10 * (300 + 1.5 * Math.max(0, 1 - Math.hypot(r - 6, c - 6) / 4)));
  const manifest: GroundManifest = { version: 1, rows, cols, stepM: 5, bounds: { minX: 0, maxX: 60, minZ: 0, maxZ: 60 },
    scaleM: .1, offsetM: 0, noData: -32768, encoding: 'signed int16 little-endian', vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 }, sha256: 'synthetic' };
  return new GroundSurface(new GroundGrid(manifest, raw.buffer), quality);
}
/** A straight ballast run along x at z, top at y, in 2 m quads (a, b previous; d, c next). */
function run(z: number, y: (x: number) => number): BallastQuad[] {
  const quads: BallastQuad[] = [];
  for (let x = 10; x < 50; x += 2)
    quads.push([[x, y(x), z + 2.1], [x, y(x), z - 2.1], [x + 2, y(x + 2), z - 2.1], [x + 2, y(x + 2), z + 2.1]]);
  return quads;
}
const inside = { minX: 5.01, maxX: 54.99, minZ: 5.01, maxZ: 54.99 };

it.each(['high', 'low'] as const)('grades a cutting under two parallel tracks on %s, with no fins', quality => {
  const surface = mound(quality);
  // Two tracks 5 m apart at different heights: the lower one's side slope reaches over
  // the upper one's bed, which must still keep its own floor.
  const runs = [run(28, () => 0.13), run(33, () => 0.5)];
  const ground = (x: number, z: number) => surface.sampleScene(x, z);
  const penetrating = () => runs.flatMap(r => r).filter(([a, , c]) => {
    for (let x = a[0]; x <= c[0]; x += .25) for (let z = c[2]; z <= a[2]; z += .25)
      if (ground(x, z)! > a[1] + .03) return true;
    return false;
  }).length;
  expect(penetrating()).toBeGreaterThan(10);
  const yields = cuttingYields(runs, ground, inside);
  surface.carve(yields);
  expect(penetrating()).toBe(0);
  // Under each bed the terrain sits at the formation, just under the ballast.
  expect(ground(30, 28)).toBeCloseTo(0.13 - CUTTING.below, 3);
  expect(ground(30, 33)).toBeCloseTo(0.5 - CUTTING.below, 3);
  // Shared edges get no skirt: no near-vertical terrain triangle stands inside the beds.
  const p = surface.geometry.getAttribute('position'), index = surface.geometry.index!;
  let fins = 0;
  for (let t = 0; t < index.count; t += 3) {
    const v = [0, 1, 2].map(k => index.getX(t + k)).map(i => [p.getX(i), p.getY(i), p.getZ(i)]);
    const u = [0, 1, 2].map(k => v[1][k] - v[0][k]), w = [0, 1, 2].map(k => v[2][k] - v[0][k]);
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const len = Math.hypot(...n);
    if (len < 1e-9 || Math.abs(n[1]) / len > 0.2) continue;
    const cx = (v[0][0] + v[1][0] + v[2][0]) / 3, cz = (v[0][2] + v[1][2] + v[2][2]) / 3;
    if (cx > 12 && cx < 48 && [28, 33].some(z => Math.abs(cz - z) < 2)) fins++;
  }
  expect(fins).toBe(0);
  // Where one track's side slope reaches the other's bed, the floors differ; the carved
  // ground must still be closed. Across both tracks, every step in the drawn height must
  // sit on a skirt (a vertical triangle); a step with none is a slit between yields.
  const walls: [number, number, number, number][] = [];
  for (let t = 0; t < index.count; t += 3) {
    const v = [0, 1, 2].map(k => index.getX(t + k)).map(i => [p.getX(i), p.getY(i), p.getZ(i)]);
    const u = [0, 1, 2].map(k => v[1][k] - v[0][k]), w = [0, 1, 2].map(k => v[2][k] - v[0][k]);
    const ny = u[2] * w[0] - u[0] * w[2], len = Math.hypot(u[1] * w[2] - u[2] * w[1], ny, u[0] * w[1] - u[1] * w[0]);
    if (len > 1e-9 && Math.abs(ny) / len < 1e-3) {
      const xs = v.map(q => q[0]), zs = v.map(q => q[2]);
      walls.push([Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]);
    }
  }
  const slits: string[] = [];
  for (let x = 12.3; x < 48; x += 1.7) {
    let last = ground(x, 20)!;
    for (let z = 20.01; z < 41; z += .01) {
      const y = ground(x, z)!;
      if (Math.abs(y - last) > .03 && !walls.some(([x0, x1, z0, z1]) => x >= x0 - .02 && x <= x1 + .02 && z >= z0 - .02 && z <= z1 + .02))
        slits.push(`${x.toFixed(1)},${z.toFixed(2)}: ${last.toFixed(2)} -> ${y.toFixed(2)}`);
      last = y;
    }
  }
  expect(slits).toEqual([]);
});

it('leaves a pit alone: a quad steeper than the grade limit is not a cutting', () => {
  const surface = mound('high');
  const steep = run(30, x => (x < 30 ? 0.13 : -3));
  const yields = cuttingYields([steep], (x, z) => surface.sampleScene(x, z), inside);
  // Nothing within five quads (10 m) of the 3 m drop from x 28 to 30 is graded.
  for (const y of yields) expect(y.ring.every(([x]) => x <= 18 + 1e-9) || y.ring.every(([x]) => x >= 40 - 1e-9)).toBe(true);
});

it('clips yields to the board inset rather than dropping them', () => {
  const yields = cuttingYields([run(30, () => 0.13)], () => 5, { ...inside, minX: 21 });
  expect(yields.length).toBeGreaterThan(0);
  expect(Math.min(...yields.flatMap(y => y.ring.map(([x]) => x)))).toBeCloseTo(21, 9);
});
