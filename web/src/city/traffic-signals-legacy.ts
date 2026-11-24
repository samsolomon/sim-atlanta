/** Road traffic's signal queue before the 2026-11-24 allocation-free rewrite, kept verbatim for
 * `?perf&traffic=legacy` A/B runs and as the reference in traffic-signals-reference.test.ts.
 * Remove with the legacy traffic path. */
import { nextGreen, type CourseSignal } from './traffic-signals';

const HEADWAY_S = 2;
const QUEUE_GAP_M = 2;

export function legacySignalPositions(signals: readonly CourseSignal[], length: number, speed: number,
  trips: readonly { start: number; length: number }[], now: number): (number | null)[] {
  let hold = new Map<string, number>();
  let result = legacySignalPass(signals, length, speed, trips, now, hold);
  for (let pass = 0; pass < 6 && result.spills.size; pass++) {
    let changed = false;
    const next = new Map(hold);
    for (const [key, t] of result.spills) if (!(next.get(key)! >= t)) { next.set(key, t); changed = true; }
    if (!changed) break;
    hold = next;
    result = legacySignalPass(signals, length, speed, trips, now, hold);
  }
  // Final guard: no follower closer than the car ahead allows. Each trip's position never
  // decreases with time, and neither does the minimum of such positions, so this keeps every
  // car moving forward, stays pure, and rules out two cars of one course overlapping.
  const pos = result.pos;
  const order = pos.map((p, i) => i).filter(i => pos[i] !== null).sort((a, b) => pos[b]! - pos[a]!);
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

function legacySignalPass(signals: readonly CourseSignal[], length: number, speed: number,
  trips: readonly { start: number; length: number }[], now: number, hold: ReadonlyMap<string, number>) {
  const n = trips.length;
  // Each trip's departure time and position from its previous stop line.
  const depart = trips.map(t => t.start), from = trips.map(() => 0);
  const pos: (number | null)[] = trips.map(() => null);
  const settled = trips.map(() => false);
  const offstage = trips.map(() => false);
  const spills = new Map<string, number>();
  signals.forEach((sig, k) => {
    const arrive = trips.map((_, i) => depart[i] + (sig.s - from[i]) / speed);
    // Queue order: arrival time at this stop line.
    const order = [...Array(n).keys()].sort((a, b) => arrive[a] - arrive[b]);
    // lastClear: when the car ahead has rolled clear of the line, not merely been released.
    let back = 0, lastLeave = -Infinity, lastClear = -Infinity, lastStop = 0, leaderHalf = 0;
    for (const i of order) {
      const green = nextGreen(sig.key, sig.axis, arrive[i]);
      const half = trips[i].length / 2;
      // Times are for car centres at the line, so a follower may cross only once the leader's
      // centre has passed it by both half lengths and the gap.
      const clear = lastClear + (leaderHalf + half + QUEUE_GAP_M) / speed;
      const red = green > arrive[i];
      const held = hold.get(`${k}:${i}`) ?? -Infinity;
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
          else if (k > 0) spills.set(`${k - 1}:${i}`, lastLeave);
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
  });
  for (let i = 0; i < n; i++) {
    if (settled[i]) continue;
    const s = from[i] + (now - depart[i]) * speed;
    pos[i] = now < depart[i] ? null : s <= length ? s : null;
  }
  return { pos, spills };
}
