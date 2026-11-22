import { describe, expect, it } from 'vitest';
import type { Pattern, Service } from '../model/types';
import { distanceAt, ease, pointAt } from './engine';
import { serviceDays, serviceRuns } from './time';

const pattern: Pattern = {
  id: 'p',
  routeId: 'r',
  pathId: 'path',
  headsign: 'North',
  stops: ['a', 'b', 'c'],
  dist: [0, 1000, 3000],
  arr: [0, 100, 300],
  dep: [20, 130, 300],
};

describe('distanceAt', () => {
  it('dwells at stops and moves between them', () => {
    expect(distanceAt(pattern, 0).s).toBe(0);
    expect(distanceAt(pattern, 10).s).toBe(0); // still dwelling at a
    expect(distanceAt(pattern, 60).s).toBeCloseTo(500, 0); // halfway, eased midpoint is exact
    expect(distanceAt(pattern, 110).s).toBe(1000); // dwelling at b
    expect(distanceAt(pattern, 110).nextStop).toBe(2);
    expect(distanceAt(pattern, 300).s).toBe(3000);
  });

  it('eases with zero speed at the ends', () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBeCloseTo(1, 10);
    expect(ease(0.01)).toBeLessThan(0.001);
  });
});

describe('pointAt', () => {
  const g = { coords: Float64Array.from([-84, 33, -84, 33.01]), cum: Float64Array.from([0, 1112]) };
  it('interpolates and reports a northward heading', () => {
    const p = pointAt(g, 556);
    expect(p.lat).toBeCloseTo(33.005, 4);
    expect(p.heading).toBeCloseTo(0, 3);
  });
});

describe('service calendar', () => {
  const svc: Service = { id: 'wk', days: 0b0011111, start: 20260101, end: 20261231, added: [20261122], removed: [20261126] };
  it('applies weekday mask and calendar_dates exceptions', () => {
    expect(serviceRuns(svc, { ymd: 20261120, weekday: 4 })).toBe(true); // Friday
    expect(serviceRuns(svc, { ymd: 20261121, weekday: 5 })).toBe(false); // Saturday
    expect(serviceRuns(svc, { ymd: 20261122, weekday: 6 })).toBe(true); // added Sunday
    expect(serviceRuns(svc, { ymd: 20261126, weekday: 3 })).toBe(false); // removed Thursday
  });

  it('includes yesterday as an after-midnight service day', () => {
    // 00:30 ET on Saturday 2026-11-21 = 05:30 UTC
    const [today, yesterday] = serviceDays(new Date('2026-11-21T05:30:00Z'), 'America/New_York');
    expect(today).toMatchObject({ ymd: 20261121, weekday: 5, secs: 1800 });
    expect(yesterday).toMatchObject({ ymd: 20261120, weekday: 4, secs: 1800 + 86400 });
  });
});

it('identifies the current scheduled call separately from the next stop and adds no dwell', () => {
  expect(distanceAt(pattern, 0).atStop).toBe(0);
  expect(distanceAt(pattern, 20).atStop).toBeUndefined();
  expect(distanceAt(pattern, 99.999).atStop).toBeUndefined();
  expect(distanceAt(pattern, 100)).toMatchObject({ atStop: 1, s: 1000, nextStop: 2 });
  expect(distanceAt(pattern, 129.999).atStop).toBe(1);
  expect(distanceAt(pattern, 130).atStop).toBeUndefined();
  expect(distanceAt(pattern, 300).atStop).toBe(2);
  const zeroDwell = { ...pattern, dep: pattern.arr };
  expect(distanceAt(zeroDwell, 100)).toMatchObject({ atStop: 1, s: 1000, nextStop: 2 });
  expect(distanceAt(zeroDwell, 100.001).atStop).toBeUndefined();
});
