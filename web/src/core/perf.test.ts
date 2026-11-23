import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { perf, targetBytes, textureBytes } from './perf';

describe('perf', () => {
  it('measures fps and frame-time percentiles from rAF stamps', () => {
    // 60 frames at 20 ms, then one 100 ms hitch.
    let ts = 100000;
    for (let i = 0; i < 60; i++) perf.frame((ts += 20), 1, 2);
    perf.frame((ts += 100), 1, 2);
    const f = perf.fps(10000);
    expect(f.p50).toBe(20);
    expect(f.max).toBe(100);
    expect(f.fps).toBeCloseTo((60 * 1000) / (59 * 20 + 100), 0);
    expect(f.updateP50).toBe(1);
    expect(f.renderP50).toBe(2);
  });

  it('marks ready only once colour is revealed and a frame has drawn', () => {
    perf.phase('city:revealed');
    expect(perf.phases.some(p => p.name === 'ready')).toBe(false);
    perf.phase('city:first-frame');
    expect(perf.phases.filter(p => p.name === 'ready')).toHaveLength(1);
  });

  it('estimates texture bytes with mipmaps and render targets without', () => {
    const t = new THREE.DataTexture(new Uint8Array(256 * 128 * 4), 256, 128);
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    expect(textureBytes(t)).toEqual({ gpu: Math.round(256 * 128 * 4 * 4 / 3), cpu: 256 * 128 * 4 });
    t.minFilter = THREE.LinearFilter;
    expect(textureBytes(t).gpu).toBe(256 * 128 * 4);
    const rt = new THREE.WebGLRenderTarget(100, 50, { type: THREE.HalfFloatType });
    expect(targetBytes(rt)).toBe(100 * 50 * 8 + 100 * 50 * 4);
  });
});
