import { afterEach, describe, expect, it, vi } from 'vitest';

// The clock reads ?t / ?speed from the page URL at import.
vi.hoisted(() => {
  (globalThis as { location?: unknown }).location ??= { search: '' };
});
import { TrainSource } from '../core/trains';
import { clock } from '../core/clock';
import type { Schedule } from '../sched/engine';
import { confidence, confidenceWords, railStatus } from '../ui/status';
import { freshness } from './freshness';
import { LiveMarta, STALE_MS } from './marta';

const NOW = Date.UTC(2026, 10, 24, 6, 0, 0);
const MIN = 60_000;

const schedule = {
  pathsFor: () => [],
  path: () => undefined,
  routes: new Map(),
  vehicleTypes: new Map(),
  trainsAt: () => [],
} as unknown as Schedule;

function feed(fetched: number) {
  return { fetched, trains: [{ id: 'marta:train:101', line: 'RED', direction: 'N', destination: 'North Springs', lat: 33.75, lon: -84.39, at: fetched - 20_000 }] };
}

/** One poll against a stubbed Worker response; `date` is the response's Date header. */
async function pollWith(live: LiveMarta, body: unknown, date: number | null, status = 200) {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (date !== null) headers.set('Date', new Date(date).toUTCString());
  const fetchSpy = vi.fn(async () => new Response(JSON.stringify(body), { status, headers }));
  vi.stubGlobal('fetch', fetchSpy);
  (live as unknown as { lastFetch: number }).lastFetch = -Infinity;
  await live.poll();
  return fetchSpy;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('freshness', () => {
  it('accepts a current feed and rejects old or future ones', () => {
    expect(freshness(NOW - 30_000, NOW, NOW, STALE_MS)).toBe('fresh');
    expect(freshness(NOW - 4 * 60 * MIN, NOW, NOW, STALE_MS)).toBe('stale');
    expect(freshness(NOW + 10 * MIN, NOW, NOW, STALE_MS)).toBe('future');
  });

  it('rejects a browser-cached response by its own old Date, even though its body matches that Date', () => {
    // Production, 2026-11-24: a 4-hour-old 200 replayed from the browser cache.
    const then = NOW - 4 * 60 * MIN;
    expect(freshness(then - 5_000, then, NOW, STALE_MS)).toBe('stale');
  });

  it('tolerates a client clock that runs behind, using the server Date', () => {
    const clientBehind = NOW - 2 * 60 * MIN;
    expect(freshness(NOW - 30_000, NOW, clientBehind, STALE_MS)).toBe('fresh');
    // ...and still rejects an old feed against that server clock.
    expect(freshness(NOW - 10 * MIN, NOW, clientBehind, STALE_MS)).toBe('stale');
  });

  it('falls back to the timetable when the client clock runs ahead (the safe direction)', () => {
    expect(freshness(NOW - 30_000, NOW, NOW + 10 * MIN, STALE_MS)).toBe('stale');
  });

  it('uses the client clock when there is no Date header', () => {
    expect(freshness(NOW - 30_000, null, NOW, STALE_MS)).toBe('fresh');
    expect(freshness(NOW - 10 * MIN, null, NOW, STALE_MS)).toBe('stale');
    expect(freshness(Number.NaN, null, NOW, STALE_MS)).toBe('stale');
  });
});

describe('LiveMarta', () => {
  it('fetches past the browser cache', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const live = new LiveMarta(schedule);
    const spy = await pollWith(live, feed(NOW - 15_000), NOW);
    expect(spy).toHaveBeenCalledWith('/api/marta/rail', { cache: 'no-store' });
  });

  it('shows a fresh feed as live', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const live = new LiveMarta(schedule);
    await pollWith(live, feed(NOW - 15_000), NOW);
    expect(live.error).toBeNull();
    expect(live.count).toBe(1);
    expect(live.available).toBe(true);
  });

  it('drops a 4-hour-old snapshot, reports it stale, and does not count it as a success', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const live = new LiveMarta(schedule);
    await pollWith(live, feed(NOW - 15_000), NOW);
    expect(live.available).toBe(true);
    const then = NOW - 4 * 60 * MIN;
    await pollWith(live, feed(then - 5_000), then);
    expect(live.error).toBe('stale');
    expect(live.count).toBe(0);
    expect(live.available).toBe(false);
  });

  it('rejects a feed stamped in the future', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const live = new LiveMarta(schedule);
    await pollWith(live, feed(NOW + 30 * MIN), NOW);
    expect(live.error).toBe('future');
    expect(live.available).toBe(false);
  });

  it('accepts a fresh feed when the client clock runs two hours behind', async () => {
    vi.useFakeTimers({ now: NOW - 2 * 60 * MIN, toFake: ['Date'] });
    const live = new LiveMarta(schedule);
    await pollWith(live, feed(NOW - 15_000), NOW);
    expect(live.error).toBeNull();
    expect(live.count).toBe(1);
  });

  it('reads Timetable, not Live trains, for a stale feed at the real present', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    vi.spyOn(clock, 'isRealTime').mockReturnValue(true);
    const live = new LiveMarta(schedule);
    const source = new TrainSource(schedule, live);
    const words = () => confidenceWords(confidence({ realTime: true, rail: railStatus(source.liveActive, live.error) }, false));
    await pollWith(live, feed(NOW - 15_000), NOW);
    expect(words()[0]).toBe('Live trains');
    const then = NOW - 4 * 60 * MIN;
    await pollWith(live, feed(then - 5_000), then);
    expect(source.liveActive).toBe(false);
    expect(railStatus(source.liveActive, live.error)).toBe('down');
    expect(words()[0]).toBe('Timetable');
    expect(source.update(new Date(NOW)).some((t) => t.s.tier === 'live')).toBe(false);
  });
});

it('distinguishes a delayed first observation from a completed empty response', async () => {
  let finish!: (value: Response) => void;
  const response = new Promise<Response>(resolve => { finish = resolve; });
  vi.stubGlobal('fetch', () => response);
  const feed = new LiveMarta(schedule);
  expect(feed.firstPollComplete).toBe(false);
  const poll = feed.poll();
  await Promise.resolve();
  expect(feed.firstPollComplete).toBe(false);
  finish(new Response(JSON.stringify({ fetched: Date.now(), trains: [] })));
  await poll;
  expect(feed.firstPollComplete).toBe(true);
});

it('keeps the original observation across duplicate and delayed fixes and expires it between polls', async () => {
  vi.useFakeTimers({ now: NOW, toFake: ['Date', 'performance'] });
  const live = new LiveMarta(schedule);
  const first = feed(NOW);
  await pollWith(live, first, NOW);
  const observed = first.trains[0].at;
  for (const at of [observed, observed - 1000]) {
    vi.advanceTimersByTime(30_000);
    const delayed = feed(Date.now());
    delayed.trains[0] = { ...delayed.trains[0], at, lon: -84.4 };
    await pollWith(live, delayed, Date.now());
    expect(live.trains()[0]).toMatchObject({ observedAt: observed, lon: first.trains[0].lon });
  }
  vi.advanceTimersByTime(STALE_MS - (Date.now() - observed));
  expect(live.available).toBe(false);
  expect(live.trains()).toEqual([]);
});
