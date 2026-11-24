/**
 * Cooperative slicing for long builds. A build is written once as a generator that yields
 * between units of work; `runSync` runs it to completion (boot, tests), and `runBudgeted`
 * steps it a few milliseconds per frame (background mounts), so no single frame carries the
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
  /** Milliseconds of work per frame; read each frame, so it can shrink while the user drags. */
  budgetMs: () => number;
  /** Resolves on the next frame (requestAnimationFrame by default). */
  nextFrame?: () => Promise<unknown>;
  now?: () => number;
}

export async function runBudgeted<T>(build: Build<T>, o: BudgetOptions): Promise<T> {
  const now = o.now ?? (() => performance.now());
  const nextFrame = o.nextFrame ?? (() => new Promise(r => requestAnimationFrame(r)));
  let deadline = now() + o.budgetMs();
  for (;;) {
    const r = build.next();
    if (r.done) return r.value;
    if (now() >= deadline) {
      await nextFrame();
      deadline = now() + o.budgetMs();
    }
  }
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
