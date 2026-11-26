import { existsSync, readFileSync } from 'node:fs';
import { neighborhoodTrees } from '../city/neighborhood-trees';
import { midtownLights } from '../city/midtown-night';
import { joins } from '../square-board/sections';
import { Builder } from '../vignette/geom';
import { GroundGrid } from './grid';
import { buildDowntownTerrain } from './model';
import type { TerrainQuality } from './surface-build';

/**
 * Test helper (Node only): how long each step of a staged row's sliced build takes at 1x, for the
 * step-budget tests. In a sliced mount a step runs inside one frame's budget, so a
 * step over STEP_MS is a frame over budget on a phone.
 *
 * Machine load is kept out of it two ways. Each step keeps its fastest time across builds, and a
 * row is rebuilt (up to eight builds in all) only while one of its steps is still over: builds are
 * deterministic, so a slow step stays slow while one a busy machine slowed comes back under. And
 * the limit scales up, never down, on a machine slower than a fixed reference workload.
 */
export const STEP_MS = 8;
const scene = new URL('../../public/data/scene/square-board/', import.meta.url);
export const staged = (rows: readonly string[]) => rows.every(r => existsSync(new URL(`${r}/context.json`, scene)));

/** A fixed slice of landmark-like work (a Builder's triangles and their geometry); REF_MS is its
 * fastest time on an M-series core. */
const REF_MS = 9;
function reference() {
  const b = new Builder();
  for (let i = 0; i < 20_000; i++) b.quad([i, 0, 0], [i, 1, 0], [i + 1, 1, 0], [i + 1, 0, 0], i % 2 ? '#8a8f94' : '#c9c2b4');
  b.geometry().dispose();
}
const timed = (f: () => void) => { const t = performance.now(); f(); return performance.now() - t; };

/** How much slower than the reference core this machine is running now (never below 1). */
export function slowness() {
  let ref = Infinity;
  for (let i = 0; i < 3; i++) ref = Math.min(ref, timed(reference));
  return Math.max(1, ref / REF_MS);
}

/**
 * Steps over budget, as `<row> <label> #<n>: <ms> ms (limit <ms>)`. A step is named by the label
 * its build yields when it ends. `counts(label)` picks the steps a test is about.
 */
export function stepsOverBudget(rows: readonly string[], quality: TerrainQuality, counts: (label: string) => boolean) {
  const best = new Map<string, number>();
  let ref = Infinity;
  function measure(row: string) {
    for (let i = 0; i < 3; i++) ref = Math.min(ref, timed(reference));
    const dir = new URL(`${row}/`, scene);
    const g = new GroundGrid(JSON.parse(readFileSync(new URL('ground.json', dir), 'utf8')), Uint8Array.from(readFileSync(new URL('ground.i16', dir))).buffer);
    const c = JSON.parse(readFileSync(new URL('context.json', dir), 'utf8'));
    const gen = buildDowntownTerrain(g, c, neighborhoodTrees(c, quality), { quality, bottomY: -48, join: joins(row as Parameters<typeof joins>[0]), lights: midtownLights });
    let t = performance.now(), n = 0;
    for (;;) {
      const r = gen.next();
      const now = performance.now(), ms = now - t;
      t = now;
      if (r.done) { r.value.dispose(); break; }
      const label = r.value ?? '', key = `${row} ${label} #${n++}`;
      if (counts(label)) best.set(key, Math.min(best.get(key) ?? Infinity, ms));
    }
  }
  const limit = () => STEP_MS * Math.max(1, ref / REF_MS);
  const over = () => [...best].filter(([, ms]) => ms > limit());
  for (let run = 0; run < 2; run++) for (const row of rows) measure(row);
  for (let run = 0; run < 6 && over().length; run++) for (const row of rows) if (over().some(([l]) => l.startsWith(row + ' '))) measure(row);
  return over().map(([l, ms]) => `${l}: ${ms.toFixed(1)} ms (limit ${limit().toFixed(1)})`);
}
