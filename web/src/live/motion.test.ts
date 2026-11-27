import { describe, expect, it } from 'vitest';
import { appendFix, appendReservedFix, RESERVE_DELAY_MS, playback, type Knot } from './motion';

describe('live rail motion on 30-second reports', () => {
  it.each([
    { fixes: [0, 300, 600, 900, 1200, 1500], speeds: [10, 10, 10] },
    { fixes: [0, 300, 600, 600, 600, 900], speeds: [10, 0, 0] },
  ])('passes every fix, matching speed through cruise and dwell', ({ fixes, speeds }) => {
    const knots: Knot[] = [];
    const drawn: number[] = [];
    for (let seconds = 0; seconds <= 210; seconds++) {
      if (seconds % 30 === 0 && seconds / 30 < fixes.length)
        appendFix(knots, fixes[seconds / 30], seconds * 1000, 60_000);
      drawn.push(playback(knots, seconds * 1000, 60_000));
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

it.each([0, 2, 5, 20])('keeps Train 101 bounded with a report %i seconds late', late => {
  const arrivals = [0, 30, 60, 90 + late, 120, 150, 180];
  const fixes = [0, 200, 400, 600, 600, 800, 900];
  const history: Knot[] = [];
  let newest = 0, previous = 0;
  for (let quarter = 0; quarter <= 880; quarter++) {
    const t = quarter / 4;
    const index = arrivals.indexOf(t);
    if (index >= 0) {
      newest = fixes[index];
      appendReservedFix(history, newest, t * 1000);
    }
    const s = playback(history, t * 1000, RESERVE_DELAY_MS);
    expect(s).toBeGreaterThanOrEqual(previous - 1e-8);
    expect(s).toBeLessThanOrEqual(newest + 1e-8);
    if (!late && [75, 90, 105].includes(t)) expect((s - previous) * 4).toBeCloseTo(200 / 30);
    if (!late && t >= 130 && t <= 160) expect(s).toBe(600);
    if (late === 20 && t >= 100 && t <= 110) expect(s).toBe(400);
    previous = s;
  }
});
