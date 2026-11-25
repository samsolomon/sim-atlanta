import { describe, expect, it } from 'vitest';
import { DAMPING_MAX_DT_MS, frameFraction } from './camera-damping';

/** What's left of a motion after `ms` of frames every `dt` ms. */
const remaining = (per60: number, dt: number, ms: number) => {
  let left = 1;
  for (let t = 0; t < ms - 1e-9; t += dt) left *= 1 - frameFraction(per60, dt);
  return left;
};

describe('frameFraction', () => {
  it('is the per-frame value at exactly 60 Hz, so 60 Hz feels as it does today', () => {
    expect(frameFraction(0.05, 1000 / 60)).toBeCloseTo(0.05, 12);
    expect(frameFraction(0.12, 1000 / 60)).toBeCloseTo(0.12, 12);
  });
  it('decays by the same amount per second at 30, 60, 90 and 120 Hz', () => {
    const at60 = remaining(0.05, 1000 / 60, 500);
    for (const hz of [30, 90, 120]) expect(remaining(0.05, 1000 / hz, 500)).toBeCloseTo(at60, 6);
  });
  it('clamps a long frame, so the camera slows rather than jumps', () => {
    expect(frameFraction(0.05, 400)).toBeCloseTo(frameFraction(0.05, DAMPING_MAX_DT_MS), 12);
    expect(frameFraction(0.05, 0)).toBe(0);
  });
});
