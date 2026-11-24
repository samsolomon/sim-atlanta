import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { GroundGrid } from './grid';
import { GroundSurface } from './surface';

const dir = new URL('../../../pipeline/prototypes/downtown-ground/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('ground.json', dir), 'utf8'));
const bytes = new Uint8Array(readFileSync(new URL('ground.i16', dir)));
const grid = new GroundGrid(manifest, bytes.buffer);
const fixture = readFileSync(new URL('georgia-state-section.csv', dir), 'utf8').trim().split('\n').slice(1);

function patch(values: number[][]) {
  const rows = values.length, cols = values[0].length;
  const binary = new ArrayBuffer(2 * cols * rows), view = new DataView(binary);
  values.flat().forEach((h, i) => view.setInt16(2 * i, h, true));
  return new GroundGrid({ ...manifest, rows, cols, stepM: 5, bounds: { minX: 0, minZ: 0,
    maxX: (cols - 1) * 5, maxZ: (rows - 1) * 5 }, vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 0 } }, binary);
}

it.each(['low', 'high'] as const)('grounds the Georgia State approach on the %s mesh', quality => {
  const ground = new GroundSurface(grid, quality);
  for (const line of fixture) {
    const [, , x, z, baked] = line.split(',');
    const sample = grid.sample(+x, +z)!;
    expect(Math.abs(sample - +baked)).toBeLessThanOrEqual(0.00501);
    const drawn = ground.sampleScene(+x, +z);
    expect(drawn).not.toBeNull();
    // Triangle interpolation on steep cells differs from the bilinear DEM query.
    expect(Math.abs(drawn! + manifest.vertical.sceneZeroNavd88M - sample)).toBeLessThan(1);
  }
  expect(ground.sampleScene(652.70, 519.28)! - ground.sampleScene(701.70, 543.88)!).toBeCloseTo(8.16, 0);
  expect(ground.sampleScene(1000, 700)).not.toBeNull();
  expect(ground.sampleScene(1000.01, 700)).toBeNull();
  ground.geometry.dispose();
});

it.each(['low', 'high'] as const)('preserves voids and cuts only above a finite sloping bed on %s', quality => {
  const flat = Array.from({ length: 7 }, () => Array(7).fill(100));
  flat[1][1] = -32768;
  const surface = new GroundSurface(patch(flat), quality, [
    { start: [11, 8, 16], end: [21, 12, 16], halfWidthM: 1 },
  ]);
  expect(surface.sampleScene(5, 5)).toBeNull();
  expect(surface.sampleScene(6, 6)).toBeNull();
  expect(surface.sampleScene(14, 16)).toBeNull();       // ground above bed inside a 2 m slot
  expect(surface.sampleScene(14, 17.1)).toBeCloseTo(10); // outside width
  expect(surface.sampleScene(10.9, 16)).toBeCloseTo(10); // before start
  expect(surface.sampleScene(18, 16)).toBeCloseTo(10);   // ground below bed
  expect(surface.sampleScene(21.1, 16)).toBeCloseTo(10);
  expect(surface.sampleScene(30, 30)).toBeCloseTo(10);
});

it('stitches a 10 m patch to its 5 m neighbour without an interior T-junction', () => {
  const values = Array.from({ length: 3 }, () => Array(5).fill(100));
  values[1][3] = 170;
  const surface = new GroundSurface(patch(values), 'low');
  const pos = surface.geometry.getAttribute('position'), idx = surface.geometry.index!;
  const sharedEdges: number[][] = [];
  for (let i = 0; i < idx.count; i += 3) {
    for (let j = 0; j < 3; j++) {
      const a = idx.getX(i + j), b = idx.getX(i + (j + 1) % 3);
      if (pos.getX(a) === 10 && pos.getX(b) === 10) sharedEdges.push([pos.getZ(a), pos.getZ(b)]);
    }
  }
  expect(sharedEdges.sort()).toEqual([[0,5],[5,0],[5,10],[10,5]].sort());
});

it.each(['low', 'high'] as const)('a surface built from typed arrays (the Worker path) matches the main-thread one exactly on %s', async quality => {
  const { buildSurfaceArrays, nodeHeights } = await import('./surface-build');
  const { surfaceSpec } = await import('./surface');
  const openings = [{ start: [300, -5, 100] as const, end: [420, -8, 160] as const, halfWidthM: 6 }];
  const join = { x: 1000, minZ: -1300, maxZ: 700 };
  const main = new GroundSurface(grid, quality, openings, join);
  const spec = surfaceSpec(grid);
  const { heights, minY } = nodeHeights(spec, (r, c) => grid.node(r, c));
  const built = buildSurfaceArrays({ spec, heights, minY, quality, openings, join, farErrorM: 2 });
  const worker = new GroundSurface(grid, quality, openings, join, built);
  for (const name of ['position', 'uv', 'normal'] as const) {
    const a = main.geometry.getAttribute(name).array, b = worker.geometry.getAttribute(name).array;
    expect(b.length).toBe(a.length);
    expect(Array.from(b)).toEqual(Array.from(a));
  }
  expect(worker.geometry.index!.array.constructor).toBe(main.geometry.index!.array.constructor);
  expect(Array.from(worker.geometry.index!.array)).toEqual(Array.from(main.geometry.index!.array));
  expect(worker.minY).toBe(main.minY);
  for (const [x, z] of [[0, 0], [412.3, -655.1], [999.9, 699.9], [350, 120]]) expect(worker.sampleScene(x, z)).toBe(main.sampleScene(x, z));
  const farMain = main.farGeometry(2), farWorker = worker.farGeometry(2);
  for (const name of ['position', 'uv', 'normal'] as const)
    expect(Array.from(farWorker.getAttribute(name).array)).toEqual(Array.from(farMain.getAttribute(name).array));
  expect(Array.from(farWorker.index!.array)).toEqual(Array.from(farMain.index!.array));
  // The settled far level adopts from the Worker the same way (sections.ts passes farLower).
  const settledBuilt = buildSurfaceArrays({ spec, heights: nodeHeights(spec, (r, c) => grid.node(r, c)).heights, minY, quality, openings, join, farErrorM: 2, farLower: true });
  const settledWorker = new GroundSurface(grid, quality, openings, join, settledBuilt);
  expect(settledWorker.hasPrebuiltFar(2, true)).toBe(true);
  expect(settledWorker.hasPrebuiltFar(2, false)).toBe(false);
  expect(Array.from(settledWorker.farGeometry(2, 160, true).getAttribute('position').array))
    .toEqual(Array.from(main.farGeometry(2, 160, true).getAttribute('position').array));
});
