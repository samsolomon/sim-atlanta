import type { BusTimetableFile, LiveBus, Path } from '../model/types';
import { serviceDays, serviceRuns } from '../sched/time';
import { Line, type P2 } from '../vignette/geom';
import { BUS_LENGTH } from '../vignette/xcelsior';
import { makeProjector } from '../core/scene-data';
import { busDistance, busTimeline } from './bus-timeline';
import { GpsBus, GPS_FADE_MS, GPS_MAX_AGE_MS } from './gps-bus';
import type { CityBuses } from './buses';
import { clusterSignals, courseSignals, type CourseSignal } from './traffic-signals';
import type { TrafficCourse, RoadTrafficOptions } from './road-traffic';
import { streetcarProjection, TRAFFIC_EPOCH_MS } from './streetcar-traffic';
import { alongAt } from './streetcar-cars';

function directedPath(
  shape: Path,
  project: ReturnType<typeof makeProjector>,
  streets: CityBuses,
  signals: P2[],
  courses: readonly TrafficCourse[],
) {
  const pts: P2[] = [];
  for (let i = 0; i < shape.coords.length; i += 2) pts.push(project(shape.coords[i], shape.coords[i + 1]));
  const line = new Line(pts);
  const path = { line, cum: shape.cum };
  // Additional board roads are indexed only in the corridor used by this route.
  // Sample both paths and candidate segments so long roads crossing a cell are retained.
  const cells = new Set<string>();
  const cell = (x: number, z: number) => `${Math.floor(x / 32)},${Math.floor(z / 32)}`;
  for (let s = 0; s <= line.length + 12; s += 12) {
    const p = line.at(s);
    for (const dx of [-32, 0, 32]) for (const dz of [-32, 0, 32]) cells.add(cell(p.x + dx, p.z + dz));
  }
  function needsRoad(pts: P2[]) {
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1],
        [bx, bz] = pts[i];
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 16));
      for (let k = 0; k <= steps; k++)
        if (cells.has(cell(ax + ((bx - ax) * k) / steps, az + ((bz - az) * k) / steps))) return true;
    }
    return false;
  }
  const sampleAnchors = () =>
    Array.from({ length: Math.ceil(line.length / 3) + 1 }, (_, i) => {
      const p = line.at(i * 3);
      const heading = Math.atan2(p.dx, p.dz);
      const snap = streets.laneAt(p.x, p.z, heading, true);
      return snap && Math.cos(heading - snap.a) > 0.7 && Math.hypot(p.x - snap.x, p.z - snap.z) <= 12 ? snap : null;
    });
  let anchors = sampleAnchors();
  const lights: (CourseSignal & { dx: number; dz: number })[] = [];
  for (const hit of courseSignals(line, clusterSignals(signals))) {
    if (!anchors[Math.floor(hit.s / 3)]) continue;
    for (const course of courses) {
      const signal = course.signals?.find((s) => s.key === hit.key);
      if (!signal) continue;
      const dir = course.line.at(signal.s);
      const parallel = Math.abs(dir.dx * hit.dx + dir.dz * hit.dz) >= Math.SQRT1_2;
      const vertex = line.vertexAt(hit.s),
        i = Math.floor(vertex);
      lights.push({
        dx: hit.dx,
        dz: hit.dz,
        key: hit.key,
        axis: parallel ? signal.axis : signal.axis === 0 ? 1 : 0,
        s: shape.cum[i] + (vertex - i) * (shape.cum[i + 1] - shape.cum[i]),
      });
      break;
    }
  }
  function at(distance: number) {
    const index = alongAt(path, distance) / 3,
      i = Math.floor(index),
      f = index - i;
    const a = anchors[i],
      b = anchors[i + 1];
    if (!a || !b || Math.hypot(b.x - a.x, b.z - a.z) > 8) return null;
    const dx = b.x - a.x,
      dz = b.z - a.z;
    const length = Math.hypot(dx, dz),
      angle = Math.atan2(Math.sin(b.a - a.a), Math.cos(b.a - a.a));
    // Cubic Hermite interpolation through lane anchors rounds the corner while
    // retaining the incoming and outgoing headings and their road ownership.
    const blend = f * f * (3 - 2 * f),
      enter = f * (1 - f) * (1 - f) * length,
      exit = -f * f * (1 - f) * length;
    return {
      x: a.x + blend * dx + enter * Math.sin(a.a) + exit * Math.sin(b.a),
      z: a.z + blend * dz + enter * Math.cos(a.a) + exit * Math.cos(b.a),
      a: a.a + f * angle,
      run: f < 0.5 ? a.run : b.run,
    };
  }
  return {
    at,
    needsRoad,
    /** Closest point on this directed shape to a GPS fix within 65 m, scored by lateral
     * offset, heading disagreement and, when `near` (the previous report's distance) is
     * known, by distance from it, so a shape that passes near itself keeps its place. */
    projectFix(x: number, z: number, bearing?: number, near?: number) {
      let best: {s: number; score: number; lateral: number} | undefined;
      for (let i = 1; i < pts.length; i++) {
        const [ax, az] = pts[i - 1], dx = pts[i][0] - ax, dz = pts[i][1] - az;
        const f = Math.max(0, Math.min(1, ((x - ax)*dx + (z - az)*dz) / (dx*dx + dz*dz || 1)));
        const lateral = Math.hypot(x - ax - f*dx, z - az - f*dz);
        if (lateral > 65) continue;
        // GTFS bearing is clockwise from north, and scene north is −z.
        const alignment = bearing === undefined ? 1 : Math.cos(bearing * Math.PI / 180 - Math.atan2(dx, -dz));
        const s = shape.cum[i-1] + f * (shape.cum[i] - shape.cum[i-1]);
        const jump = near === undefined ? 0 : Math.max(0, Math.abs(s - near) - 400) / 4;
        const score = lateral + 30 * (1 - alignment) + jump;
        if (!best || score < best.score) best = {s, score, lateral};
      }
      return best;
    },
    lights,
    get anchors() {
      return anchors;
    },
    refresh() {
      anchors = sampleAnchors();
    },
  };
}

