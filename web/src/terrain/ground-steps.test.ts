import { expect, it, vi } from 'vitest';
import { staged, STEP_MS, stepsOverBudget } from './step-budget';

/**
 * The ground re-cut, its normals, the yard layer and the landmark batches must each fit a frame's
 * budget in a sliced mount: no such step over STEP_MS at 1x (see step-budget.ts). A step that trips
 * this should yield more often (tessellateSteps every 2 block rows, vertexNormalsSteps by chunk,
 * buildLandmarkBatches while a class's parts are prepared). The near ground's first build is left
 * out: under ?worker=1 it is built off the main thread.
 */
const ROWS = ['brookwood-south', 'midtown-upper', 'midtown-south'] as const;
const GROUND = /^(ground rows|ground normals|carve|yards carve|yard land|yard cover|landmark (probe|parts|cell|batches))$/;

it.skipIf(!staged(ROWS)).each(['low', 'high'] as const)(`no ground, yard or landmark batch step takes over ${STEP_MS} ms at 1x (%s)`, quality => {
  const ctx = new Proxy({}, { get: () => () => { } });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  try {
    expect(stepsOverBudget(ROWS, quality, label => GROUND.test(label))).toEqual([]);
  } finally {
    vi.unstubAllGlobals();
  }
}, 600_000);
