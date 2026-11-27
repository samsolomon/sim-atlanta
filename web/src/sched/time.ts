import type { Service } from '../model/types';

export interface ServiceDay {
  /** YYYYMMDD */
  ymd: number;
  /** 0 = Monday … 6 = Sunday */
  weekday: number;
  /** Seconds since local midnight of this service day at the instant asked for. */
  secs: number;
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();

function fmt(tz: string) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    });
    fmtCache.set(tz, f);
  }
  return f;
}

const WEEKDAYS: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/**
 * The service days that can have trains running at `date`: today, and yesterday
 * (GTFS trips that started yesterday may run past midnight, e.g. "25:10:00").
 */
export function serviceDays(date: Date, tz: string): [ServiceDay, ServiceDay] {
  const p = Object.fromEntries(fmt(tz).formatToParts(date).map((x) => [x.type, x.value]));
  const ymd = Number(`${p.year}${p.month}${p.day}`);
  const secs = Number(p.hour) * 3600 + Number(p.minute) * 60 + Number(p.second) + (date.getMilliseconds() / 1000);
  const weekday = WEEKDAYS[p.weekday];
  const y = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) - 1));
  const yYmd = y.getUTCFullYear() * 10000 + (y.getUTCMonth() + 1) * 100 + y.getUTCDate();
  return [
    { ymd, weekday, secs },
    { ymd: yYmd, weekday: (weekday + 6) % 7, secs: secs + 86400 },
  ];
}

export function serviceRuns(s: Service, day: { ymd: number; weekday: number }): boolean {
  if (s.removed.includes(day.ymd)) return false;
  if (s.added.includes(day.ymd)) return true;
  return (s.days & (1 << day.weekday)) !== 0 && s.start <= day.ymd && day.ymd <= s.end;
}

/** The last date (YYYYMMDD) a feed's calendar publishes service for: its latest `end` or added date. */
export function feedEnd(services: Service[]): number {
  let end = 0;
  for (const s of services) {
    if (s.end > end) end = s.end;
    for (const d of s.added) if (d > end) end = d;
  }
  return end;
}

const ymdUtc = (ymd: number) => Date.UTC(Math.floor(ymd / 10000), (Math.floor(ymd / 100) % 100) - 1, ymd % 100);
const utcYmd = (ms: number) => {
  const d = new Date(ms);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
};
/** 0 = Monday … 6 = Sunday, for a YYYYMMDD date. */
export const weekdayOf = (ymd: number) => (new Date(ymdUtc(ymd)).getUTCDay() + 6) % 7;

/**
 * The published day a service day past the feed's end repeats: the same weekday in the last
 * full published week (the seven days ending on `end`). Days on or before `end` map to themselves.
 */
export function projectedSource(day: { ymd: number; weekday: number }, end: number): { ymd: number; weekday: number } {
  if (day.ymd <= end) return day;
  const back = (weekdayOf(end) - day.weekday + 7) % 7;
  return { ymd: utcYmd(ymdUtc(end) - back * 86_400_000), weekday: day.weekday };
}

/** calendar.txt alone (weekday mask and date range), with calendar_dates exceptions dropped:
 * a projected week repeats regular service, not one year's holidays. */
export function serviceRunsRegular(s: Service, day: { ymd: number; weekday: number }): boolean {
  return (s.days & (1 << day.weekday)) !== 0 && s.start <= day.ymd && day.ymd <= s.end;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "Dec 11" for 20261211, from the digits themselves (no time zone can shift the day). */
export const shortYmd = (ymd: number) => `${MONTHS[(Math.floor(ymd / 100) % 100) - 1]} ${ymd % 100}`;
