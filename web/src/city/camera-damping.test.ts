import { describe, expect, it } from 'vitest';
import { DAMPING_MAX_DT_MS, coastTau, frameFraction, releaseCoast, wheelShare } from './camera-damping';

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

describe('direct manipulation release', () => {
  it('coasts at the pointer velocity of the last 50 ms, for velocity x tau in total', () => {
    // 10 px per 16.7 ms frame for the last 6 frames: 0.6 px/ms; tau 325 ms.
    const trail = Array.from({ length: 6 }, (_, i) => ({ t: 1000 + i * (1000 / 60), amount: 10 }));
    const now = 1000 + 5 * (1000 / 60);
    const coast = releaseCoast(trail, now, coastTau(0.05));
    expect(coastTau(0.05)).toBeCloseTo(325, 0);
    expect(coast).toBeGreaterThan(150);
    expect(coast).toBeLessThan(250);
  });
  it('gives no coast when the pointer was held still before release', () => {
    const trail = [{ t: 1000, amount: 10 }, { t: 1016, amount: 10 }];
    expect(releaseCoast(trail, 1400, coastTau(0.05))).toBe(0);
  });
});

describe('wheel easing', () => {
  it('lands the whole notch within ~120 ms at any frame rate', () => {
    for (const dt of [1000 / 30, 1000 / 60, 1000 / 120]) {
      let left = 1;
      for (let t = 0; t < 120; t += dt) left *= 1 - wheelShare(dt, 40);
      expect(left).toBeLessThan(0.06);
    }
  });
});
