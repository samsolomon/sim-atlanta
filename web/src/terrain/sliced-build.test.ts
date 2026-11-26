import { existsSync, readFileSync } from 'node:fs';
import * as THREE from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { runEveryStep, runSync } from '../core/slice';
import { neighborhoodTrees } from '../city/neighborhood-trees';
import { midtownLights } from '../city/midtown-night';
import { joins } from '../square-board/sections';
import { GroundGrid } from './grid';
import { buildDowntownTerrain } from './model';

const dir = new URL('../../../pipeline/prototypes/square-board/midtown-central/', import.meta.url);
const grid = () => new GroundGrid(JSON.parse(readFileSync(new URL('ground.json', dir), 'utf8')), Uint8Array.from(readFileSync(new URL('ground.i16', dir))).buffer);
const context = JSON.parse(readFileSync(new URL('context.json', dir), 'utf8'));
afterEach(() => vi.unstubAllGlobals());

/** Every drawn thing: names, positions, indices, instance matrices and counts, as one hash. */
function fingerprint(root: THREE.Object3D) {
  let h = 2166136261, draws = 0;
  const mix = (v: number) => { h ^= v; h = Math.imul(h, 16777619) >>> 0; };
  const bytes = (a: ArrayLike<number> & { buffer?: ArrayBufferLike }) => {
    const f = a instanceof Float32Array ? new Uint32Array(a.buffer, a.byteOffset, a.length) : a;
    for (let i = 0; i < f.length; i++) mix(f[i] | 0);
  };
  root.updateMatrixWorld(true);
  root.traverse(o => {
    for (const c of o.name) mix(c.charCodeAt(0));
    mix(o.visible ? 1 : 0);
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    draws += Array.isArray(m.material) ? m.material.length : 1;
    bytes(o.matrixWorld.elements.map(v => Math.round(v * 1e4)));
    const g = m.geometry;
    bytes(g.getAttribute('position').array as Float32Array);
    if (g.index) bytes(g.index.array as Uint32Array);
    const im = o as THREE.InstancedMesh;
    // Only drawn instances: slots past count may keep stale values that never draw.
    if (im.isInstancedMesh) {
      mix(im.count);
      bytes((im.instanceMatrix.array as Float32Array).subarray(0, 16 * im.count));
      // A zero-scale instance draws nothing; its stale colour is not part of the picture.
      const mat = im.instanceMatrix.array as Float32Array, col = im.instanceColor?.array as Float32Array | undefined;
      if (col) for (let i = 0; i < im.count; i++) if (mat[16 * i] || mat[16 * i + 5] || mat[16 * i + 10]) bytes(col.subarray(3 * i, 3 * i + 3));
    }
  });
  return { hash: h.toString(16), draws };
}

it.each(['low', 'high'] as const)('a Midtown row built with a yield after every step equals the synchronous build on %s', async quality => {
  const ctx = new Proxy({}, { get: () => () => { } });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  const options = () => ({ quality, bottomY: -48, join: joins('midtown-central'), lights: midtownLights });
  const sync = runSync(buildDowntownTerrain(grid(), context, neighborhoodTrees(context, quality), options()));
  const a = fingerprint(sync.group);
  sync.dispose();
  let steps = 0;
  // Between steps, do what a frame does to shared state: spend randomness and allocate.
  const sliced = await runEveryStep(buildDowntownTerrain(grid(), context, neighborhoodTrees(context, quality), options()), () => {
    steps++;
    for (let i = 0; i < 16; i++) Math.random();
    new THREE.Vector3().setScalar(Math.random()).normalize();
  });
  const b = fingerprint(sliced.group);
  sliced.dispose();
  expect(steps).toBeGreaterThan(8);
  expect(a.draws).toBeGreaterThan(20);
  expect(b).toEqual(a);
}, 60_000);

// The staged rows (pnpm data) carry the canopy crowns the prototype fixture lacks, so generic
// trees, their seasons and the tree rollout are covered too.
const staged = new URL('../../public/data/scene/square-board/brookwood-south/', import.meta.url);
const hasStaged = existsSync(new URL('context.json', staged));
// Rows whose landmark modules build in steps: the arts campus (midtown-upper), Bank of America
// Plaza (midtown-south), plus Brookwood's crowns and rollout.
const stagedRows = (['brookwood-south', 'midtown-upper', 'midtown-south'] as const)
  .filter(r => existsSync(new URL(`../${r}/context.json`, staged)));
it.skipIf(!hasStaged).each(stagedRows.flatMap(row => (['low', 'high'] as const).map(q => [row, q] as const)))('the staged %s row builds the same sliced as synchronously on %s', async (row, quality) => {
  const ctx = new Proxy({}, { get: () => () => { } });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  const dir = new URL(`../${row}/`, staged);
  const g = () => new GroundGrid(JSON.parse(readFileSync(new URL('ground.json', dir), 'utf8')), Uint8Array.from(readFileSync(new URL('ground.i16', dir))).buffer);
  const c = JSON.parse(readFileSync(new URL('context.json', dir), 'utf8'));
  const options = () => ({ quality, bottomY: -48, join: joins(row), lights: midtownLights,
    rollout: { row, lowCount: c.treeLowCount, allCrowns: c.trees } });
  const sync = runSync(buildDowntownTerrain(g(), c, neighborhoodTrees(c, quality), options()));
  const a = fingerprint(sync.group);
  sync.dispose();
  const sliced = await runEveryStep(buildDowntownTerrain(g(), c, neighborhoodTrees(c, quality), options()), () => { Math.random(); });
  const b = fingerprint(sliced.group);
  sliced.dispose();
  expect(c.trees.length).toBeGreaterThan(100);
  expect(b).toEqual(a);
// Two full builds of a staged row: ~1-2 s alone, several times that in a parallel full suite.
}, 60_000);

it.skipIf(!hasStaged)('building with today\'s day of year equals building for summer then setting the season', () => {
  const ctx = new Proxy({}, { get: () => () => { } });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  const g = () => new GroundGrid(JSON.parse(readFileSync(new URL('ground.json', staged), 'utf8')), Uint8Array.from(readFileSync(new URL('ground.i16', staged))).buffer);
  const c = JSON.parse(readFileSync(new URL('context.json', staged), 'utf8'));
  for (const doy of [324, 15, 200]) {
    const options = { quality: 'high' as const, bottomY: -48, join: joins('brookwood-south'), lights: midtownLights };
    const summer = runSync(buildDowntownTerrain(g(), c, neighborhoodTrees(c, 'high'), options));
    summer.setSeason(doy);
    const today = runSync(buildDowntownTerrain(g(), c, neighborhoodTrees(c, 'high'), { ...options, dayOfYear: doy }));
    today.setSeason(doy);
    expect(fingerprint(today.group)).toEqual(fingerprint(summer.group));
    summer.dispose(); today.dispose();
  }
// Six full builds of a staged row.
}, 120_000);
