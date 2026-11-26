import { existsSync, readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { neighborhoodTrees } from '../city/neighborhood-trees';
import { midtownLights } from '../city/midtown-night';
import { joins } from '../square-board/sections';
import { Builder } from '../vignette/geom';
import { GroundGrid } from './grid';
import { buildDowntownTerrain } from './model';

/**
 * The landmark tail must not regrow: in a sliced mount (?slice=1) each landmark step runs inside
 * one frame's budget, so no single step may take more than STEP_MS here (1x CPU, the fastest of
 * several builds, scaled for a slow machine by a reference workload). A new skin that trips this
 * should yield at its part boundaries (see buildArtsCampusLandmark, buildMidtownLandmark,
 * symphonyTower) or move a heavy helper off the per-build path (atlasPixels caches its pixels).
 */
const STEP_MS = 8;
const scene = new URL('../../public/data/scene/square-board/', import.meta.url);
const ROWS = ['midtown-south', 'midtown-central', 'midtown-upper'] as const;
const staged = ROWS.every(r => existsSync(new URL(`${r}/context.json`, scene)));

/** A fixed slice of landmark-like work (a Builder's triangles and their geometry), to tell a slow or
 * busy machine from a slow step. REF_MS is its time on an M-series core; a machine that runs it
 * slower gets a proportionally larger STEP_MS, never a smaller one. */
const REF_MS = 9;
function reference() {
  const b = new Builder();
  for (let i = 0; i < 20_000; i++) b.quad([i, 0, 0], [i, 1, 0], [i + 1, 1, 0], [i + 1, 0, 0], i % 2 ? '#8a8f94' : '#c9c2b4');
  b.geometry().dispose();
}
const timed = (f: () => void) => { const t = performance.now(); f(); return performance.now() - t; };

it.skipIf(!staged).each(['low', 'high'] as const)('no landmark build step takes over 8 ms at 1x (%s)', quality => {
  const ctx = new Proxy({}, { get: () => () => { } });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  const best = new Map<string, number>();
  let ref = Infinity;
  /** One build of a row, keeping each landmark step's fastest time across builds. */
  function measure(row: typeof ROWS[number]) {
    for (let i = 0; i < 3; i++) ref = Math.min(ref, timed(reference));
    const dir = new URL(`${row}/`, scene);
    const g = new GroundGrid(JSON.parse(readFileSync(new URL('ground.json', dir), 'utf8')), Uint8Array.from(readFileSync(new URL('ground.i16', dir))).buffer);
    const c = JSON.parse(readFileSync(new URL('context.json', dir), 'utf8'));
    const gen = buildDowntownTerrain(g, c, neighborhoodTrees(c, quality), { quality, bottomY: -48, join: joins(row), lights: midtownLights });
    // Landmark steps: everything after the board (and the bridge approaches) and before the carve:
    // the landmark loop in buildDowntownTerrain, with the labelled parts of the stepped modules.
    let t = performance.now(), n = 0, inLandmarks = false;
    for (;;) {
      const r = gen.next();
      const now = performance.now(), ms = now - t;
      t = now;
      if (r.done) { r.value.dispose(); break; }
      const step = r.value ?? '';
      if (step === 'board' || step === 'bridge approaches') { inLandmarks = true; continue; }
      if (step === 'carve') inLandmarks = false;
      if (!inLandmarks) continue;
      const label = `${row} ${step} #${n++}`;
      best.set(label, Math.min(best.get(label) ?? Infinity, ms));
    }
  }
  const limit = () => STEP_MS * Math.max(1, ref / REF_MS);
  const over = () => [...best].filter(([, ms]) => ms > limit());
  for (let run = 0; run < 2; run++) for (const row of ROWS) measure(row);
  // Builds are deterministic, so a step that is really slow stays slow; one that a busy machine or a
  // collection slowed comes back under on a rebuild. Rebuild only the rows still over.
  for (let run = 0; run < 6 && over().length; run++) for (const row of ROWS) if (over().some(([l]) => l.startsWith(row + ' '))) measure(row);
  vi.unstubAllGlobals();
  expect(over().map(([l, ms]) => `${l}: ${ms.toFixed(1)} ms (limit ${limit().toFixed(1)})`)).toEqual([]);
}, 600_000);
