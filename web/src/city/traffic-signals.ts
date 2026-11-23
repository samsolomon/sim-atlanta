import { hashStr, type Line, type P2 } from '../vignette/geom';

/** Signal timing shared by every City traffic layer, matching the vignette's: an 84 s cycle,
 * 38 s green and 4 s amber per axis, the two axes half a cycle apart. Locations are mapped
 * (OSM highway=traffic_signals); cycle, split and offsets are illustrative. */
export const SIGNAL_CYCLE_S = 84;
export const SIGNAL_GREEN_S = 38;
export const SIGNAL_AMBER_S = 4;
/** The longest a car can wait at one signal: amber plus the other axis's green and amber. */
export const SIGNAL_MAX_WAIT_S = SIGNAL_CYCLE_S - SIGNAL_GREEN_S;
const HEADWAY_S = 2;
const QUEUE_GAP_M = 2;

export type SignalPhase = 'green' | 'amber' | 'red';
/** A stop line on one traffic course: its chainage, controller and phase group. */
export interface CourseSignal { s: number; key: string; axis: 0 | 1 }
export interface SignalCluster { key: string; x: number; z: number }

const offsets = new Map<string, number>();
function offset(key: string) {
  let o = offsets.get(key);
  if (o === undefined) offsets.set(key, (o = (hashStr(key) >>> 0) % SIGNAL_CYCLE_S));
  return o;
}

/** The phase of one controller's axis at scene time `t` (seconds). Pure: no state. */
export function signalPhase(key: string, axis: 0 | 1, t: number): SignalPhase {
  const c = (((t + offset(key)) % SIGNAL_CYCLE_S) + SIGNAL_CYCLE_S) % SIGNAL_CYCLE_S;
  const local = axis === 0 ? c : (c + SIGNAL_CYCLE_S / 2) % SIGNAL_CYCLE_S;
  return local < SIGNAL_GREEN_S ? 'green' : local < SIGNAL_GREEN_S + SIGNAL_AMBER_S ? 'amber' : 'red';
}

/** `t` itself when the axis is green, otherwise the start of its next green. */
export function nextGreen(key: string, axis: 0 | 1, t: number) {
  const c = (((t + offset(key)) % SIGNAL_CYCLE_S) + SIGNAL_CYCLE_S) % SIGNAL_CYCLE_S;
  const local = axis === 0 ? c : (c + SIGNAL_CYCLE_S / 2) % SIGNAL_CYCLE_S;
  // A microsecond past the boundary keeps floating-point modulo from landing just before it.
  return local < SIGNAL_GREEN_S ? t : t + (SIGNAL_CYCLE_S - local) + 1e-6;
}

/** One controller per intersection: OSM often maps a signal on every approach. */
export function clusterSignals(points: readonly P2[], radius = 25): SignalCluster[] {
  const clusters: { x: number; z: number; n: number }[] = [];
  for (const [x, z] of points) {
    const c = clusters.find(k => Math.hypot(k.x / k.n - x, k.z / k.n - z) <= radius);
    if (c) { c.x += x; c.z += z; c.n++; } else clusters.push({ x, z, n: 1 });
  }
  return clusters.map(c => {
    const x = c.x / c.n, z = c.z / c.n;
    return { key: `${Math.round(x)},${Math.round(z)}`, x, z };
  });
}

/** Stop lines where a course passes a signalised intersection: 8 m before the point nearest
 * the cluster centre, with the unit heading there. The axis is provisional (north–south 0,
 * east–west 1); `withSignals` settles it per intersection. */
export function courseSignals(line: Line, clusters: readonly SignalCluster[], reach = 14): (CourseSignal & { dx: number; dz: number })[] {
  const out: (CourseSignal & { dx: number; dz: number })[] = [];
  for (const c of clusters) {
    let best = { d: Infinity, s: 0, dx: 0, dz: 0 };
    for (let i = 1; i < line.pts.length; i++) {
      const [ax, az] = line.pts[i - 1], [bx, bz] = line.pts[i];
      const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((c.x - ax) * dx + (c.z - az) * dz) / l2));
      const d = Math.hypot(ax + t * dx - c.x, az + t * dz - c.z);
      if (d < best.d) best = { d, s: line.cum[i - 1] + t * Math.sqrt(l2), dx, dz };
    }
    const s = best.s - 8;
    if (best.d > reach || s < 10 || s > line.length - 4) continue;
    const n = Math.hypot(best.dx, best.dz) || 1;
    out.push({ s, key: c.key, axis: Math.abs(best.dz) >= Math.abs(best.dx) ? 0 : 1, dx: best.dx / n, dz: best.dz / n });
  }
  return out.sort((a, b) => a.s - b.s);
}

