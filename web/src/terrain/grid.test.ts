import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { GroundGrid } from './grid';

const folder = new URL('../../../pipeline/prototypes/downtown-ground/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('ground.json', folder), 'utf8'));
const bytes = new Uint8Array(readFileSync(new URL('ground.i16', folder)));

it('agrees with the pipeline at every Blue/Green ground probe', () => {
  const grid = new GroundGrid(manifest, bytes.buffer);
  const csv = readFileSync(new URL('samples.csv', folder), 'utf8').trim().split('\n');
  for (const row of csv.slice(1)) {
    const [, , x, z, , ground, north, south] = row.split(',').map(Number);
    expect(grid.sample(x, z)).toBeCloseTo(ground, 2);
    expect(grid.sample(x, z - 50)).toBeCloseTo(north, 2);
    expect(grid.sample(x, z + 50)).toBeCloseTo(south, 2);
  }
  expect(grid.sample(0, 0)).toBeCloseTo(manifest.vertical.sceneZeroNavd88M);
});

it('preserves exact edges, voids and outside-board samples', () => {
  const copy = bytes.slice();
  new DataView(copy.buffer).setInt16(copy.byteLength - 2, manifest.noData, true);
  const grid = new GroundGrid(manifest, copy.buffer);
  const { maxX, maxZ } = manifest.bounds;
  expect(grid.sample(maxX, maxZ)).toBeNull();
  expect(grid.sample(maxX - 1, maxZ - 1)).toBeNull();
  expect(grid.sample(maxX - 5, maxZ)).toEqual(grid.node(manifest.rows - 1, manifest.cols - 2));
  expect(grid.sample(maxX + 1, maxZ)).toBeNull();
});
