import { describe, expect, it } from 'vitest';
import { gaussianTaps } from './glass';

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
