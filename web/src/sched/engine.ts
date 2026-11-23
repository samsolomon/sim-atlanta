import type { Pattern, Route, RoutesFile, Stop, TimetableFile, TrainState, VehicleType } from '../model/types';
import { serviceDays, serviceRuns } from './time';

export interface PathGeom {
  coords: Float64Array;
  cum: Float64Array;
}

interface CompiledTimetable {
  feed: string;
  tz: string;
  source: string;
  asOf: string;
  patterns: Pattern[];
  services: TimetableFile['timetables'][number]['services'];
  /** Trips sorted by start: [pattern, service, start, shortName]. */
  trips: [number, number, number, string][];
  /** Duration (seconds) of each pattern. */
  duration: number[];
  maxDuration: number;
}

/** Ease so trains accelerate out of and brake into stations (zero speed at both ends). */
export function ease(f: number) {
  return f - Math.sin(2 * Math.PI * f) / (2 * Math.PI);
}

/** Position (metres along path) of a pattern `elapsed` seconds after the trip started. */
export function distanceAt(p: Pattern, elapsed: number): { s: number; nextStop: number; atStop?: number } {
  const n = p.arr.length;
  if (elapsed <= p.dep[0]) {
    const atOrigin = elapsed >= p.arr[0] && (elapsed < p.dep[0] || elapsed === p.arr[0]);
    return { s: p.dist[0], nextStop: 1, atStop: atOrigin ? 0 : undefined };
  }
  for (let k = 0; k < n - 1; k++) {
    if (elapsed < p.arr[k + 1]) {
      const span = p.arr[k + 1] - p.dep[k];
      const f = span > 0 ? Math.min(1, Math.max(0, (elapsed - p.dep[k]) / span)) : 1;
      return { s: p.dist[k] + ease(f) * (p.dist[k + 1] - p.dist[k]), nextStop: k + 1,
        atStop: elapsed === p.arr[k] && elapsed === p.dep[k] ? k : undefined };
    }
    if (elapsed < p.dep[k + 1]) return { s: p.dist[k + 1], nextStop: Math.min(k + 2, n - 1), atStop: k + 1 };
  }
  return { s: p.dist[n - 1], nextStop: n - 1, atStop: elapsed === p.arr[n - 1] ? n - 1 : undefined };
}

/** Point and heading at `s` metres along a path. */
export function pointAt(g: PathGeom, s: number): { lon: number; lat: number; heading: number } {
  const cum = g.cum;
  const last = cum.length - 1;
  if (s <= 0) s = 0;
  if (s >= cum[last]) s = cum[last];
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= s) lo = mid;
    else hi = mid;
  }
  const i = Math.min(lo, last - 1);
  const seg = cum[i + 1] - cum[i];
  const f = seg > 0 ? (s - cum[i]) / seg : 0;
  const x0 = g.coords[2 * i];
  const y0 = g.coords[2 * i + 1];
  const x1 = g.coords[2 * i + 2];
  const y1 = g.coords[2 * i + 3];
  const k = Math.cos((y0 * Math.PI) / 180);
  const heading = ((Math.atan2((x1 - x0) * k, y1 - y0) * 180) / Math.PI + 360) % 360;
  return { lon: x0 + f * (x1 - x0), lat: y0 + f * (y1 - y0), heading };
}

export class Schedule {
  readonly routes = new Map<string, Route>();
  readonly stops = new Map<string, Stop>();
  readonly vehicleTypes = new Map<string, VehicleType>();
  private paths = new Map<string, PathGeom>();
  private tables: CompiledTimetable[] = [];

  constructor(rf: RoutesFile, tf: TimetableFile, vts: VehicleType[]) {
    for (const r of rf.routes) this.routes.set(r.id, r);
    for (const s of rf.stops) this.stops.set(s.id, s);
    for (const v of vts) this.vehicleTypes.set(v.id, v);
    for (const p of rf.paths) {
      this.paths.set(p.id, { coords: Float64Array.from(p.coords), cum: Float64Array.from(p.cum) });
    }
    for (const t of tf.timetables) {
      const duration = t.patterns.map((p) => p.arr[p.arr.length - 1]);
      const source = `${t.feed}-gtfs`;
      this.tables.push({
        feed: t.feed,
        tz: t.timezone,
        source,
        asOf: tf.sourceAsOf[source] ?? '',
        patterns: t.patterns,
        services: t.services,
        trips: [...t.trips].sort((a, b) => a[2] - b[2]),
        duration,
        maxDuration: Math.max(0, ...duration),
      });
    }
  }

