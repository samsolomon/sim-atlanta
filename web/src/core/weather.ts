/**
 * Atlanta weather from Open-Meteo (free, no key), plus presets. No Three.js here, so the
 * status card on the 2D map can use it without pulling in the 3D bundle.
 */
import { ATL } from '../vignette/time';
import { freshness, serverDate } from '../live/freshness';

export type WeatherKind = 'clear' | 'cloudy' | 'overcast' | 'rain' | 'storm' | 'fog';

export interface Weather {
  kind: WeatherKind;
  cloud: number; // 0..1
  rain: number; // 0..1
  fog: number; // 0..1
  label: string;
  tempF?: number;
  live: boolean;
  /** When the observation was valid (ms), for live weather. */
  observedAt?: number;
  /** Its age when fetched, by the server's clock when known (ms). */
  ageAtFetchMs?: number;
  /** performance.now() at fetch, so later aging never depends on the client's wall clock. */
  fetchedPerf?: number;
}

/**
 * How old an observation may be and still read "weather reported". Open-Meteo's current
 * conditions are 15-minute model intervals, and the edge caches them for up to 10 minutes, so a
 * normal reading is at most about 25 minutes old; an hour allows for a late model run.
 */
export const WEATHER_MAX_AGE_MS = 60 * 60_000;

/**
 * A live observation that is still current enough to show as reported. It ages from its
 * server-relative age at fetch by monotonic time, so a client clock that runs behind or ahead
 * neither hides fresh weather nor keeps old weather.
 */
export function weatherFresh(w: Weather | null, perfNow = performance.now()): Weather | null {
  if (!w || !w.live || w.ageAtFetchMs === undefined || w.fetchedPerf === undefined) return null;
  return w.ageAtFetchMs + (perfNow - w.fetchedPerf) <= WEATHER_MAX_AGE_MS ? w : null;
}

export const PRESETS: Record<WeatherKind, Weather> = {
  clear: { kind: 'clear', cloud: 0, rain: 0, fog: 0, label: 'clear', live: false },
  cloudy: { kind: 'cloudy', cloud: 0.5, rain: 0, fog: 0, label: 'partly cloudy', live: false },
  overcast: { kind: 'overcast', cloud: 1, rain: 0, fog: 0.15, label: 'overcast', live: false },
  rain: { kind: 'rain', cloud: 1, rain: 0.7, fog: 0.3, label: 'rain', live: false },
  storm: { kind: 'storm', cloud: 1, rain: 1, fog: 0.4, label: 'thunderstorm', live: false },
  fog: { kind: 'fog', cloud: 0.8, rain: 0, fog: 1, label: 'fog', live: false },
};

/** WMO weather code (as used by Open-Meteo) → our weather. */
export function fromWmo(code: number, cloudPct: number, precipMm: number, visM: number | undefined, tempF?: number): Weather {
  const cloud = Math.min(1, Math.max(0, cloudPct / 100));
  const visFog = visM != null ? 1 - Math.min(1, Math.max(0, (visM - 300) / 9700)) : 0;
  const base = { cloud, tempF, live: true };
  if (code >= 95) return { ...base, kind: 'storm', cloud: 1, rain: 1, fog: Math.max(0.4, visFog), label: 'thunderstorm' };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    const heavy = code === 65 || code === 67 || code === 82 || precipMm > 4;
    const light = code === 51 || code === 61 || code === 80 || precipMm < 0.5;
    return { ...base, kind: 'rain', cloud: 1, rain: heavy ? 1 : light ? 0.4 : 0.7, fog: Math.max(0.25, visFog), label: code <= 57 ? 'drizzle' : heavy ? 'heavy rain' : light ? 'light rain' : 'rain' };
  }
  if (code === 45 || code === 48) return { ...base, kind: 'fog', rain: 0, fog: Math.max(0.8, visFog), label: 'fog' };
  if (code >= 71 && code <= 77) return { ...base, kind: 'overcast', cloud: 1, rain: 0, fog: 0.4, label: 'snow' }; // snow: not modelled yet
  if (code === 3) return { ...base, kind: 'overcast', rain: 0, fog: visFog * 0.6, label: 'overcast' };
  if (code === 2 || code === 1) return { ...base, kind: 'cloudy', rain: 0, fog: visFog * 0.6, label: code === 1 ? 'mostly clear' : 'partly cloudy' };
  return { ...base, kind: 'clear', rain: 0, fog: visFog * 0.6, label: 'clear' };
}

/** `time` is Unix seconds (requested with timeformat=unixtime). */
type Current = { time?: number; weather_code: number; cloud_cover: number; precipitation: number; visibility?: number; temperature_2m?: number };
type Reading = { current: Current; ageMs: number; fetchedPerf: number };
const parse = ({ current: c, ageMs, fetchedPerf }: Reading): Weather => ({
  ...fromWmo(c.weather_code, c.cloud_cover, c.precipitation, c.visibility, c.temperature_2m),
  observedAt: c.time! * 1000,
  ageAtFetchMs: Math.max(0, ageMs),
  fetchedPerf,
});

/** Current conditions, or null when unavailable, undated, stale or from the future. */
export async function getCurrent(url: string | URL, ms: number, now = Date.now): Promise<Reading | null> {
  try {
    // Never from the browser cache: an old cached reading must not pass as the present.
    const r = await fetch(url, { signal: AbortSignal.timeout(ms), cache: 'no-store' });
    if (!r.ok) return null;
    const current = ((await r.json()) as { current?: Current }).current ?? null;
    if (!current || typeof current.time !== 'number') return null;
    const observed = current.time * 1000, server = serverDate(r), client = now();
    if (freshness(observed, server, client, WEATHER_MAX_AGE_MS) !== 'fresh') return null;
    return { current, ageMs: (server ?? client) - observed, fetchedPerf: performance.now() };
  } catch {
    return null;
  }
}

/**
 * Current Atlanta weather, or null if it can't be had. Tries our worker first (one cached
 * upstream call serves everyone), then Open-Meteo directly (e.g. under plain `vite` dev).
 */
export async function fetchLive(): Promise<Weather | null> {
  const viaWorker = await getCurrent('/api/weather', 8000);
  if (viaWorker) return parse(viaWorker);
  const u = new URL('https://api.open-meteo.com/v1/forecast');
  u.search = new URLSearchParams({
    latitude: String(ATL.lat),
    longitude: String(ATL.lon),
    current: 'weather_code,cloud_cover,precipitation,visibility,temperature_2m',
    temperature_unit: 'fahrenheit',
    timezone: 'America/New_York',
    timeformat: 'unixtime',
  }).toString();
  const direct = await getCurrent(u, 8000);
  return direct ? parse(direct) : null;
}
