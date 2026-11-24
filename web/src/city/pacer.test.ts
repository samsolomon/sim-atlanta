import { describe, expect, it } from 'vitest';
import { FramePacer, refreshOf } from './pacer';

/** Feed the pacer a device whose frames take `costMs` of work on a `hz` display, for `ms`.
 * The browser calls rAF on the first refresh after the previous frame's work ends. */
function run(p: FramePacer, hz: number, costMs: (t: number) => number, ms: number) {
  const r = 1000 / hz;
  let t = 0, busyUntil = 0;
  const drawn: number[] = [];
  while (t < ms) {
    t = Math.max(t + r, Math.ceil(busyUntil / r) * r);
    if (p.tick(t)) { drawn.push(t); busyUntil = t + costMs(t); }
  }
  const dts = drawn.slice(1).map((v, i) => v - drawn[i]);
  return { dts, last: dts.slice(-60) };
}

describe('refreshOf', () => {
  it('finds a 90 Hz panel from 22.2 and 33.3 ms frames', () => {
    expect(refreshOf([22.2, 33.3, 22.2, 33.4, 33.3, 22.3, 33.3])).toBeCloseTo(1000 / 90, 1);
  });
  it('finds 60 Hz from 16.7 and 33.3 ms frames', () => {
    expect(refreshOf([16.7, 33.3, 16.6, 16.7, 33.4])).toBeCloseTo(1000 / 60, 1);
  });
  it('finds 120 Hz', () => {
    expect(refreshOf([8.3, 8.4, 16.7, 8.3, 8.3])).toBeCloseTo(1000 / 120, 1);
  });
});

describe('FramePacer', () => {
  it('draws every refresh when the device keeps up', () => {
    const p = new FramePacer();
    const { last } = run(p, 60, () => 10, 10000);
    expect(p.divisor).toBe(1);
    expect(Math.max(...last)).toBeLessThan(17);
  });
  it('locks a 90 Hz phone that alternates 22 and 33 ms to a steady 30 fps', () => {
    const p = new FramePacer();
    // About 25 ms of work: every frame misses 2 refreshes, many miss 3.
    const { last } = run(p, 90, t => 21 + 8 * Math.abs(Math.sin(t)), 20000);
    expect(p.divisor).toBe(3);
    expect(new Set(last.map(Math.round))).toEqual(new Set([33]));
  });
  it('never paces below 30 fps', () => {
    const p = new FramePacer();
    run(p, 60, () => 60, 20000);
    expect(p.divisor).toBe(2);
  });
  it('returns to full rate once the load goes', () => {
    const p = new FramePacer({ probeMs: 2000 });
    run(p, 60, t => (t < 5000 ? 25 : 8), 20000);
    expect(p.divisor).toBe(1);
  });
});
