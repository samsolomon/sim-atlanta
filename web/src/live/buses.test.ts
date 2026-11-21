import { afterEach, expect, it, vi } from 'vitest';
import { LiveBuses } from './buses';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('expires individual cached fixes using server time even when the phone clock is fast', async () => {
  const served = Date.parse('2026-11-21T00:00:00Z');
  vi.spyOn(Date, 'now').mockReturnValue(served + 900_000);
  const monotonic = vi.spyOn(performance, 'now').mockReturnValue(25_000);
  const position = { id: 'marta:bus:1', lon: -84.4, lat: 33.75 };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
    source: 'marta-bus-rt', fetched: served - 25_000, buses: [
      { ...position, at: served - 175_000 },
      { ...position, id: 'marta:bus:2', at: served - 185_000 },
      { ...position, id: 'marta:bus:3', at: null },
    ],
  }), { headers: { Date: new Date(served).toUTCString() } })));
  const live = new LiveBuses();
  await live.poll();
  expect(live.current().map(bus => bus.id)).toEqual(['marta:bus:1']);
  expect(live.current()[0].position.asOf).toBe(new Date(served - 175_000).toISOString());
  monotonic.mockReturnValue(31_000);
  expect(live.current()).toEqual([]);
  await live.poll();
  expect(fetch).toHaveBeenCalledTimes(1);
});
