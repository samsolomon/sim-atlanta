import { describe, expect, it } from 'vitest';
import { treeProbe } from './rollout-city';

describe('rollout diagnostic isolation', () => {
  it.each(['mask-off', 'shadow-off', 'foliage-off', 'carpet-off'])('gates %s behind active perf and low quality', probe => {
    expect(treeProbe(`?perf=run&treeprobe=${probe}`, 'low')).toBe(probe);
    expect(treeProbe(`?treeprobe=${probe}`, 'low')).toBeNull();
    expect(treeProbe(`?perf=off&treeprobe=${probe}`, 'low')).toBeNull();
    expect(treeProbe(`?perf=0&treeprobe=${probe}`, 'low')).toBeNull();
    expect(treeProbe(`?perf=run&treeprobe=${probe}`, 'high')).toBeNull();
  });
  it('keeps control and unknown probe values unchanged', () => {
    expect(treeProbe('?perf=run', 'low')).toBeNull();
    expect(treeProbe('?perf=run&treeprobe=typo', 'low')).toBeNull();
  });
});

import * as THREE from 'three';
import { vi, afterEach } from 'vitest';
import { RolloutBatch, rolloutPlantings } from './rollout-city';
import { inkFoliageCount, FoliageMaskPass } from '../vignette/ink';
afterEach(() => vi.unstubAllGlobals());

it('unregisters far masks, preserves hysteresis and restores mounts/reopens without stale uniforms', () => {
  vi.stubGlobal('location', { search: '' });
  const initial = inkFoliageCount(), batch = new RolloutBatch(), camera = new THREE.PerspectiveCamera();
  const scene = new THREE.Scene(); scene.add(batch.group);
  const spots = [{ x: 650, z: -3672, y: 42.28 }];
  const first = rolloutPlantings(spots, 'low', batch)!; batch.flush();
  expect(inkFoliageCount()).toBe(initial + 1);
  batch.update(0, camera, 700);
  expect(inkFoliageCount()).toBe(initial);
  const ink = { uniforms: { uFoliage: { value: 1 }, tMask: { value: new THREE.Texture() } } };
  const pass = new FoliageMaskPass(scene, camera, ink);
  const rt = new THREE.WebGLRenderTarget(1, 1);
  pass.render({} as THREE.WebGLRenderer, rt, rt);
  expect(ink.uniforms.uFoliage.value).toBe(0);
  expect(ink.uniforms.tMask.value).not.toBe(pass.target.texture);
  const second = rolloutPlantings([{ x: 700, z: -3700, y: 0 }], 'low', batch)!; batch.flush();
  expect(inkFoliageCount()).toBe(initial);
  batch.update(0, camera, 550); expect(inkFoliageCount()).toBe(initial);
  batch.update(0, camera, 420); expect(inkFoliageCount()).toBe(initial + 1);
  batch.update(0, camera, 550); expect(inkFoliageCount()).toBe(initial + 1);
  batch.update(0, camera, 601); expect(inkFoliageCount()).toBe(initial);
  first.dispose(); second.dispose(); batch.flush();
  expect(inkFoliageCount()).toBe(initial);
  const reopened = rolloutPlantings(spots, 'low', batch)!; batch.flush();
  batch.update(0, camera, 350); expect(inkFoliageCount()).toBe(initial + 1);
  reopened.dispose(); batch.flush(); expect(inkFoliageCount()).toBe(initial);
  pass.dispose(); rt.dispose();
});

it.each(['high', 'low'] as const)('preserves forced control and high masks at far range: %s', quality => {
  vi.stubGlobal('location', { search: '?perf=run&treeprobe=mask-on' });
  const initial = inkFoliageCount(), batch = new RolloutBatch();
  const planted = rolloutPlantings([{ x: 650, z: -3672, y: 42.28 }], quality, batch)!;
  batch.flush(); const nearCount = inkFoliageCount(); expect(nearCount).toBeGreaterThan(initial);
  batch.update(0, new THREE.PerspectiveCamera(), 10000);
  expect(inkFoliageCount()).toBe(nearCount);
  planted.dispose(); batch.flush(); expect(inkFoliageCount()).toBe(initial);
});