  path(id: string): PathGeom | undefined {
    return this.paths.get(id);
  }

  /** Distances (path metres) at which this path's timetable patterns call at a stop; the
   * positions scheduled trains actually stop at, which can differ from the stop coordinate. */
  stopDistances(pathId: string, stopId: string): number[] {
    const out = new Set<number>();
    for (const t of this.tables) for (const p of t.patterns) {
      if (p.pathId !== pathId) continue;
      p.stops.forEach((id, i) => { if (id === stopId) out.add(p.dist[i]); });
    }
    return [...out];
  }

  /**
   * Paths a route's trains run on, optionally limited to patterns whose headsign names
   * a direction (MARTA: "RED SOUTHBOUND TO AIRPORT STATION").
   */
  pathsFor(routeId: string, direction?: 'N' | 'S' | 'E' | 'W'): string[] {
    const word = direction && { N: 'NORTH', S: 'SOUTH', E: 'EAST', W: 'WEST' }[direction];
    const out = new Set<string>();
    for (const t of this.tables)
      for (const p of t.patterns)
        if (p.routeId === routeId && (!word || p.headsign.toUpperCase().includes(word))) out.add(p.pathId);
    return out.size || !word ? [...out] : this.pathsFor(routeId);
  }

  /** Every train the timetables say should be on the line at `date`. */
  trainsAt(date: Date): TrainState[] {
    const out: TrainState[] = [];
    for (const t of this.tables) {
      for (const day of serviceDays(date, t.tz)) {
        const runs = t.services.map((s) => serviceRuns(s, day));
        // Trips are sorted by start; only those that started within maxDuration can be running.
        const earliest = day.secs - t.maxDuration;
        let i = lowerBound(t.trips, earliest);
        for (; i < t.trips.length; i++) {
          const [pi, si, start, short] = t.trips[i];
          if (start > day.secs) break;
          if (!runs[si]) continue;
          const elapsed = day.secs - start;
          if (elapsed > t.duration[pi]) continue;
          const p = t.patterns[pi];
          const geom = this.paths.get(p.pathId);
          const route = this.routes.get(p.routeId);
          if (!geom || !route) continue;
          const { s, nextStop, atStop } = distanceAt(p, elapsed);
          const pt = pointAt(geom, s);
          const vt = this.vehicleTypes.get(route.vehicleType);
          out.push({
            id: `${t.feed}:trip:${pi}-${start}-${day.ymd}`,
            routeId: route.id,
            pathId: p.pathId,
            s: { value: s, tier: 'scheduled', source: t.source, asOf: t.asOf },
            heading: pt.heading,
            lon: pt.lon,
            lat: pt.lat,
            lengthM: {
              value: vt ? vt.lengthM * vt.typicalUnits : 100,
              tier: 'illustrative',
              source: 'vehicle-types',
              asOf: '',
            },
            vehicleType: route.vehicleType,
            headsign: p.headsign,
            nextStop: p.stops[nextStop],
            scheduledStop: atStop === undefined ? undefined : p.stops[atStop],
            label: short || undefined,
          });
        }
      }
    }
    return out;
  }
}

function lowerBound(trips: [number, number, number, string][], start: number) {
  let lo = 0;
  let hi = trips.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (trips[mid][2] < start) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Nearest point on a path to (lon, lat): metres along the path and metres away from it. */
export function nearestOnPath(g: PathGeom, lon: number, lat: number): { s: number; off: number } {
  const k = Math.cos((lat * Math.PI) / 180);
  let best = { s: 0, off: Infinity };
  const n = g.cum.length;
  for (let i = 0; i < n - 1; i++) {
    const ax = (g.coords[2 * i] - lon) * k;
    const ay = g.coords[2 * i + 1] - lat;
    const dx = (g.coords[2 * i + 2] - lon) * k - ax;
    const dy = g.coords[2 * i + 3] - lat - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.min(1, Math.max(0, -(ax * dx + ay * dy) / len2)) : 0;
    const off = Math.hypot(ax + t * dx, ay + t * dy) * 111_195;
    if (off < best.off) best = { s: g.cum[i] + t * (g.cum[i + 1] - g.cum[i]), off };
  }
  return best;
}
