import { describe, expect, it } from 'vitest';
import { capRing } from './placeholder.node';

describe('placeholder bake rings', () => {
  it('caps a ring the simplifier cannot shrink (review: it hung the bake)', () => {
    // 59 vertices 2 m apart with z alternating 1 and 0.01, then (120, 0) and (60, −1): at 1.5 m and
    // above the simplifier would keep only two points and so returns its input.
    const ring: [number, number][] = [[0, 0]];
    for (let i = 1; i <= 59; i++) ring.push([i * 2, i % 2 ? 1 : 0.01]);
    ring.push([120, 0], [60, -1]);
    const capped = capRing(ring);
    expect(capped.length).toBeGreaterThanOrEqual(3);
    expect(capped.length).toBeLessThanOrEqual(40);
    // It still spans the footprint.
    const xs = capped.map(p => p[0]);
    expect(Math.min(...xs)).toBeLessThan(1);
    expect(Math.max(...xs)).toBeGreaterThan(119);
  });

  it('leaves a ring within the cap alone', () => {
    const square: [number, number][] = [[0, 0], [10, 0], [10, -10], [0, -10]];
    expect(capRing(square)).toEqual(square);
  });
});
