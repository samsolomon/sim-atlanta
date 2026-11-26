import { expect, it } from 'vitest';
import { SHARE, cameraWatch, emptySliceStats, frameShare, releaseCamera, runBudgeted, runEveryStep, runSync, sliceInput, type Build } from './slice';

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

it('gives an idle camera a share of what the rest of the frame cost, and a moving one very little', () => {
  const idle = (rest: number) => frameShare(rest, 10_000);
  expect(idle(0)).toBe(SHARE.idleMinMs);
  expect(idle(30)).toBe(30 * SHARE.idleShare);
  expect(idle(4000)).toBe(SHARE.idleMaxMs);
  try {
    sliceInput.inputAt = 10_000 - SHARE.idleAfterMs + 1;
    expect(idle(30)).toBe(SHARE.movingMs);
    sliceInput.inputAt = -Infinity;
    sliceInput.dragging = true;
    expect(idle(30)).toBe(SHARE.movingMs);
    sliceInput.building = 2;
    expect(idle(30)).toBe(SHARE.movingMs / 2);
  } finally { Object.assign(sliceInput, { inputAt: -Infinity, dragging: false, building: 0 }); }
});

it('measures the rest of a frame without any build\'s own work', async () => {
  const c = { t: 0 };
  const rests: number[] = [];
  // Between this build's slices: 30 ms of drawing and 5 ms of another build's work.
  const nextFrame = async () => { c.t += 35; sliceInput.workedMs += 5; };
  await runBudgeted(work(6, 2, c), { budgetMs: rest => { rests.push(rest); return 4; }, nextFrame, now: () => c.t });
  expect(rests).toEqual([0, 30, 30, 30]);
});

it('marks the camera in use whenever the view moves, and not for the tail of a damped orbit', () => {
  const watch = cameraWatch(), at = { x: 0, y: 500, z: 0 }, target = { x: 0, y: 0, z: 0 }, turn = { x: 0, y: 0, z: 0, w: 1 };
  try {
    watch(at, target, turn, 100);
    expect(sliceInput.inputAt).toBe(-Infinity);
    watch({ ...at, x: .005 }, target, turn, 200);
    expect(sliceInput.inputAt).toBe(-Infinity);
    watch({ ...at, x: .5 }, target, turn, 300);
    expect(sliceInput.inputAt).toBe(300);
    watch({ ...at, x: .5 }, { ...target, z: 1 }, turn, 400);
    expect(sliceInput.inputAt).toBe(400);
    watch({ ...at, x: .5 }, { ...target, z: 1 }, { ...turn, y: .001 }, 500);
    expect(sliceInput.inputAt).toBe(500);
    watch({ ...at, x: .5 }, { ...target, z: 1 }, { ...turn, y: .001 }, 600);
    expect(sliceInput.inputAt).toBe(500);
    // From 20 km a metre a frame is the tail of a damped orbit, not a move anyone sees.
    const far = { x: 0, y: 20_000, z: 0 };
    watch(far, target, turn, 700);
    watch({ ...far, x: .9 }, target, turn, 800);
    expect(sliceInput.inputAt).toBe(700);
    watch({ ...far, x: 4 }, target, turn, 900);
    expect(sliceInput.inputAt).toBe(900);
    sliceInput.dragging = true;
    releaseCamera();
    expect(sliceInput).toMatchObject({ dragging: false, inputAt: -Infinity });
  } finally { releaseCamera(); }
});
