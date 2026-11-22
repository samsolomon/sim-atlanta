import type { BusFeed, LiveBus, Sourced } from '../model/types';

const POLL_MS = 30_000;
const MAX_AGE_MS = 180_000;

export class LiveBuses {
  private buses: LiveBus[] = [];
  private nextPoll = 0;
  unavailable = false;
  private pending = false;
  private serverOffset = 0;

  observationNow() {
    return performance.now() + this.serverOffset;
  }

  async poll() {
    if (this.pending || performance.now() < this.nextPoll) return;
    this.nextPoll = performance.now() + POLL_MS;
    this.pending = true;
    try {
      const response = await fetch('/api/marta/bus');
      if (!response.ok) throw new Error('MARTA bus feed unavailable');
      const feed: BusFeed = await response.json();
      const served = Date.parse(response.headers.get('Date') ?? '');
      this.serverOffset = (Number.isFinite(served) ? Math.max(served, feed.fetched) : feed.fetched) - performance.now();
      this.buses = feed.buses.map(fix => {
        const asOf = fix.at === null ? '' : new Date(fix.at).toISOString();
        const sourced = <T>(value: T): Sourced<T> => ({ value, tier: 'live', source: feed.source, asOf });
        return {
          id: fix.id, at: fix.at, position: sourced({ lon: fix.lon, lat: fix.lat }),
          routeId: fix.routeId === undefined ? undefined : sourced(fix.routeId),
          bearing: fix.bearing === undefined ? undefined : sourced(fix.bearing),
          speed: fix.speed === undefined ? undefined : sourced(fix.speed),
        };
      });
      this.unavailable = false;
    } catch {
      this.unavailable = true;
      // Keep showing the previous observations until their individual fixes expire.
    } finally {
      this.pending = false;
    }
  }

  /**
   * Poll on a timer, independent of any map or view, while `active()` holds (for example the
   * clock is the real present and the page is visible). poll() throttles to one request per
   * 30 s, so other callers polling too add no requests. Returns a stop function.
   */
  heartbeat(active: () => boolean, everyMs = 1000) {
    const id = setInterval(() => {
      if (active()) void this.poll();
    }, everyMs);
    return () => clearInterval(id);
  }

  current(): LiveBus[] {
    const now = this.observationNow();
    return this.buses.filter(bus => bus.at !== null && bus.at <= now && now - bus.at <= MAX_AGE_MS);
  }
}
