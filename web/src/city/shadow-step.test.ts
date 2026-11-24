import { describe, expect, it } from 'vitest';
import { shadowStepM } from './shadow-step';

describe('shadowStepM', () => {
  const box = 1040; // low: 2 x 520 m
  it('keeps the target inside the shadow box at every orbit', () => {
    for (const orbit of [150, 420, 700, 1000, 3000, 6000, 12000, 21084, 40000]) {
      const step = shadowStepM(orbit, 80, box);
      // Re-centring happens 0.6 of a step from the centre: that travel must stay inside the half box.
      expect(step * 0.6).toBeLessThan(box / 2);
      expect(step).toBeLessThanOrEqual(box / 4);
      expect(step).toBeGreaterThanOrEqual(80);
    }
  });
  it('grows from 80 m near and caps at a quarter of the box far out', () => {
    expect(shadowStepM(420, 80, box)).toBe(80);
    expect(shadowStepM(1000, 80, box)).toBe(150);
    expect(shadowStepM(21084, 80, box)).toBe(260);
  });
});
