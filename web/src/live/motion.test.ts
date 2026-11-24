import { describe, expect, it } from 'vitest';
import { appendFix, playback, type Knot } from './motion';

describe('live rail motion on 30-second reports', () => {
  it.each([
    { fixes: [0, 300, 600, 900, 1200, 1500], speeds: [10, 10, 10] },
    { fixes: [0, 300, 600, 600, 600, 900], speeds: [10, 0, 0] },
  ])('passes every fix, matching speed through cruise and dwell', ({ fixes, speeds }) => {
    const knots: Knot[] = [];
    const drawn: number[] = [];
    for (let seconds = 0; seconds <= 210; seconds++) {
      if (seconds % 30 === 0 && seconds / 30 < fixes.length)
        appendFix(knots, fixes[seconds / 30], seconds * 1000);
      drawn.push(playback(knots, seconds * 1000));
      expect(drawn[seconds]).toBeLessThanOrEqual(fixes[Math.min(Math.floor(seconds / 30), fixes.length - 1)]);
    }
    fixes.forEach((s, i) => expect(drawn[60 + 30 * i]).toBeCloseTo(s));
    speeds.forEach((v, i) => {
      const t = 90 + i * 30;
      expect(Math.abs(drawn[t] - drawn[t - 1] - v)).toBeLessThan(1);
      expect(Math.abs(drawn[t + 1] - drawn[t] - v)).toBeLessThan(1);
    });
  });
});
