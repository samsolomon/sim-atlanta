/**
 * Past a GTFS feed's last published date the timetable repeats its last full published week by
 * weekday, calendar_dates exceptions dropped, and every repeated trip is `inferred`, never
 * `scheduled` (Sam, 2026-11-26). Synthetic calendars pin the rules; MARTA's real feed (which
 * ends 2026-12-11) pins the boundary when the data is built.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Pattern, RoutesFile, Service, TimetableFile, VehicleType } from '../model/types';
import { confidence, confidenceWords, feedNotice, frozenTrains, projectionText } from '../ui/status';
import { Schedule } from './engine';
import { feedEnd, projectedSource, shortYmd, weekdayOf } from './time';

const pattern: Pattern = { id: 'p', routeId: 'marta:route:RED', pathId: 'path', headsign: 'RED NORTHBOUND', stops: ['a', 'b'], dist: [0, 1000], arr: [0, 1800], dep: [0, 1800] };
// The feed ends Friday 2026-12-11; its last full week is Saturday Dec 5 to Friday Dec 11.
const services: Service[] = [
  // Weekdays, with a removed date inside the last week: projected, the exception is dropped.
  { id: 'wk', days: 0b0011111, start: 20260822, end: 20261211, added: [], removed: [20261209] },
  // Holiday-only: runs only through an added date, so it never repeats.
  { id: 'holiday', days: 0, start: 20260822, end: 20261211, added: [20261207], removed: [] },
  // Saturdays, but ending before the last week: nothing to repeat on Saturdays.
  { id: 'old-sat', days: 0b0100000, start: 20260822, end: 20261128, added: [], removed: [] },
  // Sundays, with an after-midnight trip.
  { id: 'sun', days: 0b1000000, start: 20260822, end: 20261211, added: [], removed: [] },
];
const H = 3600;
const tf: TimetableFile = {
  sourceAsOf: { 'marta-gtfs': '' },
  timetables: [{
    feed: 'marta', timezone: 'America/New_York', patterns: [pattern], services,
    trips: [[0, 0, 8 * H, ''], [0, 0, 25 * H + 50 * 60, ''], [0, 1, 9 * H, 'H'], [0, 2, 10 * H, 'S'], [0, 3, 24 * H + 30 * 60, 'N']],
  }],
};
const rf = {
  routes: [{ id: 'marta:route:RED', mode: 'heavy_rail', shortName: 'RED', longName: 'Red', operator: 'MARTA', color: 'd22030', vehicleType: 'vt' }],
  stops: [], paths: [{ id: 'path', coords: [-84.4, 33.7, -84.4, 33.71], cum: [0, 1112] }],
} as unknown as RoutesFile;
const sched = new Schedule(rf, tf, [{ id: 'vt', name: 'car', lengthM: 23, typicalUnits: 6, art: 'x' } as VehicleType]);
const at = (iso: string) => sched.trainsAt(new Date(iso));

describe('calendar helpers', () => {
  it('finds the end, the weekday and the repeated day', () => {
    expect(feedEnd(services)).toBe(20261211);
    expect(feedEnd([{ ...services[1], added: [20261224] }])).toBe(20261224);
    expect(weekdayOf(20261211)).toBe(4); // Friday
    expect(projectedSource({ ymd: 20261215, weekday: 1 }, 20261211)).toEqual({ ymd: 20261208, weekday: 1 });
    expect(projectedSource({ ymd: 20261212, weekday: 5 }, 20261211)).toEqual({ ymd: 20261205, weekday: 5 });
    expect(projectedSource({ ymd: 20261211, weekday: 4 }, 20261211)).toEqual({ ymd: 20261211, weekday: 4 });
    expect(projectedSource({ ymd: 20270101, weekday: 4 }, 20261211)).toEqual({ ymd: 20261211, weekday: 4 });
    expect(shortYmd(20261211)).toBe('Dec 11');
  });
});

describe('past the feed end', () => {
  it('repeats weekday service as inferred, with the exception dropped and no holiday service', () => {
    // Wednesday Dec 16 repeats Wednesday Dec 9, a removed date in the published feed.
    const trains = at('2026-12-16T08:10:00-05:00');
    expect(trains).toHaveLength(1);
    expect(trains[0].s.tier).toBe('inferred');
    expect(trains[0].projectedFrom).toEqual({ feed: 'marta', agency: 'MARTA', ended: 20261211 });
    // The trip id keeps the real service day, so it stays unique and its stops resolve.
    expect(trains[0].id).toBe(`marta:trip:0-${8 * H}-20261216`);
    // Monday Dec 14 repeats Monday Dec 7: the weekday trip only, never the holiday-only one.
    expect(at('2026-12-14T09:10:00-05:00')).toHaveLength(0);
    expect(at('2026-12-14T08:10:00-05:00').map((t) => t.label)).toEqual([undefined]);
    // Saturday: the only Saturday service ended before the last week.
    expect(at('2026-12-12T10:10:00-05:00')).toHaveLength(0);
  });

  it('keeps the last published day scheduled through its after-midnight trips', () => {
    // 01:55 on Saturday Dec 12: Friday's 25:50 trip is real.
    const t = at('2026-12-12T01:55:00-05:00');
    expect(t.map((x) => x.s.tier)).toEqual(['scheduled']);
    expect(t[0].projectedFrom).toBeUndefined();
    expect(sched.projectionsAt(new Date('2026-12-12T01:55:00-05:00'))).toEqual([]);
    // Once it ends (26:20), the moment has no real schedule.
    expect(sched.projectionsAt(new Date('2026-12-12T02:21:00-05:00'))).toEqual([{ feed: 'marta', agency: 'MARTA', ended: 20261211 }]);
  });

  it("projects a later day's after-midnight trips from its own weekday", () => {
    // 00:40 on Monday Dec 14: Sunday Dec 13's 24:30 trip, repeated from Sunday Dec 6.
    const t = at('2026-12-14T00:40:00-05:00');
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ label: 'N', s: { tier: 'inferred' }, id: `marta:trip:0-${24 * H + 30 * 60}-20261213` });
  });

  it('leaves the published feed untouched', () => {
    // Inside the feed the removed date and the added holiday still apply, all scheduled.
    expect(at('2026-12-09T08:10:00-05:00')).toHaveLength(0);
    const holiday = at('2026-12-07T09:10:00-05:00');
    expect(holiday.map((t) => t.label)).toEqual(['H']);
    for (const iso of ['2026-12-07T08:10:00-05:00', '2026-12-11T08:10:00-05:00', '2026-12-07T09:10:00-05:00']) {
      for (const t of at(iso)) {
        expect(t.s.tier).toBe('scheduled');
        expect('projectedFrom' in t).toBe(false);
      }
      expect(sched.projectionsAt(new Date(iso))).toEqual([]);
    }
  });
});

describe('the words a projection shows', () => {
  const p = { feed: 'marta', agency: 'MARTA', ended: 20261211 };
  it('names the source on the card and Inferred in the corner', () => {
    expect(projectionText(p)).toBe('Inferred from MARTA’s last published timetable (ended Dec 11)');
    const c = confidence({ realTime: false, rail: 'live', projected: p }, false);
    expect(c.tier).toBe('inferred');
    expect(confidenceWords(c)).toEqual(['Inferred', 'illustrative sky']);
    expect(confidenceWords(confidence({ realTime: false, rail: 'live', projected: null }, false))[0]).toBe('Timetable');
  });
  it('keeps Live first at the real present', () => {
    expect(confidence({ realTime: true, rail: 'live', projected: p }, true).tier).toBe('live');
    expect(feedNotice({ realTime: true, rail: 'live', projected: p })).toBeNull();
  });
  it('says what is shown when the live feed is down', () => {
    expect(confidence({ realTime: true, rail: 'down', projected: p }, true).tier).toBe('inferred');
    expect(feedNotice({ realTime: true, rail: 'down', projected: p })).toBe('Live feed unavailable · showing trains inferred from MARTA’s last timetable');
    expect(feedNotice({ realTime: true, rail: 'down', projected: null })).toBe('Live feed unavailable · showing the timetable');
    expect(frozenTrains(p)).toBe('Trains inferred from MARTA’s last published timetable.');
    expect(frozenTrains(null)).toBe('Trains from the timetable.');
  });
});

const dir = resolve(__dirname, '../../public/data/ga');
const has = existsSync(resolve(dir, 'timetable.json'));
const load = <T>(f: string): T => (has ? JSON.parse(readFileSync(resolve(dir, f), 'utf8')) : undefined) as T;
const realEnds = has && load<TimetableFile>('timetable.json').timetables.some((t) => t.feed === 'marta' && feedEnd(t.services) === 20261211);

// Only the feed that ends Dec 11; a newer MARTA feed moves these dates, and the synthetic tests still hold.
describe.skipIf(!realEnds)('MARTA feed ending 2026-12-11', () => {
  // Built on first use: a skipped suite's body still runs at collection, without the data.
  let built: Schedule | undefined;
  const sched = () => (built ??= new Schedule(load<RoutesFile>('routes.json'), load<TimetableFile>('timetable.json'), load<VehicleType[]>('vehicle-types.json')));
  const real = { trainsAt: (d: Date) => sched().trainsAt(d), projectionsAt: (d: Date) => sched().projectionsAt(d) };
  const marta = (iso: string) => real.trainsAt(new Date(iso)).filter((t) => t.routeId.startsWith('marta:'));

  it('runs real trips until 02:11 on Dec 12, then reads Inferred', () => {
    const lastEnd = (sched() as unknown as { tables: { feed: string; lastEndSecs: number }[] }).tables.find((t) => t.feed === 'marta')!.lastEndSecs;
    expect(lastEnd).toBe(26 * H + 11 * 60);
    expect(marta('2026-12-12T02:10:00-05:00').every((t) => t.s.tier === 'scheduled')).toBe(true);
    expect(real.projectionsAt(new Date('2026-12-12T02:10:00-05:00'))).toEqual([]);
    expect(real.projectionsAt(new Date('2026-12-12T02:12:00-05:00')).map((p) => p.agency)).toEqual(['MARTA']);
  });

  it('fills Dec 15 with inferred rail and streetcar trips', () => {
    // The streetcar starts after 08:00 on published Tuesdays too, so it is checked at 10:00.
    const t = [...marta('2026-12-15T08:00:00-05:00'), ...marta('2026-12-15T10:00:00-05:00')];
    expect(t.filter((x) => x.routeId === 'marta:route:STREETCAR').length).toBeGreaterThan(0);
    expect(marta('2026-12-15T08:00:00-05:00').length).toBeGreaterThan(15);
    for (const x of t) expect(x).toMatchObject({ s: { tier: 'inferred' }, projectedFrom: { agency: 'MARTA', ended: 20261211 } });
  });

  it('never shows an inferred trip while the corner could read Timetable', () => {
    // Minute by minute across the boundary night.
    for (let ms = Date.parse('2026-12-11T20:00:00-05:00'); ms <= Date.parse('2026-12-12T08:00:00-05:00'); ms += 60_000) {
      const d = new Date(ms);
      if (marta(d.toISOString()).some((t) => t.s.tier === 'inferred')) expect(real.projectionsAt(d)).not.toEqual([]);
    }
  });

  it('changes nothing inside the feed', () => {
    for (const iso of ['2026-11-20T14:00:00-05:00', '2026-11-26T12:00:00-05:00', '2026-11-21T00:30:00-05:00', '2026-12-11T23:30:00-05:00']) {
      expect(real.projectionsAt(new Date(iso))).toEqual([]);
      for (const t of real.trainsAt(new Date(iso))) {
        expect(t.s.tier).toBe('scheduled');
        expect('projectedFrom' in t).toBe(false);
      }
    }
  });
});
