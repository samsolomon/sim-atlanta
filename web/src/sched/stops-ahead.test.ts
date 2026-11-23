import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Schedule } from './engine';

const dir = new URL('../../public/data/ga/', import.meta.url);
const have = existsSync(new URL('timetable.json', dir));
const json = (f: string) => JSON.parse(readFileSync(new URL(f, dir), 'utf8'));

describe.skipIf(!have)('All stops (needs pnpm data)', () => {
  it('lists a timetable train’s stops ahead, starting at its next stop, in time order', () => {
    const sched = new Schedule(json('routes.json'), json('timetable.json'), json('vehicle-types.json'));
    const at = new Date('2026-11-20T14:00:00-05:00');
    const t = sched.trainsAt(at).find((x) => x.nextStop)!;
    const stops = sched.stopsAhead(t, at);
    expect(stops.length).toBeGreaterThan(0);
    expect(stops[0].stopId).toBe(t.nextStop);
    const times = stops.map((s) => s.inSec!);
    expect(times.every((s, i) => s != null && (i === 0 || s >= times[i - 1]))).toBe(true);
  });
  it('gives a live train names without times', () => {
    const sched = new Schedule(json('routes.json'), json('timetable.json'), json('vehicle-types.json'));
    const at = new Date('2026-11-20T14:00:00-05:00');
    const t = sched.trainsAt(at).find((x) => x.nextStop)!;
    const stops = sched.stopsAhead({ id: 'marta:live:123', pathId: t.pathId, nextStop: t.nextStop }, at);
    expect(stops.length).toBeGreaterThan(0);
    expect(stops.every((s) => s.inSec === null)).toBe(true);
  });
});
