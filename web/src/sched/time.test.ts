import { describe, expect, it } from 'vitest';

describe('serviceDays minute cache', () => {
  it('matches the uncached resolution across DST, midnight and random instants', async () => {
    const { serviceDays, resolveDays } = await import('./time');
    const instants = [
      '2026-03-08T06:59:59.500Z', '2026-03-08T07:00:00.000Z', '2026-03-08T07:00:30.250Z', // spring forward
      '2026-11-01T05:59:59.900Z', '2026-11-01T06:00:00.000Z', '2026-11-01T06:30:12.345Z', // fall back
      '2026-11-24T04:59:59.999Z', '2026-11-24T05:00:00.000Z', // Atlanta midnight
    ].map(Date.parse);
    let seed = 7;
    for (let i = 0; i < 2000; i++) { seed = (seed * 16807) % 2147483647; instants.push(Date.UTC(2026, 0, 1) + (seed / 2147483647) * 365 * 864e5); }
    for (const ms of instants) {
      for (const at of [ms, ms + 17, ms + 999]) {
        const got = serviceDays(new Date(at), 'America/New_York'), want = resolveDays(new Date(at), 'America/New_York');
        expect(got.map(d => d.ymd)).toEqual(want.map(d => d.ymd));
        expect(got.map(d => d.weekday)).toEqual(want.map(d => d.weekday));
        for (let k = 0; k < 2; k++) expect(got[k].secs).toBeCloseTo(want[k].secs, 6);
      }
    }
  });
});
