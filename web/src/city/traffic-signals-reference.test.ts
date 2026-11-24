import { expect, it } from 'vitest';
import { signalPositions, type CourseSignal } from './traffic-signals';
import { legacySignalPositions } from './traffic-signals-legacy';
import { rng } from '../vignette/geom';

it('matches the reference signal queue exactly on random courses, queues and clocks', () => {
  const random = rng(20261124);
  let compared = 0, queued = 0;
  for (let c = 0; c < 400; c++) {
    const length = 200 + random() * 1200, speed = 8 + random() * 10;
    const signals: CourseSignal[] = [];
    for (let s = 40 + random() * 150; s < length - 20; s += 30 + random() * 260)
      signals.push({ s, key: 'k' + Math.floor(random() * 30), axis: random() < .5 ? 0 : 1 });
    const n = Math.floor(random() * 40);
    const now = 1e6 + random() * 1e5;
    const trips = Array.from({ length: n }, () => ({ start: now - random() * (length / speed + 200), length: 4 + random() * 8 }));
    for (const t of [now, now + 7.3, now + 60]) {
      const want = legacySignalPositions(signals, length, speed, trips, t);
      expect(signalPositions(signals, length, speed, trips, t)).toEqual(want);
      compared += n;
      queued += want.filter((p, i) => p !== null && trips[i] && signals.some(sig => Math.abs(sig.s - trips[i].length / 2 - p) < 1e-9)).length;
    }
  }
  expect(compared).toBeGreaterThan(10000);
  expect(queued).toBeGreaterThan(100);
});
