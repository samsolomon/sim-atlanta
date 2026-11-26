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
 * Set by City: `dragging` while a camera gesture is held, `inputAt` the last time the camera was
 * in use (builds then stay out of the way), and today's `dayOfYear`, so a sliced build
 * dresses its trees for today. `building` counts sliced builds in progress (runBudgeted), for
 * other background work to defer to; `workedMs` totals the time they have spent building.
 */
export const sliceInput = { dragging: false, inputAt: -Infinity, dayOfYear: 180, building: 0, workedMs: 0 };

/**
 * Build time per frame, all section builds together. While the camera is in use (a drag, or input
 * within `idleAfterMs`) building takes `movingMs`. Otherwise it takes `idleShare` of what the
 * rest of the last frame cost, from `idleMinMs` to `idleMaxMs`: a still map fills fast (measured
 * in docs/perf.md), and steps back as soon as someone touches it.
 */
export const SHARE = { movingMs: 2, idleAfterMs: 1000, idleShare: 1, idleMinMs: 4, idleMaxMs: 50 };

type Vec = { readonly x: number; readonly y: number; readonly z: number };

/**
 * Call once a frame, after everything that moves the camera: marks it in use whenever the view
 * changed since the last frame, however it moved (a gesture, a key, a slider, a glide, a followed
 * vehicle). Movements under a centimetre or so, a damped orbit's tail, do not count.
 */
export function cameraWatch() {
  const last = new Float64Array(10);
  let seen = false;
  return (position: Vec, target: Vec, turn: Vec & { readonly w: number }, now = performance.now()) => {
    const view = [position.x, position.y, position.z, target.x, target.y, target.z, turn.x, turn.y, turn.z, turn.w];
    if (seen && view.every((v, i) => Math.abs(v - last[i]) <= (i < 6 ? .02 : 1e-5))) return;
    if (seen) sliceInput.inputAt = now;
    seen = true;
    last.set(view);
  };
}

/** No camera is in use: for a City that is leaving, or a gesture that will never end. */
export function releaseCamera() {
  sliceInput.dragging = false;
  sliceInput.inputAt = -Infinity;
}

/** One build's share of the next frame, split between the builds under way. */
export function frameShare(restMs: number, now = performance.now()) {
  const moving = sliceInput.dragging || now - sliceInput.inputAt < SHARE.idleAfterMs;
  const share = moving ? SHARE.movingMs : Math.min(SHARE.idleMaxMs, Math.max(SHARE.idleMinMs, restMs * SHARE.idleShare));
  return share / Math.max(1, sliceInput.building);
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

/**
 * How City builds an area on this page: spread over frames, a share of each (frameShare; the
 * sliced-build gate: no long task while an area mounts). Null builds it in one task: under
 * ?slice=0, for comparisons and profiles, and in Node.
 */
export function sliceBudget() {
  return typeof location === 'undefined' || new URLSearchParams(location.search).get('slice') === '0' ? null : frameShare;
}
/** Sliced-build stats across every area this page loaded, for the perf harness. */
export const sliceStats = emptySliceStats();
if (typeof window !== 'undefined') (window as unknown as { __sliceStats?: SliceStats }).__sliceStats = sliceStats;

/** Yield after every unit (tests: proves a build is independent of where it yields). */
export async function runEveryStep<T>(build: Build<T>, between?: () => void): Promise<T> {
  for (;;) {
    const r = build.next();
    if (r.done) return r.value;
    between?.();
    await Promise.resolve();
  }
}