export function createTimetableBuses(
  data: BusTimetableFile,
  origin: { lon: number; lat: number },
  streets: CityBuses,
  signals: P2[],
  courses: readonly TrafficCourse[],
) {
  const project = makeProjector(origin);
  const paths = new Map(
    data.paths.map((shape) => [shape.id, directedPath(shape, project, streets, signals, courses)]),
  );
  const table = data.timetable;
  let queueAt:
    | ((key: string, axis: 0 | 1, dx: number, dz: number, time: number) => { tail: number; count: number })
    | undefined;
  const hourCache = new Map<
    string,
    {
      id: string;
      path: ReturnType<typeof directedPath>;
      points: ReturnType<typeof busTimeline>;
      rawId?: string;
      stops: number[];
      serviceDate: number;
      headsign: string;
      start: number;
    }[]
  >();
  function activeAt(ms: number, activeService?: (date: number) => void) {
    const seconds = (ms - TRAFFIC_EPOCH_MS) / 1000;
    const active = [];
    for (const day of serviceDays(new Date(ms), table.timezone)) {
      const midnight = Math.round(seconds - day.secs);
      // Car replay queries past instants. Keep only the plans that intersect each
      // sampled hour, including trips carried over from the previous service day.
      const hour = Math.floor(seconds / 3600);
      const key = `${midnight}/${hour}`;
      let trips = hourCache.get(key);
      if (!trips) {
        trips = [];
        if (hourCache.size >= 8) hourCache.delete(hourCache.keys().next().value!);
        hourCache.set(key, trips);
        for (const [i, [pi, si, start]] of table.trips.entries()) {
          if (midnight + start >= (hour + 1) * 3600 || !serviceRuns(table.services[si], day)) continue;
          const pattern = table.patterns[pi],
            path = paths.get(pattern.pathId);
          if (!path) continue;
          const points = busTimeline(pattern, midnight + start, path.lights, BUS_LENGTH, (signal, time) => {
            const light = path.lights.find((l) => l.key === signal.key);
            return light && queueAt?.(light.key, light.axis, light.dx, light.dz, time);
          });
          if (points.at(-1)!.departure < hour * 3600) continue;
          trips.push({
            id: `marta:bus-trip:49-${day.ymd}-${i}`,
            rawId: data.tripIds?.[i],
            stops: pattern.dist,
            serviceDate: day.ymd,
            headsign: pattern.headsign,
            start,
            path,
            points,
          });
        }
      }
      for (const trip of trips) {
        const s = busDistance(trip.points, seconds);
        if (s === null) continue;
        activeService?.(trip.serviceDate);
        const point = trip.path.at(s);
        active.push({trip, s, point});
      }
    }
    return active;
  }

  type Active = ReturnType<typeof activeAt>[number];
  type PathModel = ReturnType<typeof directedPath>;
  type Point = NonNullable<Active['point']>;
  interface Pose {
    id: string; point: Point; headsign: string; start: number; serviceDate: number;
    fix?: LiveBus; offset?: number; fallback?: boolean; fade?: number;
  }
  function scheduled({trip, point}: Active): Pose[] {
    return point ? [{id: trip.id, point, headsign: trip.headsign, start: trip.start, serviceDate: trip.serviceDate}] : [];
  }
  function posesAt(ms: number, activeService?: (date: number) => void) {
    return activeAt(ms, activeService).flatMap(scheduled);
  }

  const ROUTE_49 = 'marta:route:49';
  const editionTrips = new Set(data.tripIds ?? []);
  interface Observation {
    at: number; x: number; z: number; bearing?: number;
    snaps: Map<PathModel, {s: number; score: number; lateral: number}>;
    trip?: string; driver?: GpsBus; path?: PathModel;
  }
  interface Candidate { fix: LiveBus; obs: Observation; is49: boolean; match?: Active; duplicate?: boolean }
  const observations = new Map<string, Observation>();
  // Last frame's present-clock state, for continuity between a trip's GPS and
  // timetable drawings: where each fallback was, which trips were GPS-drawn,
  // and when a trip that lost its GPS began fading in at its timetable place.
  let fallbackWas = new Map<string, {path: PathModel; s: number}>();
  let gpsWas = new Set<string>();
  const fallbackSince = new Map<string, number>();

  function observe49(fix: LiveBus): Observation {
    let obs = observations.get(fix.id);
    if (obs && obs.at === fix.at) return obs;
    const [x, z] = project(fix.position.value.lon, fix.position.value.lat);
    // Without a reported bearing, the motion since the last fix tells two-way
    // streets' directions apart once the bus has moved.
    let bearing = fix.bearing?.value;
    if (bearing === undefined && obs && Math.hypot(x - obs.x, z - obs.z) > 15)
      bearing = (Math.atan2(x - obs.x, -(z - obs.z)) * 180 / Math.PI + 360) % 360;
    bearing ??= obs?.bearing;
    const snaps: Observation['snaps'] = new Map();
    for (const path of paths.values()) {
      const snap = path.projectFix(x, z, bearing, obs?.snaps.get(path)?.s);
      if (snap) snaps.set(path, snap);
    }
    obs = {...obs, at: fix.at!, x, z, bearing, snaps};
    observations.set(fix.id, obs);
    return obs;
  }

  /**
   * Route 49 at the real present. Fresh GPS (≤ 3 min) steers its trip's bus; every
   * active trip without one is drawn at its timetable position (`fallback`). Passes run
   * in order so a weaker claim never displaces a stronger one: exact trip descriptors,
   * then proximity for Route 49 reports without a descriptor this edition knows, then
   * suppression of the nearest timetable twin of each still-unmatched Route 49 report.
   * Other routes, and unknown routes that match no trip, keep the plain street snap.
   */
  function presentAt(ms: number, observationMs: number, fixes: readonly LiveBus[], activeService?: (day: number) => void) {
    const active = activeAt(ms, activeService);
    const poses: Pose[] = [];
    const raw: LiveBus[] = [];
    const candidates: Candidate[] = [];
    for (const fix of fixes) {
      const is49 = fix.routeId?.value === ROUTE_49;
      if (fix.routeId && !is49) { raw.push(fix); continue; }
      const fresh = fix.at !== null && observationMs >= fix.at && observationMs - fix.at <= GPS_MAX_AGE_MS;
      // A stale Route 49 report yields to its trip's timetable position.
      if (!fresh) { if (!is49) raw.push(fix); continue; }
      candidates.push({fix, is49, obs: observe49(fix)});
    }
    const seen = new Set(candidates.map(c => c.fix.id));
    for (const id of observations.keys()) if (!seen.has(id)) observations.delete(id);
    candidates.sort((a, b) => b.fix.at! - a.fix.at! || a.fix.id.localeCompare(b.fix.id));

    const claimed = new Set<string>();
    // 1. Exact descriptors. The freshest vehicle claiming a trip keeps it.
    for (const c of candidates) {
      if (!c.fix.tripId) continue;
      const a = active.find(a => a.trip.rawId === c.fix.tripId &&
        (!c.fix.startDate || Number(c.fix.startDate) === a.trip.serviceDate));
      if (!a) continue;
      if (claimed.has(a.trip.id)) { c.duplicate = true; continue; }
      claimed.add(a.trip.id);
      c.match = a;
    }
    // 2. Proximity, for Route 49 reports with no descriptor or one from another edition.
    for (const c of candidates) {
      if (c.match || c.duplicate || !c.is49 || (c.fix.tripId && editionTrips.has(c.fix.tripId))) continue;
      let best = Infinity;
      for (const a of active) {
        const snap = c.obs.snaps.get(a.trip.path);
        if (!snap || claimed.has(a.trip.id) || Math.abs(snap.s - a.s) > 500) continue;
        const score = Math.abs(snap.s - a.s) + 4 * snap.score - (c.obs.trip === a.trip.id ? 150 : 0);
        if (score < best) { best = score; c.match = a; }
      }
      if (c.match) claimed.add(c.match.trip.id);
    }
    // 3. Draw every Route 49 report (and matched unknown-route report) on its shape.
    const gpsNow = new Set<string>();
    const unmatched: {obs: Observation; drawn: Point | null}[] = [];
    for (const c of candidates) {
      if (c.duplicate) continue;
      const {fix, obs, match} = c;
      if (!match && !c.is49) { raw.push(fix); continue; }
      const path = match?.trip.path ?? [...obs.snaps].sort((a, b) => a[1].score - b[1].score)[0]?.[0];
      const snap = path && obs.snaps.get(path);
      let drawn: Point | null = null;
      if (path && snap) {
        if (!obs.driver || obs.path !== path) {
          const stops = match?.trip.stops ?? table.patterns.find(p => paths.get(p.pathId) === path)?.dist ?? [];
          // Continue from where the trip's timetable bus was drawn last frame, if it was.
          const prior = match && fallbackWas.get(match.trip.id);
          obs.driver = new GpsBus(snap.s, fix.at!, fix.speed?.value, ms, stops, path.lights, BUS_LENGTH,
            prior && prior.path === path ? prior.s : undefined);
        }
        obs.path = path;
        obs.trip = match?.trip.id;
        const drive = obs.driver.update(snap.s, fix.at!, fix.speed?.value, observationMs, ms,
          (l, t) => queueAt?.(l.key, l.axis, l.dx, l.dz, t));
        drawn = path.at(drive.s);
        if (drawn) {
          poses.push({id: match?.trip.id ?? fix.id, point: drawn, fix,
            headsign: match?.trip.headsign ?? '', start: match?.trip.start ?? 0, serviceDate: match?.trip.serviceDate ?? 0,
            offset: Math.hypot(drawn.x - obs.x, drawn.z - obs.z), fade: drive.fade});
          if (match) gpsNow.add(match.trip.id);
        }
      }
      if (!drawn) raw.push(fix);
      if (!match) unmatched.push({obs, drawn});
    }
    // 4. A Route 49 report without a trip must not stand beside a timetable twin.
    for (const {obs, drawn} of unmatched) {
      let nearest: Active | undefined, best = 150;
      for (const a of active) {
        if (!a.point || claimed.has(a.trip.id)) continue;
        const d = Math.min(Math.hypot(a.point.x - obs.x, a.point.z - obs.z),
          drawn ? Math.hypot(a.point.x - drawn.x, a.point.z - drawn.z) : Infinity);
        if (d < best) { best = d; nearest = a; }
      }
      if (nearest) claimed.add(nearest.trip.id);
    }
    // 5. Timetable fallback for every unclaimed trip. One that just lost its GPS fades in.
    const fallbackNow = new Map<string, {path: PathModel; s: number}>();
    for (const a of active) {
      if (claimed.has(a.trip.id)) { fallbackSince.delete(a.trip.id); continue; }
      fallbackNow.set(a.trip.id, {path: a.trip.path, s: a.s});
      if (gpsWas.has(a.trip.id)) fallbackSince.set(a.trip.id, ms);
      const since = fallbackSince.get(a.trip.id);
      const fade = since === undefined ? 0 : Math.max(0, 1 - (ms - since) / GPS_FADE_MS);
      if (!fade) fallbackSince.delete(a.trip.id);
      for (const pose of scheduled(a)) poses.push({...pose, fallback: true, fade});
    }
    fallbackWas = fallbackNow;
    gpsWas = gpsNow;
    return {poses, raw};
  }
  function resetPresent() {
    observations.clear();
    liveHistory.clear();
    fallbackWas = new Map();
    gpsWas = new Set();
    fallbackSince.clear();
  }
  const samples = new Map<number, Pose[]>();
  type Footprint = { x: number; z: number; y: number; a: number };
  const liveHistory = new Map<number, Footprint[]>();
  function observe(ms: number, positions: readonly Footprint[]) {
    const tick = Math.ceil((ms - TRAFFIC_EPOCH_MS) / 500);
    if (!liveHistory.has(tick))
      liveHistory.set(
        tick,
        positions.map((p) => ({ ...p })),
      );
    if (liveHistory.size > 1200) liveHistory.delete(liveHistory.keys().next().value!);
  }
  function blocksFor(
    course: TrafficCourse,
    height: RoadTrafficOptions['roadHeight'],
    timetableMode: () => boolean,
  ) {
    if (course.closed) return;
    const roadY = (s: number) => {
      const p = course.line.at(s);
      const road = course.roads[Math.min(course.roads.length - 1, Math.floor(course.line.vertexAt(s)))];
      return road ? height(p.x, p.z, road) : null;
    };
    const project = (p: NonNullable<ReturnType<typeof directedPath>['anchors'][number]>) => {
      const y = streets.surface(p.x, p.z, p.run);
      return y === null
        ? undefined
        : streetcarProjection(course.line, { ...p, y, dx: Math.sin(p.a), dz: Math.cos(p.a) }, roadY);
    };
    if (
      ![...paths.values()].some((path) => path.anchors.some((p, i) => p && i % 3 === 0 && project(p) !== undefined))
    )
      return;
    return (seconds: number) => {
      if (!timetableMode()) {
        const live = liveHistory.get(Math.round(seconds * 2)) ?? [];
        return live.flatMap((p) => {
          const s = streetcarProjection(course.line, { ...p, dx: Math.sin(p.a), dz: Math.cos(p.a) }, roadY);
          return s === undefined ? [] : [{ rear: s - BUS_LENGTH / 2, front: s + BUS_LENGTH / 2 }];
        });
      }
      let poses = samples.get(seconds);
      if (!poses) {
        poses = posesAt(TRAFFIC_EPOCH_MS + seconds * 1000);
        if (samples.size >= 7200) samples.delete(samples.keys().next().value!);
        samples.set(seconds, poses);
      }
      return poses.flatMap((pose) => {
        const s = project(pose.point);
        return s === undefined ? [] : [{ rear: s - BUS_LENGTH / 2, front: s + BUS_LENGTH / 2 }];
      });
    };
  }
  return {
    needsRoad: (pts: P2[]) => [...paths.values()].some((path) => path.needsRoad(pts)),
    calendar: {
      first: Math.min(...table.services.flatMap((s) => [s.start, ...s.added]).filter(Boolean)),
      last: Math.max(...table.services.flatMap((s) => [s.end, ...s.added])),
    },
    posesAt, presentAt,
    resetPresent,
    blocksFor,
    observe,
    setQueue(fn: typeof queueAt) {
      queueAt = fn;
      hourCache.clear();
      samples.clear();
    },
    refresh() {
      for (const path of paths.values()) path.refresh();
      samples.clear();
    },
  };
}
