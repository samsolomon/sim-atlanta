import { afterEach, expect, it, vi } from 'vitest';
import { fetchLive, getCurrent, WEATHER_MAX_AGE_MS, weatherFresh } from './weather';

const NOW = Date.UTC(2026, 10, 24, 6, 0, 0);
const MIN = 60_000;
const current = (timeMs: number | string) => ({
  current: { time: typeof timeMs === 'number' ? timeMs / 1000 : timeMs, weather_code: 3, cloud_cover: 90, precipitation: 0, temperature_2m: 51 },
});
function serve(body: unknown, date: number | null = NOW) {
  const headers = new Headers();
  if (date !== null) headers.set('Date', new Date(date).toUTCString());
  const spy = vi.fn(async (_url: string | URL, _init?: RequestInit) => new Response(JSON.stringify(body), { headers }));
  vi.stubGlobal('fetch', spy);
  return spy;
}
afterEach(() => vi.unstubAllGlobals());

it('reads a current observation, fetched past the browser cache', async () => {
  const spy = serve(current(NOW - 10 * MIN));
  expect(await getCurrent('/api/weather', 1000, () => NOW)).not.toBeNull();
  expect(spy.mock.calls[0][1]?.cache).toBe('no-store');
});

it('never reports an observation older than the limit', async () => {
  expect(WEATHER_MAX_AGE_MS).toBe(60 * MIN);
  serve(current(NOW - 4 * 60 * MIN));
  expect(await getCurrent('/api/weather', 1000, () => NOW)).toBeNull();
  // A browser-cached response: its Date is as old as its body.
  serve(current(NOW - 4 * 60 * MIN - 5 * MIN), NOW - 4 * 60 * MIN);
  expect(await getCurrent('/api/weather', 1000, () => NOW)).toBeNull();
});

it('rejects undated (pre-unixtime) and future observations', async () => {
  serve(current('2026-11-24T01:00'));
  expect(await getCurrent('/api/weather', 1000, () => NOW)).toBeNull();
  serve(current(NOW + 30 * MIN));
  expect(await getCurrent('/api/weather', 1000, () => NOW)).toBeNull();
});

it('accepts a fresh observation when the client clock runs behind', async () => {
  serve(current(NOW - 10 * MIN));
  expect(await getCurrent('/api/weather', 1000, () => NOW - 2 * 60 * MIN)).not.toBeNull();
});

it('stamps live weather with its observation time and lets it age out of "reported"', async () => {
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  try {
    serve(current(NOW - 10 * MIN));
    const w = await fetchLive();
    expect(w?.live).toBe(true);
    expect(w?.observedAt).toBe(NOW - 10 * MIN);
    expect(weatherFresh(w, NOW)).toBe(w);
    expect(weatherFresh(w, NOW + 55 * MIN)).toBeNull();
    expect(weatherFresh(null, NOW)).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});
