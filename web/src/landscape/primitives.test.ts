import { Color, Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { Builder, type P2 } from '../vignette/geom';
import { bloom, flowerBed, hedge, landscapeMesh, ornamentals, retainingEdge, seatWall, stairRun, terraces } from './primitives';

// A 2.4 m bank across z = -3…3 between two lawns.
const bank = (_x: number, z: number) => { const t = Math.max(0, Math.min(1, (3 - z) / 6)); return 2.4 * t * t * (3 - 2 * t); };
const ys = (b: Builder) => b.pos.filter((_, i) => i % 3 === 1);
const tris = (b: Builder) => b.pos.length / 9;

it('stair runs reach the ground or the surveyed landings at both ends', () => {
  const b = new Builder();
  stairRun(b, [0, 4], [0, -4], 2, bank, { cheeks: false });
  expect(Math.max(...ys(b))).toBeCloseTo(bank(0, -4), 5);
  const s = new Builder();
  stairRun(s, [0, 4], [0, -4], 2, bank, { cheeks: false, fromY: -33.4, toY: -27.4 });
  expect(Math.max(...ys(s))).toBeCloseTo(-27.4, 5);
  // 6 m at a 0.16 m riser: about 38 treads.
  expect(Math.min(...ys(s))).toBeLessThan(-33.4);
});

it('terraces stand on or above the ground under every level, or step between surveyed elevations', () => {
  const b = new Builder();
  terraces(b, [0, -9], [0, 9], 6, 3, bank);
  // Every platform vertex (the lawn surface colour) sits at or above the slope under it.
  const lawn = new Color('#8aa266');
  let platform = 0;
  for (let i = 0; i < b.pos.length; i += 3) {
    if (Math.abs(b.col[i] - lawn.r) > 1e-4 || Math.abs(b.col[i + 1] - lawn.g) > 1e-4 || Math.abs(b.col[i + 2] - lawn.b) > 1e-4) continue;
    platform++;
    expect(b.pos[i + 1]).toBeGreaterThanOrEqual(bank(b.pos[i], b.pos[i + 2]));
  }
  expect(platform).toBe(3 * 6);
  const s = new Builder();
  terraces(s, [0, -9], [0, 9], 6, 3, bank, { fromY: 0, toY: 3 });
  const levels = new Set(ys(s).map(y => y.toFixed(2)));
  expect(levels.has('0.00') && levels.has('1.50') && levels.has('3.00')).toBe(true);
});

it('beds drape on the ground and change colour with the season', () => {
  const ring: P2[] = [[-3, 4], [3, 4], [3, 8], [-3, 8]];
  const spring = new Builder(), fall = new Builder();
  flowerBed(spring, ring, bank, { doy: 100, seed: 'x' });
  flowerBed(fall, ring, bank, { doy: 300, seed: 'x' });
  expect(bloom(100)).not.toEqual(bloom(300));
  // Season colours live in the planting mesh, which fills most of the bed.
  const plantingColours = (b: Builder) => {
    const built = landscapeMesh(b), child = built.mesh.getObjectByName('planting') as Mesh;
    const colours = Array.from(child.geometry.getAttribute('color').array);
    built.dispose();
    return colours;
  };
  expect(plantingColours(spring)).not.toEqual(plantingColours(fall));
  expect(Math.min(...ys(spring))).toBeGreaterThan(-.2);
  // A raised mound lifts the middle of the bed, not its curb.
  const mound = new Builder();
  flowerBed(mound, ring, () => 0, { doy: 100, seed: 'x', mound: .8, flowers: 0 });
  expect(Math.max(...ys(mound))).toBeGreaterThan(.8);
});

it('the low tier is cheaper, and a whole garden is one draw', () => {
  const count = (quality: 'high' | 'low') => {
    const b = new Builder();
    flowerBed(b, [[-3, 4], [3, 4], [3, 8], [-3, 8]], bank, { doy: 150, quality });
    hedge(b, [[-8, 9], [-8, -9]], bank, { quality });
    hedge(b, [[-6, 9], [-6, -9]], bank, { quality, clipped: false });
    retainingEdge(b, [[-4, 3], [4, 3]], bank, { quality });
    seatWall(b, [[-4, 6.5], [2, 6.5]], bank, { quality });
    ornamentals(b, [5, 8], 2, bank, { doy: 150, quality });
    return b;
  };
  const high = count('high'), low = count('low');
  expect(tris(low)).toBeLessThan(tris(high) * .8);
  const garden = landscapeMesh(high);
  // One draw for the primitives, one for bed planting (inked at its silhouette only).
  expect(garden.draws).toBe(2);
  expect(garden.mesh.geometry.getAttribute('position').count).toBe(tris(high) * 3);
  const planting = garden.mesh.getObjectByName('planting') as Mesh;
  expect(garden.triangles).toBe(tris(high) + planting.geometry.getAttribute('position').count / 3);
  garden.dispose();
});

it('guards degenerate input and never drops to zero when the ground is missing', () => {
  const b = new Builder();
  stairRun(b, [0, 0], [0, 0], 2, bank);
  stairRun(b, [0, 4], [0, -4], 2, bank, { riser: 0, cheeks: false });
  terraces(b, [0, -9], [0, 9], 6, 0, bank);
  expect(b.pos.every(Number.isFinite)).toBe(true);
  // A sampler that is null east of x = 2 (off the board) at City's -30 m frame.
  const edge = (x: number) => x > 2 ? null : -30;
  const w = new Builder();
  retainingEdge(w, [[-4, 0], [4, 0]], edge);
  expect(Math.max(...ys(w))).toBeLessThan(-29);
  // One surveyed end is honoured on its own.
  const t = new Builder();
  terraces(t, [0, -9], [0, 9], 6, 3, bank, { toY: 5 });
  expect(Math.max(...ys(t))).toBeGreaterThan(5);
});

it('offers a rich-black soil for formal beds, darker than the brown default and lifted on low', () => {
  const ring: P2[] = [[0, 0], [6, 0], [6, 4], [0, 4]];
  const mean = (quality: 'high' | 'low', soil?: 'rich-black') => {
    const b = new Builder();
    flowerBed(b, ring, () => 0, { doy: 10, flowers: 0, density: 0, seed: 's', quality, soil });
    let sum = 0;
    for (let i = 0; i < b.col.length; i += 3) sum += b.col[i] + b.col[i + 1] + b.col[i + 2];
    return sum / b.col.length;
  };
  expect(mean('high', 'rich-black')).toBeLessThan(mean('high') * .7);
  expect(mean('low', 'rich-black')).toBeGreaterThan(mean('high', 'rich-black'));
});

it('fills a bed with planting, leaves flowers:0 mounds bare, and keeps the low tier a single mass', () => {
  const ring: P2[] = [[0, 0], [6, 0], [6, 4], [0, 4]];
  const area = (b: Builder) => {
    const built = landscapeMesh(b), child = built.mesh.getObjectByName('planting') as Mesh | undefined;
    if (!child) { built.dispose(); return 0; }
    // Coverage seen from above: vertical rays on a 0.25 m grid over the bed that hit the planting.
    child.updateMatrixWorld(true);
    const ray = new Raycaster();
    let hits = 0;
    for (let x = .125; x < 6; x += .25) for (let z = .125; z < 4; z += .25) {
      ray.set(new Vector3(x, 10, z), new Vector3(0, -1, 0));
      if (ray.intersectObject(child, false).length) hits++;
    }
    built.dispose();
    return hits * .0625;
  };
  const high = new Builder(), low = new Builder(), bare = new Builder();
  flowerBed(high, ring, () => 0, { doy: 330, seed: 'fill' });
  flowerBed(low, ring, () => 0, { doy: 330, seed: 'fill', quality: 'low' });
  flowerBed(bare, ring, () => 0, { doy: 330, seed: 'fill', flowers: 0 });
  expect(area(high)).toBeGreaterThan(24 * .6);
  expect(area(low)).toBeGreaterThan(24 * .6);
  expect(area(bare)).toBe(0);
});
