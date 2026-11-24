import { readFileSync } from 'node:fs';
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
    if (im.isInstancedMesh) { mix(im.count); bytes(im.instanceMatrix.array as Float32Array); }
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
});
