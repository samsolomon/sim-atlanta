import { expect, it } from 'vitest';
import type { Pattern } from '../model/types';
import { busDistance, busTimeline } from './bus-timeline';
import { nextGreen } from './traffic-signals';

it('carries red-light and illustrative dwell delay through a backward clock seek', () => {
  const pattern: Pattern = {
    id: 'p',
    routeId: 'r',
    pathId: 'a',
    headsign: 'North',
    stops: ['a', 'b', 'c'],
    dist: [0, 100, 200],
    arr: [0, 10, 20],
    dep: [0, 10, 20],
  };
  const signal = { s: 55, key: 'intersection', axis: 0 as const };
  const start = Array.from({ length: 84 }, (_, i) => i).find((t) => nextGreen(signal.key, 0, t + 5) > t + 10)!;
  const points = busTimeline(pattern, start, [signal], 10);
  const release = nextGreen(signal.key, 0, start + 5);
  expect(busDistance(points, release + 31)).toBeNull();
  expect(busDistance(points, release + 15)).toBe(100);
  expect(busDistance(points, start + 6)).toBe(50);
  expect(busDistance(points, release + 25)).toBe(150);
});

it('waits behind a car queue with bumper clearance and carries its departure headway', () => {
  const pattern: Pattern = {
    id: 'p',
    routeId: 'r',
    pathId: 'a',
    headsign: 'North',
    stops: ['a', 'b'],
    dist: [0, 100],
    arr: [0, 100],
    dep: [0, 100],
  };
  const signal = { s: 55, key: 'queue', axis: 1 as const };
  const start = Array.from({ length: 84 }, (_, i) => i).find((t) => nextGreen(signal.key, 1, t + 50) > t + 65)!;
  const points = busTimeline(pattern, start, [signal], 10, () => ({ tail: 12, count: 2 }));
  const release = nextGreen(signal.key, 1, start + 50);
  expect(busDistance(points, start + 45)).toBe(38);
  expect(busDistance(points, release + 4)).toBe(38);
  expect(busDistance(points, release + 9)).toBe(43);
});
