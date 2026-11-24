import { expect, it } from 'vitest';
import { emptySliceStats, runBudgeted, runEveryStep, runSync, sliceInput, type Build } from './slice';

function* work(units: number, msEach: number, clock: { t: number }): Build<number> {
  let sum = 0;
  for (let i = 0; i < units; i++) { clock.t += msEach; sum += i; yield 'unit ' + i; }
  return sum;
}

it('runs one build to the same result with every driver', async () => {
  const c = { t: 0 };
  expect(runSync(work(10, 1, c))).toBe(45);
  expect(await runEveryStep(work(10, 1, c))).toBe(45);
  expect(await runBudgeted(work(10, 1, c), { budgetMs: () => 3, nextFrame: async () => {}, now: () => c.t })).toBe(45);
});

it('breaks frames at the budget, reads it every frame, and records the longest slice', async () => {
  const c = { t: 0 };
  let frames = 0;
  const stats = emptySliceStats();
  const nextFrame = async () => { frames++; };
  // 2 ms units against a 4 ms budget: two units per frame.
  await runBudgeted(work(10, 2, c), { budgetMs: () => (sliceInput.dragging ? 2 : 4), nextFrame, now: () => c.t, stats });
  expect(frames).toBe(5);
  expect(stats.maxSliceMs).toBe(4);
  expect(stats.maxStepMs).toBe(2);
  // Dragging halves the share: one unit per frame.
  frames = 0;
  sliceInput.dragging = true;
  try {
    await runBudgeted(work(10, 2, c), { budgetMs: () => (sliceInput.dragging ? 2 : 4), nextFrame, now: () => c.t });
  } finally { sliceInput.dragging = false; }
  expect(frames).toBe(10);
});

it('counts builds in progress for other background work to defer to', async () => {
  const c = { t: 0 };
  let seen = -1;
  await runBudgeted(work(4, 2, c), { budgetMs: () => 2, nextFrame: async () => { seen = sliceInput.building; }, now: () => c.t });
  expect(seen).toBe(1);
  expect(sliceInput.building).toBe(0);
});