/** Give every open course its stop lines at the mapped signals. Closed loops stay unsignalled. */
export function withSignals<C extends { line: Line; closed?: boolean }>(courses: C[], points: readonly P2[]) {
  const clusters = clusterSignals(points);
  const hits = courses.map(c => (c.closed ? [] : courseSignals(c.line, clusters)));
  // Per intersection, the first approach sets the reference street. Approaches within 45° of
  // it (either way along it) share its phase; the crossing street takes the other, however
  // the two streets are oriented on the map.
  const reference = new Map<string, { dx: number; dz: number }>();
  for (const list of hits) for (const h of list) if (!reference.has(h.key)) reference.set(h.key, h);
  return courses.map((c, i) => {
    if (c.closed) return c;
    const signals: CourseSignal[] = hits[i].map(({ s, key, dx, dz }) => {
      const r = reference.get(key)!;
      return { s, key, axis: Math.abs(dx * r.dx + dz * r.dz) >= Math.SQRT1_2 ? 0 : 1 };
    });
    return { ...c, signals };
  });
}

/** Where each trip on one signalised course is at `now`. Every trip enters at s = 0 at its
 * own `start` (seconds) and runs at `speed`. Signals are walked in order: a trip arriving at
 * a stop line on amber or red waits for green; trips arriving in the same red window queue
 * behind one another (by arrival) and leave on a 2 s headway. Pure: the result depends only
 * on the inputs, so scrubbing the clock lands every car where a fresh load would. Returns
 * the chainage of each trip, or null once it has left the course. */
export function signalPositions(signals: readonly CourseSignal[], length: number, speed: number,
  trips: readonly { start: number; length: number }[], now: number): (number | null)[] {
  const n = trips.length;
  // Each trip's departure time and position from its previous stop line.
  const depart = trips.map(t => t.start), from = trips.map(() => 0);
  const pos: (number | null)[] = trips.map(() => null);
  const settled = trips.map(() => false);
  for (const sig of signals) {
    const arrive = trips.map((_, i) => depart[i] + (sig.s - from[i]) / speed);
    // Queue order: arrival time at this stop line.
    const order = [...Array(n).keys()].sort((a, b) => arrive[a] - arrive[b]);
    // lastClear: when the car ahead has rolled clear of the line, not merely been released.
    let back = 0, lastLeave = -Infinity, lastClear = -Infinity, leaderHalf = 0;
    for (const i of order) {
      const green = nextGreen(sig.key, sig.axis, arrive[i]);
      // Times are for car centres at the line, so a follower may cross only once the leader's
      // centre has passed it by both half lengths and the gap.
      const clear = lastClear + (leaderHalf + trips[i].length / 2 + QUEUE_GAP_M) / speed;
      // Stopped by the light, or behind a car still pulling away from the same queue.
      const blocked = green > arrive[i] || arrive[i] < clear;
      let leave = arrive[i], stopAt = sig.s;
      if (blocked) {
        if (arrive[i] >= clear) back = 0; // the previous queue has cleared: a new one starts
        // Positions are car centres: the front bumper stops at the line.
        stopAt = sig.s - trips[i].length / 2 - back;
        // Leave on green, a headway after the car ahead; a long queue waits for the next green.
        leave = nextGreen(sig.key, sig.axis, Math.max(green, lastLeave + HEADWAY_S));
        back += trips[i].length + QUEUE_GAP_M;
        lastLeave = leave;
        lastClear = leave + (sig.s - stopAt) / speed;
        leaderHalf = trips[i].length / 2;
      }
      if (!settled[i]) {
        // Where the trip is now on this leg: moving toward its stop, waiting, or past it.
        const reach = depart[i] + (stopAt - from[i]) / speed;
        if (now < depart[i]) { pos[i] = null; settled[i] = true; }
        else if (now < reach) { pos[i] = from[i] + (now - depart[i]) * speed; settled[i] = true; }
        else if (now < leave) { pos[i] = stopAt; settled[i] = true; }
      }
      // The next leg starts where and when the car pulls away: a queued car rolls on from its
      // place in the queue, through the line.
      depart[i] = leave;
      from[i] = stopAt;
    }
  }
  for (let i = 0; i < n; i++) {
    if (settled[i]) continue;
    const s = from[i] + (now - depart[i]) * speed;
    pos[i] = now < depart[i] ? null : s <= length ? s : null;
  }
  return pos;
}
