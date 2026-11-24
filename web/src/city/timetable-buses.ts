import type { BusTimetableFile, Path } from '../model/types';
import { serviceDays, serviceRuns } from '../sched/time';
import { Line, type P2 } from '../vignette/geom';
import { BUS_LENGTH } from '../vignette/xcelsior';
import { makeProjector } from '../core/scene-data';
import { busDistance, busTimeline } from './bus-timeline';
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
  const paths = new Map(
    data.paths.map((shape) => [shape.id, directedPath(shape, makeProjector(origin), streets, signals, courses)]),
  );
  const table = data.timetable;
  let queueAt:
    | ((key: string, axis: 0 | 1, dx: number, dz: number, time: number) => { tail: number; count: number })
    | undefined;
  const dayCache = new Map<
    number,
    {
      id: string;
      path: ReturnType<typeof directedPath>;
      points: ReturnType<typeof busTimeline>;
      serviceDate: number;
      headsign: string;
      start: number;
    }[]
  >();
  function posesAt(ms: number) {
    const seconds = (ms - TRAFFIC_EPOCH_MS) / 1000;
    const active = [];
    for (const day of serviceDays(new Date(ms), table.timezone)) {
      const midnight = Math.round(seconds - day.secs);
      let trips = dayCache.get(midnight);
      if (!trips) {
        trips = [];
        if (dayCache.size >= 4) dayCache.clear();
        dayCache.set(midnight, trips);
        for (const [i, [pi, si, start]] of table.trips.entries()) {
          if (!serviceRuns(table.services[si], day)) continue;
          const pattern = table.patterns[pi],
            path = paths.get(pattern.pathId);
          if (!path) continue;
          trips.push({
            id: `marta:bus-trip:49-${day.ymd}-${i}`,
            serviceDate: day.ymd,
            headsign: pattern.headsign,
            start,
            path,
            points: busTimeline(pattern, midnight + start, path.lights, BUS_LENGTH, (signal, time) => {
              const light = path.lights.find((l) => l.key === signal.key);
              return light && queueAt?.(light.key, light.axis, light.dx, light.dz, time);
            }),
          });
        }
      }
      for (const trip of trips) {
        const s = busDistance(trip.points, seconds);
        const point = s === null ? null : trip.path.at(s);
        if (point) active.push({ id: trip.id, point, headsign: trip.headsign, start: trip.start, serviceDate:trip.serviceDate });
      }
    }
    return active;
  }

  type Pose = ReturnType<typeof posesAt>[number];
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
    calendar: {
      first: Math.min(...table.services.flatMap(s => [s.start,...s.added]).filter(Boolean)),
      last: Math.max(...table.services.flatMap(s => [s.end,...s.added])),
    },
    posesAt,
    blocksFor,
    observe,
    setQueue(fn: typeof queueAt) {
      queueAt = fn;
      dayCache.clear();
      samples.clear();
    },
    refresh() {
      for (const path of paths.values()) path.refresh();
      samples.clear();
    },
  };
}
