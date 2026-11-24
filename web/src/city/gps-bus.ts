import { BUS_DWELL_S } from './bus-timeline';
import { nextGreen, type CourseSignal } from './traffic-signals';
import { TRAFFIC_EPOCH_MS } from './streetcar-traffic';

export type BusSignal = CourseSignal & { dx: number; dz: number };
export type BusQueue = (light: BusSignal, arrival: number) => {tail: number; count: number} | undefined;
export const GPS_MAX_AGE_MS = 180_000;
/** Farthest the drawn bus is steered ahead of the last fix, by its age and speed. */
const TARGET_LEAD_M = 150;
/** Gaps ahead of the drawn bus beyond this are closed by fading out and back in. */
const RELOCATE_M = 300;
/** The drawn bus never reverses. Further behind it than this, it relocates. */
const RELOCATE_BACK_M = 200;
export const GPS_FADE_MS = 350;
/** A drawn bus further behind its target than this skips modelled stop dwells. */
const DWELL_GAP_M = 40;

/** Tracks one vehicle on one directed GTFS shape. Distances are metres from
 * the route origin. GPS and traffic use independent clocks. */
export class GpsBus {
  private distance: number;
  private lastFrame: number;
  private reportTime: number;
  private reportDistance: number;
  private speed: number;
  private nextStop: number;
  private nextLight: number;
  private waitUntil = 0;
  private queueStop?: {s: number; release: number; arrival: number};
  private relocateAt?: number;
  private appeared: number;

  constructor(s: number, at: number, speed: number | undefined, ms: number,
    private readonly stops: readonly number[], private readonly lights: readonly BusSignal[],
    private readonly length: number, start?: number) {
    this.reportDistance = s;
    // Continuing a drawn bus (its timetable position) needs no fade-in.
    this.distance = start ?? s;
    this.reportTime = at;
    this.speed = Math.min(16, speed ?? 0);
    this.lastFrame = ms;
    this.appeared = start === undefined ? ms : -Infinity;
    this.nextStop = this.nextLight = 0;
    this.resetGates();
  }

  private resetGates() {
    this.nextStop = this.stops.findIndex(s => s > this.distance + 1);
    this.nextLight = this.lights.findIndex(l => l.s - this.length / 2 > this.distance + 1);
    this.queueStop = undefined;
    this.waitUntil = 0;
  }

  update(s: number, at: number, speed: number | undefined, observationMs: number, ms: number, queue: BusQueue) {
    if (at > this.reportTime) {
      const measured = (s - this.reportDistance) * 1000 / (at - this.reportTime);
      this.speed = Math.min(16, Math.max(0, speed ?? measured));
      this.reportTime = at;
      this.reportDistance = s;
    }
    const target = this.reportDistance + Math.min(TARGET_LEAD_M, this.speed * Math.max(0, observationMs - at) / 1000);
    const dt = Math.max(0, Math.min(1, (ms - this.lastFrame) / 1000));
    this.lastFrame = ms;
    if (target - this.distance > RELOCATE_M || this.distance - target > RELOCATE_BACK_M) this.relocateAt ??= ms;
    if (this.relocateAt !== undefined) {
      const fade = (ms - this.relocateAt) / GPS_FADE_MS;
      if (fade < 1) return {s: this.distance, fade};
      this.distance = target;
      this.appeared = ms;
      this.relocateAt = undefined;
      this.resetGates();
    }
    const time = (ms - TRAFFIC_EPOCH_MS) / 1000;
    const gap = target - this.distance;
    const velocity = Math.min(20, this.speed + Math.max(0, gap) / (gap > TARGET_LEAD_M ? 5 : 12));
    let next = this.distance + Math.min(Math.max(0, gap), velocity * dt);
    if (time < this.waitUntil) next = this.distance;
    const light = this.lights[this.nextLight];
    if (light && next > this.distance) {
      const line = light.s - this.length / 2;
      // Predict the queue at the line once in range, and again whenever the bus is
      // later than predicted (a stop dwell or a hold), since the light may have changed.
      if (this.queueStop && this.queueStop.release === 0 && time > this.queueStop.arrival + 1) this.queueStop = undefined;
      if (!this.queueStop && line - this.distance < 120) {
        const arrival = time + Math.max(0, line - this.distance) / Math.max(1, velocity);
        const green = nextGreen(light.key, light.axis, arrival);
        const cars = green > arrival ? queue(light, arrival) : undefined;
        this.queueStop = {s: Math.max(this.distance, line - (cars?.tail ?? 0)), release: cars?.count ? green + 2 * cars.count : 0, arrival};
      }
      if (this.queueStop && time < this.queueStop.release) next = Math.min(next, this.queueStop.s);
      if (next >= line && nextGreen(light.key, light.axis, time) > time) next = line;
    }
    while (this.stops[this.nextStop] !== undefined && this.stops[this.nextStop] <= this.distance) this.nextStop++;
    const stop = this.stops[this.nextStop];
    if (stop !== undefined && next >= stop) {
      this.nextStop++;
      // Far behind its fix, the real bus has already served this stop: pass it.
      if (gap <= DWELL_GAP_M) {
        next = stop;
        this.waitUntil = time + BUS_DWELL_S;
        this.queueStop = undefined;
      }
    }
    if (light && next > light.s - this.length / 2) {
      this.nextLight++;
      this.queueStop = undefined;
    }
    this.distance = next;
    return {s: next, fade: Math.max(0, 1 - (ms - this.appeared) / GPS_FADE_MS)};
  }
}
