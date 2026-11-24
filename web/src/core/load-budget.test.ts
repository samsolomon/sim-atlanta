import { describe, expect, it } from 'vitest';
import { LoadBudget } from './load-budget';

/** A budget on a fake clock whose frames advance only when the test calls `frame()`. */
function harness(frameMs = 4, maxInFlight = 2) {
  let t = 0;
  let pending: (() => void)[] = [];
  const b = new LoadBudget({ frameMs, maxInFlight, now: () => t, schedule: cb => { pending.push(cb); } });
  return {
    b,
    spend(ms: number) { t += ms; },
    frame() { const run = pending; pending = []; for (const cb of run) cb(); },
    async settle() { for (let i = 0; i < 50 && (pending.length || b.pending); i++) { await Promise.resolve(); await Promise.resolve(); this.frame(); } },
  };
}

describe('LoadBudget', () => {
  it('runs ground, then buildings, then trees, then props, nearest first within a stage', async () => {
    const h = harness(1000);
    const order: string[] = [];
    const add = (area: string, stage: 'ground' | 'buildings' | 'trees' | 'props', priority: number) =>
      h.b.enqueue(area, stage, () => { order.push(`${stage}:${area}`); }, { priority });
    const all = [add('far', 'props', 900), add('near', 'trees', 100), add('far', 'ground', 900), add('near', 'buildings', 100),
      add('near', 'ground', 100), add('mid', 'ground', 400)];
    h.frame();
    await Promise.all(all);
    expect(order).toEqual(['ground:near', 'ground:mid', 'ground:far', 'buildings:near', 'trees:near', 'props:far']);
  });

  it('spreads work across frames by its millisecond budget, but always runs one job', async () => {
    const h = harness(4);
    let ran = 0;
    for (let i = 0; i < 6; i++) void h.b.enqueue('a', 'ground', () => { h.spend(3); ran++; });
    h.frame();
    expect(ran).toBe(2); // 3 ms, then 6 ms passes the 4 ms budget
    h.frame();
    expect(ran).toBe(4);
    void h.b.enqueue('b', 'ground', () => { h.spend(20); ran++; });
    h.frame(); h.frame(); h.frame();
    expect(ran).toBe(7);
    const s = h.b.stats();
    expect(s.overBudgetFrames).toBeGreaterThan(0);
    expect(s.maxFrameMs).toBe(20);
    expect(s.byStage.ground.ran).toBe(7);
  });

  it('drops aborted work without running it', async () => {
    const h = harness();
    const c = new AbortController();
    let ran = false;
    const p = h.b.enqueue('far', 'buildings', () => { ran = true; }, { signal: c.signal });
    c.abort();
    await expect(p).rejects.toThrow(/cancelled/);
    h.frame();
    expect(ran).toBe(false);
    expect(h.b.stats().aborted).toBe(1);
    expect(h.b.pending).toBe(0);
    await expect(h.b.enqueue('far', 'ground', () => {}, { signal: c.signal })).rejects.toThrow(/cancelled/);
  });

  it('caps async jobs in flight and resolves each when its promise settles', async () => {
    const h = harness(1000, 1);
    const gates: (() => void)[] = [];
    const started: number[] = [];
    const jobs = [0, 1, 2].map(i => h.b.enqueue('a', 'ground', () => { started.push(i); return new Promise<void>(r => gates.push(r)); }));
    h.frame();
    expect(started).toEqual([0]);
    gates[0]();
    await jobs[0];
    await h.settle();
    expect(started).toEqual([0, 1]);
    gates[1](); gates[2]?.();
    await h.settle();
    gates[2]();
    await Promise.all(jobs);
    expect(h.b.pending).toBe(0);
  });

  it('rejects a job that throws and keeps going', async () => {
    const h = harness(1000);
    const bad = h.b.enqueue('a', 'ground', () => { throw new Error('boom'); });
    const good = h.b.enqueue('a', 'buildings', () => {});
    h.frame();
    await expect(bad).rejects.toThrow('boom');
    await expect(good).resolves.toBeUndefined();
    expect(h.b.stats().failed).toBe(1);
  });

  it('reprioritizes queued work when the camera moves', async () => {
    const h = harness(1000);
    const order: string[] = [];
    const a = h.b.enqueue('a', 'ground', () => { order.push('a'); }, { priority: 100 });
    const b = h.b.enqueue('b', 'ground', () => { order.push('b'); }, { priority: 900 });
    h.b.reprioritize('b', 10);
    h.frame();
    await Promise.all([a, b]);
    expect(order).toEqual(['b', 'a']);
  });
});
