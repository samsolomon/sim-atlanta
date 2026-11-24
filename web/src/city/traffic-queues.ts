import { nextGreen, type CourseSignal } from './traffic-signals';

export interface MovingBlock { rear: number; front: number }
export type MovingBlocks = (seconds: number) => readonly MovingBlock[];
export interface QueueTrip { start: number; length: number }
export const MOVING_QUEUE_WAIT_S = 180;
const STEP = .5;
const GAP = 2;

/** A deterministic replay cache, not a frame-delta simulation. Fractional samples
 * never change checkpoints, and a backward seek rebuilds from the same grid. */
export class MovingQueue {
  private key = '';
  private tick = 0;
  private order: number[] = [];
  private cohort: readonly QueueTrip[] = [];
  // Row k is the last complete grid state with the first k trips absent.
  // All rows share the same historical blocker sample. When the oldest slot
  // wraps, its successor already has the state a fresh seek would reconstruct.
  private suffixes: (number | null)[][] = [];
  steps = 0;

  constructor(private readonly signals: readonly CourseSignal[], private readonly length: number,
    private readonly speed: number, private readonly blocks: MovingBlocks) {}

  at(trips: readonly QueueTrip[], now: number): (number | null)[] {
    if (!trips.length) return [];
    const key = trips.map(t => `${t.start}:${t.length}`).join('|');
    const target = Math.floor(now / STEP);
    if (key !== this.key || target < this.tick) {
      const order = trips.map((_, i) => i).sort((a, b) => trips[a].start-trips[b].start || a-b);
      const retained = order.filter(i => trips[i].start < this.tick * STEP);
      const offset = this.order.length - retained.length;
      const canResume = target >= this.tick && offset >= 0 && retained.every((i, j) => {
        const previous = this.cohort[this.order[offset + j]];
        return previous.start === trips[i].start && previous.length === trips[i].length;
      });
      const rows = order.map((_, k) => {
        const row: (number | null)[] = trips.map(() => null);
        if (canResume && k < retained.length) {
          const saved = this.suffixes[offset + k];
          for (let j = k; j < retained.length; j++) row[retained[j]] = saved[this.order[offset + j]];
        }
        return row;
      });
      if (!canResume || !retained.length) this.tick = Math.floor(trips[order[0]].start / STEP);
      this.key = key;
      this.cohort = trips;
      this.order = order;
      this.suffixes = rows;
    }
    const order = this.order;
    while (this.tick < target) {
      const from = this.tick * STEP, to = from + STEP;
      const blocks = this.blocks(to);
      for (let k = 0; k < order.length && trips[order[k]].start <= to; k++) {
        this.suffixes[k] = this.advance(trips, order, this.suffixes[k], from, to, blocks, k);
      }
      this.tick++;
    }
    const from = this.tick*STEP;
    const checkpoint = this.suffixes[0];
    let positions = checkpoint;
    if (now > from) {
      // Interpolate immutable grid states. Sampling a newly entering streetcar
      // at arbitrary frame times could otherwise pull a fractional frame back.
      const next = this.advance(trips, order, checkpoint, from, from+STEP);
      const signalLimit = this.advance(trips, order, checkpoint, from, now, []);
      positions = trips.map((trip,i) => {
        if (trip.start>now || next[i]===null) return null;
        const begin=Math.max(from,trip.start), before=checkpoint[i] ?? 0;
        const f=(now-begin)/(from+STEP-begin);
        return Math.min(before+(next[i]!-before)*f,signalLimit[i] ?? Infinity);
      });
    }
    return positions.map(p => p !== null && p <= this.length ? p : null);
  }

  private advance(trips: readonly QueueTrip[], order: number[], previous: readonly (number|null)[], from: number, to: number, blocks = this.blocks(to), first = 0) {
    this.steps++;
    const positions = [...previous];
    let leader = -1;
    for (let j = first; j < order.length; j++) {
      const i = order[j];
      const trip = trips[i];
      if (trip.start > to) continue;
      const before = previous[i] ?? 0;
      const begin = Math.max(from,trip.start);
      let position = before + Math.max(0,to-begin)*this.speed;
      for (const sig of this.signals) {
        const stop = Math.max(0,sig.s-trip.length/2);
        if (before > stop+1e-7 || position <= stop) continue;
        const arrival = begin + (stop-before)/this.speed;
        const release = nextGreen(sig.key,sig.axis,arrival);
        position = Math.min(position,stop+Math.max(0,to-release)*this.speed);
      }
      for (const block of blocks) {
        // A streetcar already behind this car must not pull it backwards.
        if (before > block.rear || block.front < 0 || block.rear > this.length) continue;
        position = Math.min(position,Math.max(before,block.rear-trip.length/2-GAP));
      }
      if (leader >= 0) {
        const limit = positions[leader]!-trips[leader].length/2-trip.length/2-GAP;
        position = Math.min(position,Math.max(before,limit));
      }
      positions[i] = position;
      leader = i;
    }
    return positions;
  }
}
