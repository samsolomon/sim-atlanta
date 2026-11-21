/**
 * One atmosphere for every view: where the sun is, and what the weather is doing. Time of day
 * and weather are independent layers (a rainy dusk is both), so they're separate numbers here.
 * Map, glass and (later) City all read this; the playground (`?tune`) can override any of it.
 */
import type { Weather } from './weather';
import { sunPosition } from '../vignette/time';

export interface Atmosphere {
  /** Sun elevation and azimuth in degrees (azimuth clockwise from north). */
  sunElev: number;
  sunAz: number;
  /** 0 = full day, 1 = full night (civil twilight blends between). */
  dark: number;
  cloud: number; // 0..1
  rain: number; // 0..1
  snow: number; // 0..1
  fog: number; // 0..1
}

export interface AtmosphereOverride {
  /** Local Atlanta hour 0–24 instead of the clock's. */
  hour?: number;
  cloud?: number;
  rain?: number;
  snow?: number;
  fog?: number;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Darkness from sun elevation: day above +2°, night below −8° (around nautical twilight). */
export const darkness = (elev: number) => 1 - smooth(-8, 2, elev);

export function atmosphere(now: Date, w: Weather | null, o: AtmosphereOverride = {}): Atmosphere {
  let at = now;
  if (o.hour != null) {
    // Same Atlanta date, chosen hour: shift by the difference in local hours.
    const local = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(now)) % 24;
    const mins = now.getMinutes() / 60;
    at = new Date(now.getTime() + (o.hour - (local + mins)) * 3_600_000);
  }
  const sun = sunPosition(at);
  const snowing = w?.label === 'snow';
  return {
    sunElev: sun.elevation,
    sunAz: sun.azimuth,
    dark: darkness(sun.elevation),
    cloud: o.cloud ?? w?.cloud ?? 0,
    rain: o.rain ?? (snowing ? 0 : (w?.rain ?? 0)),
    snow: o.snow ?? (snowing ? 0.7 : 0),
    fog: o.fog ?? w?.fog ?? 0,
  };
}
