import { readFileSync } from 'node:fs';
import { afterEach, expect, it } from 'vitest';
import { GroundGrid, type GroundManifest } from './grid';
import { GroundSurface } from './surface';

const source = new URL('../../../pipeline/prototypes/', import.meta.url);
const boards = ['downtown-ground', 'king-memorial/ground', 'sweet-auburn/ground',
  ...['north-band', 'north-corner', 'south-band', 'south-corner', 'midtown-south', 'midtown-central', 'midtown-upper', 'brookwood-south', 'brookwood-station']
    .map(id => 'square-board/' + id)];
const grid = (path: string) => new GroundGrid(JSON.parse(readFileSync(new URL(path + '/ground.json', source), 'utf8')),
  Uint8Array.from(readFileSync(new URL(path + '/ground.i16', source))).buffer);
const defaults = { merge: GroundSurface.mergeLow, tolerance: GroundSurface.lowTolerance };
afterEach(() => { GroundSurface.mergeLow = defaults.merge; GroundSurface.lowTolerance = defaults.tolerance; });

/** Plan length of edges used by exactly one triangle: the board rim, voids and openings.
 * Longer quads only regroup that rim; a T-junction crack adds open length on both sides. */
function openEdges(surface: GroundSurface) {
  const idx = surface.geometry.index!, p = surface.geometry.getAttribute('position');
  const key = (i: number) => `${p.getX(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
  const count = new Map<string, [number, number]>();
  for (let n = 0; n < idx.count; n += 3) for (let e = 0; e < 3; e++) {
    const i = idx.getX(n + e), j = idx.getX(n + (e + 1) % 3), a = key(i), b = key(j), k = a < b ? a + '|' + b : b + '|' + a;
    const len = Math.hypot(p.getX(i) - p.getX(j), p.getZ(i) - p.getZ(j));
    count.set(k, [(count.get(k)?.[0] ?? 0) + 1, len]);
  }
  return Math.round([...count.values()].filter(([c]) => c === 1).reduce((s, [, l]) => s + l, 0));
}

it('merges flat low-tier ground into 20 m quads without opening a crack, on every committed board', () => {
  let before = 0, after = 0;
  for (const path of boards) {
    const g = grid(path);
    GroundSurface.useOriginalLow();
    const old = new GroundSurface(g, 'low');
    Object.assign(GroundSurface, { mergeLow: defaults.merge, lowTolerance: defaults.tolerance });
    const now = new GroundSurface(g, 'low');
    expect(openEdges(now), path).toBe(openEdges(old));
    // Within the tolerance of the old low surface everywhere (each is within it of the DEM nodes), on a 2.5 m lattice.
    const { bounds } = g.manifest;
    for (let x = bounds.minX + 1.25; x < bounds.maxX; x += 2.5) for (let z = bounds.minZ + 1.25; z < bounds.maxZ; z += 2.5) {
      const a = old.sampleScene(x, z), b = now.sampleScene(x, z);
      if (a === null || b === null) { expect(b === null, `${path} ${x},${z}`).toBe(a === null); continue; }
      expect(Math.abs(a - b), `${path} ${x},${z}`).toBeLessThanOrEqual(defaults.tolerance + 0.2 + 1e-6);
    }
    before += old.geometry.index!.count / 3; after += now.geometry.index!.count / 3;
  }
  console.log(`low ground triangles, committed boards: ${before} -> ${after} (${(100 * (1 - after / before)).toFixed(0)}% fewer)`);
  // About half the triangles (1.10M → 0.58M); fail if a change loses most of the saving.
  expect(after).toBeLessThan(before * 0.6);
});

it('keeps a lone 20 m flat patch watertight against detailed neighbours', () => {
  // 13 × 13 nodes at 5 m: flat everywhere except a bump at one corner block.
  const rows = 13, cols = 13, raw = new Int16Array(rows * cols).fill(3000);
  raw[10 * cols + 10] = 3030;
  const manifest: GroundManifest = { version: 1, rows, cols, stepM: 5, bounds: { minX: 0, maxX: 60, minZ: 0, maxZ: 60 },
    scaleM: .1, offsetM: 0, noData: -32768, encoding: 'signed int16 little-endian', vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 }, sha256: 'synthetic' };
  GroundSurface.useOriginalLow();
  const old = new GroundSurface(new GroundGrid(manifest, raw.buffer), 'low');
  Object.assign(GroundSurface, { mergeLow: defaults.merge, lowTolerance: defaults.tolerance });
  const now = new GroundSurface(new GroundGrid(manifest, raw.buffer), 'low');
  expect(openEdges(now)).toBe(openEdges(old));
  expect(now.geometry.index!.count).toBeLessThan(old.geometry.index!.count);
  expect(now.sampleScene(50, 50)).toBeCloseTo(3, 6);
});
