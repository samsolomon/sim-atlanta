import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CityGlass, gaussianTaps } from './glass';

describe('glass blur kernel', () => {
  it('sums to one, so the backing keeps the scene brightness', () => {
    for (const sigma of [2.75, 5.5, 11]) {
      const t = gaussianTaps(sigma);
      expect(t.w0 + 2 * t.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    }
  });
  it('places each linear tap between its two texels, nearer the heavier one', () => {
    const t = gaussianTaps(11);
    t.offsets.forEach((o, i) => {
      expect(o).toBeGreaterThanOrEqual(2 * i + 1);
      expect(o).toBeLessThanOrEqual(2 * i + 2);
      expect(o).toBeLessThan(2 * i + 1.5);
    });
  });
  it('covers about three sigma at the desktop radius (22 CSS px at pr 2, quarter res)', () => {
    const t = gaussianTaps(11);
    expect(t.offsets.at(-1)!).toBeGreaterThan(30);
  });
});

it('clears grade rectangles on the CSS handoff and draws the new position on return', () => {
  const glass = new CityGlass();
  const target = new THREE.WebGLRenderTarget(16, 16);
  const renderer = { getRenderTarget: () => null, setRenderTarget() {}, render() {} } as unknown as THREE.WebGLRenderer;
  const draw = () => glass.pass.render(renderer, target, target, 0, false);
  const source = { count: 1, version: 0, data: new Float32Array([1, 2, 5, 6, 2, 15, 1]) };
  const { uGlassCount, uGlassRect } = glass.gradeHook.uniforms;
  try {
    glass.setSize(16, 16, 1);
    glass.prepare(source);
    draw();
    expect(uGlassCount.value).toBe(1);
    glass.prepare(null);
    expect(uGlassCount.value).toBe(0);
    expect(glass.pass.enabled).toBe(false);
    source.data[0] = 7;
    source.version++;
    glass.prepare(source);
    expect(glass.pass.enabled).toBe(true);
    expect(uGlassCount.value).toBe(0);
    draw();
    expect(uGlassCount.value).toBe(1);
    expect(uGlassRect.value[0].x).toBe(7);
  } finally {
    target.dispose();
    glass.dispose();
  }
});
