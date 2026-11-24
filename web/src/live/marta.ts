/**
 * Live MARTA rail: polls the Worker, snaps each GPS fix onto the line's path, and
 * glides trains between fixes so they don't teleport every 30–60 s.
 */
import type { TrainState } from '../model/types';
import { nearestOnPath, pointAt, type Schedule } from '../sched/engine';
import { freshness, serverDate } from './freshness';

interface LiveTrain {
  id: string;
  line: string;
  direction: string;
  destination: string;
  lat: number;
  lon: number;
  /** When MARTA observed this position (ms); null if MARTA didn't say. */
  at: number | null;
  nextStation?: string;
  nextInSec?: number;
}

interface Feed {
  fetched: number;
  trains: LiveTrain[];
}

interface Tracked {
  raw: LiveTrain;
  routeId: string;
  pathId: string | null;
  from: number; // s at start of glide
  to: number; // s of latest fix
  glideStart: number; // performance.now()
}

/** 30 s keeps one open tab at ~2,900 Worker requests/day on the free tier (100k/day). */
const POLL_MS = 30_000;
const GLIDE_MS = 8_000;
/** A fix further than this from every candidate path is drawn where reported, unsnapped. */
const MAX_SNAP_M = 250;
/** Live data older than this is treated as unavailable (fall back to the timetable). */
export const STALE_MS = 3 * 60_000;

export class LiveMarta {
  private tracked = new Map<string, Tracked>();
  private lastFetch = -Infinity;
  private lastOk = 0;
  error: string | null = null;
  onUpdate: () => void = () => {};

  constructor(
    private schedule: Schedule,
    private url = '/api/marta/rail',
  ) {}

  start() {
    const tick = () => {
      if (document.visibilityState === 'visible') void this.poll();
    };
    tick();
    setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
  }

  /** True when we have recent live positions to show instead of the timetable. */
  get available() {
    return this.tracked.size > 0 && Date.now() - this.lastOk < STALE_MS;
  }

  get count() {
    return this.tracked.size;
  }

  async poll() {
    if (performance.now() - this.lastFetch < 5_000) return;
    this.lastFetch = performance.now();
    try {
      // Never from the browser cache: a cached 200 would replay an old snapshot as live.
      const r = await fetch(this.url, { cache: 'no-store' });
      const body = await r.json();
      if (!r.ok) throw new Error(body?.error ?? `HTTP ${r.status}`);
      const feed = body as Feed;
      // The feed itself must be current. A stale or future snapshot drops every tracked train,
      // so the scene falls back to the timetable rather than freezing old positions as live.
      const fresh = freshness(feed.fetched, serverDate(r), Date.now(), STALE_MS);
      if (fresh !== 'fresh') {
        this.tracked.clear();
        this.error = fresh;
      } else {
        this.ingest(feed);
        this.lastOk = Date.now();
        this.error = null;
      }
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    }
    this.onUpdate();
  }

  private ingest(feed: Feed) {
    const now = performance.now();
    const seen = new Set<string>();
    for (const t of feed.trains) {
      // Expire by when MARTA observed the train, not when we fetched it.
      if (t.at != null && feed.fetched - t.at > STALE_MS) continue;
      seen.add(t.id);
      const routeId = `marta:route:${t.line}`;
      const prev = this.tracked.get(t.id);
      const snap = this.snap(routeId, t, prev?.pathId ?? null);
      if (prev && snap.pathId && snap.pathId === prev.pathId && Math.abs(snap.s - prev.to) < 3000) {
        // Glide from wherever the train is drawn now to the new fix.
        this.tracked.set(t.id, { raw: t, routeId, pathId: snap.pathId, from: this.currentS(prev, now), to: snap.s, glideStart: now });
      } else {
        this.tracked.set(t.id, { raw: t, routeId, pathId: snap.pathId, from: snap.s, to: snap.s, glideStart: now });
      }
    }
    for (const id of this.tracked.keys()) if (!seen.has(id)) this.tracked.delete(id);
  }

  private snap(routeId: string, t: LiveTrain, prefer: string | null): { pathId: string | null; s: number } {
    const dir = (['N', 'S', 'E', 'W'] as const).find((d) => d === t.direction);
    const candidates = this.schedule.pathsFor(routeId, dir);
    let best = { pathId: null as string | null, s: 0, off: Infinity };
    for (const id of candidates) {
      const g = this.schedule.path(id);
      if (!g) continue;
      const hit = nearestOnPath(g, t.lon, t.lat);
      // Slight preference for the path we were already on, to avoid flicker between near-identical variants.
      const off = id === prefer ? hit.off - 5 : hit.off;
      if (off < best.off) best = { pathId: id, s: hit.s, off };
    }
    return best.off <= MAX_SNAP_M ? best : { pathId: null, s: 0 };
  }

  private currentS(t: Tracked, now: number) {
    const f = Math.min(1, Math.max(0, (now - t.glideStart) / GLIDE_MS));
    return t.from + (t.to - t.from) * f;
  }

  trains(): TrainState[] {
    const now = performance.now();
    const out: TrainState[] = [];
    for (const t of this.tracked.values()) {
      const route = this.schedule.routes.get(t.routeId);
      const vt = route && this.schedule.vehicleTypes.get(route.vehicleType);
      const g = t.pathId ? this.schedule.path(t.pathId) : undefined;
      const s = this.currentS(t, now);
      const pt = g ? pointAt(g, s) : { lon: t.raw.lon, lat: t.raw.lat, heading: 0 };
      out.push({
        id: t.raw.id,
        routeId: t.routeId,
        // Empty when the fix couldn't be snapped to track: 2D draws it as reported, 3D omits it.
        pathId: t.pathId ?? '',
        s: { value: s, tier: 'live', source: 'marta-rail-rt', asOf: t.raw.at != null ? new Date(t.raw.at).toISOString() : '' },
        heading: pt.heading,
        lon: pt.lon,
        lat: pt.lat,
        lengthM: { value: vt ? vt.lengthM * vt.typicalUnits : 137, tier: 'illustrative', source: 'vehicle-types', asOf: '' },
        vehicleType: route?.vehicleType ?? 'marta:vt:heavy-rail',
        headsign: t.raw.destination,
        nextStopName: t.raw.nextStation,
        nextInSec: t.raw.nextInSec,
        observedAt: t.raw.at ?? undefined,
        label: t.raw.id.split(':').pop(),
      });
    }
    return out;
  }
}
