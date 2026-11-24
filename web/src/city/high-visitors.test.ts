import { expect, it } from 'vitest';
import { highSeats, highWalkerPose, highWalkers, museumCrowd } from './high-visitors';

it('uses Atlanta museum hours across both daylight-saving offsets', () => {
  const crowd = (time: string) => museumCrowd(Date.parse(time));
  expect(crowd('2026-11-20T18:00:00Z')).toBe(8);
  expect(crowd('2026-07-17T16:00:00Z')).toBe(8);
  expect(crowd('2026-11-20T16:00:00Z')).toBe(5);
  expect(crowd('2026-11-20T23:00:00Z')).toBe(2);
  expect(crowd('2026-11-21T04:00:00Z')).toBe(0);
  expect(crowd('2026-11-23T18:00:00Z')).toBe(1);
});

it('places visitors on the ramp deck and faces café chairs toward their tables', () => {
  const time = Date.parse('2026-11-20T18:00:00Z') / 1000;
  const ground = (x: number) => (x === 515 ? 10 : 8);
  const walker = highWalkers[1];
  const p = highWalkerPose(walker, time, ground)!;
  expect(p.y).toBeGreaterThan(8.1);
  expect(p.y).toBeLessThan(12.32);
  expect(highWalkerPose(walker, time, ground)).toEqual(p);
  for (const seat of highSeats) {
    expect(seat.x + 0.72 * Math.sin(seat.angle)).toBeCloseTo(seat.table[0], 6);
    expect(seat.z + 0.72 * Math.cos(seat.angle)).toBeCloseTo(seat.table[1], 6);
  }
});
