/**
 * Cooperative slicing for long builds. A build is written once as a generator that yields
 * between units of work; `runSync` runs it to completion (boot, tests), and `runBudgeted`
 * steps it a share of each frame (background mounts), so no single frame carries the
 * whole build. The result is the same either way: a yield only hands control back, it never
 * reorders work.
 */
/** A build yields a stage label (or nothing) between units; drivers ignore it, profiles read it. */
export type Build<T> = Generator<string | void, T, void>;

export function runSync<T>(build: Build<T>): T {
  for (;;) {
    const r = build.next();
    if (r.done) return r.value;
  }
}

export interface BudgetOptions {
  /** Milliseconds of work per frame; read each frame, so it can shrink while the user drags.
   * `restMs` is what the rest of the last frame cost, without any build's own work (0 at the start). */
  budgetMs: (restMs: number) => number;
  /** Resolves on the next frame (requestAnimationFrame by default). */
  nextFrame?: () => Promise<unknown>;
  now?: () => number;
  /** Filled in as the build runs: the gate metric is the longest slice of build work in one frame. */
  stats?: SliceStats;
}

export interface SliceStats {
  frames: number;
  /** Longest run of build work inside one frame, ms, and the label of the step that ended it. */
  maxSliceMs: number;
  maxSliceAt: string;
  /** Longest single step (between two yields), ms, and its label. */
  maxStepMs: number;
  maxStepAt: string;
  totalMs: number;
}

export const emptySliceStats = (): SliceStats => ({ frames: 0, maxSliceMs: 0, maxSliceAt: '', maxStepMs: 0, maxStepAt: '', totalMs: 0 });

/**
 * Set by City: `dragging` while the user drags the camera (background builds then take a
 * smaller share), and today's `dayOfYear`, so a sliced build dresses its trees for today.
 * `building` counts sliced builds in progress (runBudgeted), for other background work to
 * defer to; `workedMs` totals the time they have spent building.
 */
export const sliceInput = { dragging: false, dayOfYear: 180, building: 0, workedMs: 0 };

/** The bounds of a frame's build time, all section builds together. */
export const SHARE_MIN_MS = 4, SHARE_MAX_MS = 24;

/**
 * One build's share of the next frame: half of what the rest of the last frame cost, so a slow
 * device fills its board in reasonable time and a fast one keeps its frames; split between the
 * builds under way, and halved while the camera is dragged.
 */
export function frameShare(restMs: number) {
  const share = Math.min(SHARE_MAX_MS, Math.max(SHARE_MIN_MS, restMs / 2)) / Math.max(1, sliceInput.building);
  return sliceInput.dragging ? share / 2 : share;
}

export async function runBudgeted<T>(build: Build<T>, o: BudgetOptions): Promise<T> {
  const now = o.now ?? (() => performance.now());
  const nextFrame = o.nextFrame ?? (() => new Promise(r => requestAnimationFrame(r)));
  const st = o.stats;
  sliceInput.building++;
  try {
  let start = now(), deadline = start + o.budgetMs(0);
  for (;;) {
    const t = now();
    const r = build.next();
    const after = now();
    if (st) {
      const label = (r.done ? 'end' : r.value) || '';
      if (after - t > st.maxStepMs) { st.maxStepMs = after - t; st.maxStepAt = label; }
      if (after - start > st.maxSliceMs) { st.maxSliceMs = after - start; st.maxSliceAt = label; }
      st.totalMs += after - t;
    }
    if (r.done) { if (st) st.frames++; sliceInput.workedMs += after - start; return r.value; }
    if (after >= deadline) {
      if (st) st.frames++;
      sliceInput.workedMs += after - start;
      const worked = sliceInput.workedMs;
      await nextFrame();
      start = now();
      deadline = start + o.budgetMs(Math.max(0, start - after - (sliceInput.workedMs - worked)));
    }
  }
  } finally { sliceInput.building--; }
}

/** Yield after every unit (tests: proves a build is independent of where it yields). */
export async function runEveryStep<T>(build: Build<T>, between?: () => void): Promise<T> {
  for (;;) {
    const r = build.next();
    if (r.done) return r.value;
    between?.();
    await Promise.resolve();
  }
}
