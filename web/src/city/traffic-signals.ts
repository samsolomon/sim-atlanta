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

/** Stop lines where a course passes a signalised intersection (its centreline within 20 m of
 * the controller, which spans a wide intersection's approaches): 8 m before the point nearest
 * the cluster centre, with the unit heading there. The axis is provisional (north–south 0,
 * east–west 1); `withSignals` settles it per intersection. */
export function courseSignals(line: Line, clusters: readonly SignalCluster[], reach = 20): (CourseSignal & { dx: number; dz: number })[] {
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
    if (best.d > reach || s < 2 || s > line.length - 4) continue;
    const n = Math.hypot(best.dx, best.dz) || 1;
    out.push({ s, key: c.key, axis: Math.abs(best.dz) >= Math.abs(best.dx) ? 0 : 1, dx: best.dx / n, dz: best.dz / n });
  }
  // Twin lights within 30 m (a slip lane, a split intersection) act as one stop for this course.
  const kept: (CourseSignal & { dx: number; dz: number })[] = [];
  for (const sig of out.sort((a, b) => a.s - b.s)) if (!kept.length || sig.s - kept.at(-1)!.s >= 30) kept.push(sig);
  return kept;
}

/** Give every open course its stop lines at the mapped signals. Closed loops stay unsignalled. */
export function withSignals<C extends { line: Line; closed?: boolean; turnSignal?: { key: string; s: number; dx: number; dz: number } }>(courses: C[], points: readonly P2[]) {
  const clusters = clusterSignals(points);
  const hits = courses.map(c => {
    if (c.closed) return [];
    const hits = courseSignals(c.line, clusters);
    if (c.turnSignal) {
      const turn = c.turnSignal;
      return [...hits.filter(h => h.key !== turn.key), { ...turn, axis: 0 as const }].sort((a,b) => a.s-b.s);
    }
    return hits;
  });
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
 * behind one another (front bumper to the line, 2 m apart) and leave on a 2 s headway; a
 * follower waits until the car ahead has rolled clear. A car that would queue back past the
 * previous light is held at that light until the car ahead of it leaves (don't block the
 * box). Pure: the result depends only on the inputs, so scrubbing the clock lands every car
 * where a fresh load would. Returns each trip's chainage, or null when it is off the course. */
export function signalPositions(signals: readonly CourseSignal[], length: number, speed: number,
  trips: readonly { start: number; length: number }[], now: number): (number | null)[] {
  const n = trips.length;
  // Holds and spills are keyed by stop line k and trip i as k * n + i.
  let hold = new Map<number, number>();
  let result = signalPass(signals, length, speed, trips, now, hold);
  for (let pass = 0; pass < 6 && result.spills?.size; pass++) {
    let changed = false;
    const next = new Map(hold);
    for (const [key, t] of result.spills) if (!(next.get(key)! >= t)) { next.set(key, t); changed = true; }
    if (!changed) break;
    hold = next;
    result = signalPass(signals, length, speed, trips, now, hold);
  }
  // Final guard: no follower closer than the car ahead allows. Each trip's position never
  // decreases with time, and neither does the minimum of such positions, so this keeps every
  // car moving forward, stays pure, and rules out two cars of one course overlapping.
  const pos = result.pos;
  const order = scratch.order;
  order.length = 0;
  for (let i = 0; i < n; i++) if (pos[i] !== null) order.push(i);
  order.sort((a, b) => pos[b]! - pos[a]!);
  let lead = -1;
  for (const i of order) {
    if (lead >= 0) {
      const limit = pos[lead]! - trips[lead].length / 2 - trips[i].length / 2 - QUEUE_GAP_M;
      if (pos[i]! > limit) pos[i] = limit >= 0 ? limit : null;
    }
    if (pos[i] !== null) lead = i;
  }
  return pos;
}

/** Working arrays reused by every call (the frame loop runs this for each signalised course). */
const scratch = { depart: [] as number[], from: [] as number[], arrive: [] as number[], order: [] as number[],
  settled: [] as boolean[], offstage: [] as boolean[] };

const byArrival = (a: number, b: number) => scratch.arrive[a] - scratch.arrive[b];

function signalPass(signals: readonly CourseSignal[], length: number, speed: number,
  trips: readonly { start: number; length: number }[], now: number, hold: ReadonlyMap<number, number>) {
  const n = trips.length;
  // Each trip's departure time and position from its previous stop line.
  const { depart, from, arrive, order, settled, offstage } = scratch;
  depart.length = from.length = arrive.length = order.length = settled.length = offstage.length = n;
  const pos: (number | null)[] = new Array(n);
  for (let i = 0; i < n; i++) {
    depart[i] = trips[i].start; from[i] = 0; pos[i] = null; settled[i] = false; offstage[i] = false;
  }
  let spills: Map<number, number> | undefined;
  for (let k = 0; k < signals.length; k++) {
    const sig = signals[k];
    for (let i = 0; i < n; i++) { arrive[i] = depart[i] + (sig.s - from[i]) / speed; order[i] = i; }
    // Queue order: arrival time at this stop line.
    order.sort(byArrival);
    // lastClear: when the car ahead has rolled clear of the line, not merely been released.
    let back = 0, lastLeave = -Infinity, lastClear = -Infinity, lastStop = 0, leaderHalf = 0;
    for (let q = 0; q < n; q++) {
      const i = order[q];
      const green = nextGreen(sig.key, sig.axis, arrive[i]);
      const half = trips[i].length / 2;
      // Times are for car centres at the line, so a follower may cross only once the leader's
      // centre has passed it by both half lengths and the gap.
      const clear = lastClear + (leaderHalf + half + QUEUE_GAP_M) / speed;
      const red = green > arrive[i];
      const held = hold.size ? hold.get(k * n + i) ?? -Infinity : -Infinity;
      let leave = arrive[i], stopAt = sig.s;
      if (red || arrive[i] < clear || held > arrive[i]) {
        if (arrive[i] >= clear) back = 0; // the previous queue has cleared: a new one starts
        if (red || held > arrive[i]) {
          // A queue at the light: front bumper to the line, then 2 m behind each car ahead.
          stopAt = sig.s - half - back;
          leave = nextGreen(sig.key, sig.axis, Math.max(green, held, lastLeave + HEADWAY_S));
        } else {
          // Green, but the car ahead is still pulling away: wait right behind it.
          const ahead = lastStop + Math.max(0, arrive[i] - lastLeave) * speed;
          stopAt = Math.min(sig.s - half, ahead - leaderHalf - half - QUEUE_GAP_M);
          leave = Math.max(clear, lastLeave + HEADWAY_S);
        }
        if (stopAt < from[i]) {
          // The queue reaches back past where this leg began. Past the entrance the rest wait
          // offstage; past an earlier light, hold this car there until the one ahead leaves.
          if (from[i] === 0 && k === 0) offstage[i] = true;
          else if (k > 0) (spills ??= new Map()).set((k - 1) * n + i, lastLeave);
          stopAt = from[i];
        }
        // The next car queues behind this one: both half lengths and the gap behind its centre.
        back = sig.s - stopAt + half + QUEUE_GAP_M;
        lastLeave = leave;
        lastStop = stopAt;
        lastClear = leave + (sig.s - stopAt) / speed;
        leaderHalf = half;
      }
      if (!settled[i]) {
        // Where the trip is now on this leg: moving toward its stop, waiting, or past it.
        const reach = depart[i] + (stopAt - from[i]) / speed;
        if (now < depart[i]) { pos[i] = null; settled[i] = true; }
        else if (now < reach) { pos[i] = from[i] + (now - depart[i]) * speed; settled[i] = true; }
        else if (now < leave) { pos[i] = offstage[i] ? null : stopAt; settled[i] = true; }
      }
      offstage[i] = false;
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
  return { pos, spills };
}
