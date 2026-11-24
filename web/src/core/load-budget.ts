/**
 * Streamed-area load staging (?stream=1 only; default City never calls it).
 *
 * Work for many areas queues here and runs a few milliseconds per frame instead of all at once, so
 * the camera keeps moving while areas mount. Order is ground, then buildings, then trees, then props,
 * and within a stage the lowest `priority` (the ring manager passes distance to the camera) first.
 * A job is atomic: one long job still overruns its frame, so callers split work by stage and area.
 * Async work (fetch, parse) runs outside the frame budget, with at most `maxInFlight` at once, and
 * its synchronous part still counts against the frame it started in.
 */
import { perf } from './perf';

export type LoadStage = 'ground' | 'buildings' | 'trees' | 'props';
export const LOAD_STAGES: readonly LoadStage[] = ['ground', 'buildings', 'trees', 'props'];

export interface EnqueueOptions {
  signal?: AbortSignal;
  /** Lower runs first within a stage; the ring manager passes metres to the camera. */
  priority?: number;
}

export interface LoadBudgetOptions {
  /** CPU milliseconds of queued work per frame. At least one job runs each frame. */
  frameMs?: number;
  /** Async jobs allowed in flight at once. */
  maxInFlight?: number;
  now?: () => number;
  /** Next-frame scheduler; requestAnimationFrame in the browser. */
  schedule?: (cb: () => void) => void;
}

export interface LoadBudgetStats {
  queued: number;
  inFlight: number;
  ran: number;
  aborted: number;
  failed: number;
  frames: number;
  /** Frames whose queued work went past frameMs (a single long job), and the worst one. */
  overBudgetFrames: number;
  maxFrameMs: number;
  totalMs: number;
  byStage: Record<LoadStage, { ran: number; ms: number }>;
}

interface Job {
  area: string;
  stage: LoadStage;
  rank: number;
  priority: number;
  seq: number;
  work: () => void | Promise<void>;
  signal?: AbortSignal;
  resolve: () => void;
  reject: (e: unknown) => void;
}

const abortError = () => new DOMException('Load cancelled', 'AbortError');

export class LoadBudget {
  frameMs: number;
  maxInFlight: number;
  private readonly now: () => number;
  private readonly schedule: (cb: () => void) => void;
  private queue: Job[] = [];
  private seq = 0;
  private scheduled = false;
  private inFlight = 0;
  private s: Omit<LoadBudgetStats, 'queued' | 'inFlight'> = LoadBudget.emptyStats();

  constructor(o: LoadBudgetOptions = {}) {
    this.frameMs = o.frameMs ?? 6;
    this.maxInFlight = o.maxInFlight ?? 2;
    this.now = o.now ?? (() => performance.now());
    this.schedule = o.schedule ?? (cb => requestAnimationFrame(() => cb()));
  }

  private static emptyStats(): Omit<LoadBudgetStats, 'queued' | 'inFlight'> {
    return {
      ran: 0, aborted: 0, failed: 0, frames: 0, overBudgetFrames: 0, maxFrameMs: 0, totalMs: 0,
      byStage: { ground: { ran: 0, ms: 0 }, buildings: { ran: 0, ms: 0 }, trees: { ran: 0, ms: 0 }, props: { ran: 0, ms: 0 } },
    };
  }

  enqueue(area: string, stage: LoadStage, work: () => void | Promise<void>, o: EnqueueOptions = {}): Promise<void> {
    if (o.signal?.aborted) return Promise.reject(abortError());
    return new Promise<void>((resolve, reject) => {
      const job: Job = { area, stage, rank: LOAD_STAGES.indexOf(stage), priority: o.priority ?? 0, seq: this.seq++, work, signal: o.signal, resolve, reject };
      this.queue.push(job);
      // Drop an aborted job straight away so a far area's cancelled work never waits behind others.
      o.signal?.addEventListener('abort', () => {
        const i = this.queue.indexOf(job);
        if (i < 0) return;
        this.queue.splice(i, 1);
        this.s.aborted++;
        reject(abortError());
      }, { once: true });
      this.wake();
    });
  }

  /** Re-rank queued work for one area, for example when the camera moves toward it. */
  reprioritize(area: string, priority: number) {
    for (const j of this.queue) if (j.area === area) j.priority = priority;
  }

  get pending() { return this.queue.length + this.inFlight; }

  /** Resolves once nothing is queued or in flight. */
  async idle(): Promise<void> {
    while (this.pending) await new Promise<void>(r => this.schedule(r));
  }

  stats(): LoadBudgetStats {
    return { ...this.s, byStage: structuredClone(this.s.byStage), queued: this.queue.length, inFlight: this.inFlight };
  }

  resetStats() { this.s = LoadBudget.emptyStats(); }

  private wake() {
    if (this.scheduled || !this.queue.length) return;
    this.scheduled = true;
    this.schedule(() => { this.scheduled = false; this.pump(); });
  }

  private next(): Job | undefined {
    let best = -1;
    for (let i = 0; i < this.queue.length; i++) {
      const a = this.queue[i], b = best < 0 ? undefined : this.queue[best];
      if (!b || a.rank < b.rank || (a.rank === b.rank && (a.priority < b.priority || (a.priority === b.priority && a.seq < b.seq)))) best = i;
    }
    return best < 0 ? undefined : this.queue.splice(best, 1)[0];
  }

  private pump() {
    const start = this.now();
    let ran = 0;
    while (this.queue.length && (ran === 0 || this.now() - start < this.frameMs)) {
      if (this.inFlight >= this.maxInFlight) break;
      const job = this.next()!;
      ran++;
      const t = this.now();
      let result: void | Promise<void>;
      try {
        result = job.work();
      } catch (e) {
        this.s.failed++;
        job.reject(e);
        continue;
      }
      const ms = this.now() - t;
      const st = this.s.byStage[job.stage];
      st.ran++;
      st.ms += ms;
      this.s.ran++;
      if (result && typeof (result as Promise<void>).then === 'function') {
        this.inFlight++;
        (result as Promise<void>).then(job.resolve, e => { this.s.failed++; job.reject(e); })
          .finally(() => { this.inFlight--; this.wake(); });
      } else job.resolve();
    }
    if (ran) {
      const frame = this.now() - start;
      this.s.frames++;
      this.s.totalMs += frame;
      this.s.maxFrameMs = Math.max(this.s.maxFrameMs, frame);
      if (frame > this.frameMs) this.s.overBudgetFrames++;
    }
    this.wake();
  }
}

/** The shared City instance. City sets frameMs per tier (low 4 ms, high 8 ms) when streaming starts. */
export const loadBudget = new LoadBudget();
perf.setStreamSource(() => ({ pending: loadBudget.pending, stats: loadBudget.stats() }));
