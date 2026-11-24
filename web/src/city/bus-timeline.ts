import type { Pattern } from '../model/types';
import { nextGreen, type CourseSignal } from './traffic-signals';

export const BUS_DWELL_S = 15;

interface Waypoint {
  s: number;
  arrival: number;
  departure: number;
}

/** Centre chainage in GTFS metres. Signal chainages denote front bumper stop lines.
 * Absolute times use the same epoch as RoadTraffic. Delay persists to the terminus. */
export function busTimeline(
  pattern: Pattern,
  start: number,
  signals: readonly CourseSignal[],
  length: number,
  queue?: (signal: CourseSignal, time: number) => { tail: number; count: number } | undefined,
) {
  const points: Waypoint[] = [];
  const stops = pattern.dist;
  const lights = signals.map((light) => ({ ...light, s: light.s - length / 2 })).sort((a, b) => a.s - b.s);
  let time = start;
  let light = 0;
  for (let i = 0; i < stops.length; i++) {
    if (i > 0) {
      const from = stops[i - 1],
        to = stops[i];
      const travel = pattern.arr[i] - pattern.dep[i - 1];
      let last = from;
      while (light < lights.length && lights[light].s <= to) {
        const signal = lights[light++];
        if (signal.s < from || to <= from) continue;
        const lineArrival = time + (travel * (signal.s - last)) / (to - from);
        const green = nextGreen(signal.key, signal.axis, lineArrival);
        const waiting = green > lineArrival ? queue?.(signal, lineArrival) : undefined;
        if (waiting?.count) {
          const tail = Math.max(last, signal.s - waiting.tail);
          const arrive = time + (travel * (tail - last)) / (to - from);
          time = green + waiting.count * 2;
          points.push({ s: tail, arrival: arrive, departure: time });
          time += (travel * (signal.s - tail)) / (to - from);
        } else time = lineArrival;
        const release = nextGreen(signal.key, signal.axis, time);
        points.push({ s: signal.s, arrival: time, departure: release });
        time = release;
        last = signal.s;
      }
      time += to > from ? (travel * (to - last)) / (to - from) : travel;
    }
    const dwell = pattern.dep[i] - pattern.arr[i] || (i > 0 && i + 1 < stops.length ? BUS_DWELL_S : 0);
    points.push({ s: stops[i], arrival: time, departure: time + dwell });
    time += dwell;
  }
  return points;
}

export function busDistance(points: readonly Waypoint[], time: number) {
  if (!points.length || time < points[0].arrival || time > points[points.length - 1].departure) return null;
  let lo = 0,
    hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (points[mid].departure < time) lo = mid + 1;
    else hi = mid;
  }
  const next = points[lo];
  if (time >= next.arrival) return next.s;
  const prev = points[lo - 1];
  return prev.s + ((next.s - prev.s) * (time - prev.departure)) / (next.arrival - prev.departure);
}
