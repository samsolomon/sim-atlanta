/** Presentation clock trails receipt by two ordinary polls so the following fix
 * can establish whether the train continued, stopped or reversed at a knot. */
export const PLAYBACK_DELAY_MS = 60_000;

export interface Knot {
  time: number;
  s: number;
  velocity: number; // path metres per millisecond
}

export function appendFix(history: Knot[], s: number, received: number) {
  const playhead = received - PLAYBACK_DELAY_MS;
  while (history.length > 1 && history[1].time <= playhead) history.shift();
  const last = history.at(-1);
  if (last && last.time >= received) return;
  // Once playback has entered a segment its endpoint derivative is fixed.
  // If data arrives late we finish braking, hold the fix, and restart there.
  if (last && last.time < playhead) history.push({ time: playhead, s: last.s, velocity: 0 });
  const b = history.at(-1), a = history.at(-2);
  if (a && b && a.time >= playhead) {
    const before = (b.s - a.s) / (b.time - a.time);
    const after = (s - b.s) / (received - b.time);
    if (before * after > 0) b.velocity = 2 * before * after / (before + after);
  }
  history.push({ time: received, s, velocity: 0 });
}

export function playback(history: readonly Knot[], now: number) {
  const time = now - PLAYBACK_DELAY_MS;
  const i = history.findIndex(p => p.time >= time);
  if (i < 0) return history[history.length - 1].s;
  if (i === 0) return history[0].s;
  const a = history[i - 1], b = history[i];
  const duration = b.time - a.time;
  const f = (time - a.time) / duration;
  const back = 1 - f;
  // Monotone cubic Hermite. Both tangents have the direction of this
  // interval and magnitude at most twice its secant. A dwell has zero tangents.
  return a.s + (b.s - a.s) * f * f * (3 - 2 * f)
    + duration * f * back * (back * a.velocity - f * b.velocity);
}
