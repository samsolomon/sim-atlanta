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

/** The last minute resolved per time zone. Zone offsets change only on whole minutes, so the
 * calendar fields hold for the whole minute and only the seconds advance. */
const minuteCache = new Map<string, { minute: number; ymd: number; weekday: number; secs: number; yYmd: number }>();

/**
 * The service days that can have trains running at `date`: today, and yesterday
 * (GTFS trips that started yesterday may run past midnight, e.g. "25:10:00").
 */
export function serviceDays(date: Date, tz: string): [ServiceDay, ServiceDay] {
  const ms = date.getTime(), minute = Math.floor(ms / 60000);
  let c = minuteCache.get(tz);
  if (!c || c.minute !== minute) {
    const [today, yesterday] = resolveDays(new Date(minute * 60000), tz);
    c = { minute, ymd: today.ymd, weekday: today.weekday, secs: today.secs, yYmd: yesterday.ymd };
    minuteCache.set(tz, c);
  }
  const secs = c.secs + (ms - c.minute * 60000) / 1000;
  return [
    { ymd: c.ymd, weekday: c.weekday, secs },
    { ymd: c.yYmd, weekday: (c.weekday + 6) % 7, secs: secs + 86400 },
  ];
}

/** The uncached resolution, once per minute per zone (and the reference in tests). */
export function resolveDays(date: Date, tz: string): [ServiceDay, ServiceDay] {
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
