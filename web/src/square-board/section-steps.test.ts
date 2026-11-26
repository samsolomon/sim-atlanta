import { existsSync, readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { brookwoodGrid } from '../city/brookwood';
import { mountStationFragments } from '../city/north-seam-neighborhood';
import { GroundGrid } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import type { TerrainQuality } from '../terrain/surface';
import { slowness, staged } from '../terrain/step-budget';
import { addSection, bounds, joins, midtownRows, type Area, type Board, type TrafficArea } from './sections';

/** How long the main thread is held between yields while a section really mounts, by stage label.
 * `blocks` is filled only while `timing` is set; every step is a frame of its own. */
const probe = vi.hoisted(() => ({ timing: false, mark: 0, blocks: [] as [label: string, ms: number][] }));
vi.mock('../core/slice', async importOriginal => {
  const slice = await importOriginal<typeof import('../core/slice')>();
  return { ...slice, runBudgeted: async <T>(build: import('../core/slice').Build<T>) => {
    if (!probe.mark) probe.mark = performance.now();
    for (;;) {
      const r = build.next(), now = performance.now();
      // Work done between two sliced builds, outside any step, counts with the step after it.
      probe.blocks.push([(r.done ? 'end' : r.value) || '', now - probe.mark]);
      if (r.done) { probe.mark = now; return r.value; }
      await new Promise(resume => setImmediate(resume));
      probe.mark = performance.now();
    }
  } };
});

const ROWS = ['brookwood-station', 'r16'] as const;
const data = new URL('../../public/data/', import.meta.url);
const bytes = (u: URL) => Uint8Array.from(readFileSync(u)).buffer;

/** One build of the north up to R16, keeping the blocks of the two measured sections. */
async function blocksOf(quality: TerrainQuality) {
  const grid = new GroundGrid(JSON.parse(readFileSync(new URL('scene/downtown/ground.json', data), 'utf8')), bytes(new URL('scene/downtown/ground.i16', data)));
  const downtown = createDowntownTerrain(grid, { bounds: bounds.downtown, roads: [], rail: [], buildings: [] }, [], { quality, join: joins('downtown') });
  const mounted = new Map<Board, Area>([['downtown', downtown]]);
  const signal = new AbortController().signal;
  const options = { brookwood: async (...[m, b]: Parameters<typeof brookwoodGrid>) => brookwoodGrid(m, b) };
  const out: [string, number][] = [];
  try {
    for (const row of ['north', ...midtownRows] as const) {
      const measured = (ROWS as readonly string[]).includes(row);
      // Earlier rows build straight through; the measured ones build as a page would.
      vi.stubGlobal('location', { search: measured ? '' : '?slice=0' });
      probe.mark = 0; probe.blocks.length = 0;
      await addSection(row, mounted, quality, signal, options);
      if (measured) {
        // What runs after the last step: joining the board, showing the buildings and the trees.
        probe.blocks.push(['connect', performance.now() - probe.mark]);
        probe.blocks.forEach(([label, ms], i) => out.push([`${row} ${label} #${i}`, ms]));
      }
      if (row === 'brookwood-station') mountStationFragments(mounted.get(row) as TrafficArea, quality);
    }
  } finally { for (const area of mounted.values()) area.dispose(); }
  return out;
}

/** At 1x. A step runs inside one frame, so this is about 200 ms on a phone-class CPU at 6x. */
const LIMIT_MS = 32;

it.skipIf(!staged(ROWS) || !existsSync(new URL('scene/downtown/ground.json', data))).each(['low', 'high'] as const)(`mounting the Station and R16 never holds the main thread over ${LIMIT_MS} ms at 1x (%s)`, async quality => {
  const ctx: object = new Proxy(function () {}, { get: () => ctx, apply: () => ctx });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  vi.stubGlobal('fetch', async (url: string) => {
    let r: Response;
    try { r = new Response(bytes(new URL(url.split('/data/')[1], data))); } catch { return new Response(null, { status: 404 }); }
    // The clock starts once an area's files are read: what follows holds the main thread, so
    // work done on them outside any step (the ramp setup, say) counts with the first one.
    if (url.includes('/square-board/')) for (const read of ['json', 'arrayBuffer'] as const) {
      const body = r[read].bind(r);
      r[read] = async () => { const value = await body(); probe.mark = performance.now(); return value as never; };
    }
    return r;
  });
  try {
    // The fastest of up to five builds per block: a slow block stays slow, a busy machine's does not.
    // The limit scales with the best reference time seen, so a busy moment cannot loosen it.
    const best = new Map<string, number>();
    let slow = Infinity;
    const over = () => [...best].filter(([, ms]) => ms > LIMIT_MS * slow);
    for (let run = 0; run < 5 && (run < 2 || over().length); run++) {
      slow = Math.min(slow, slowness());
      for (const [label, ms] of await blocksOf(quality)) best.set(label, Math.min(best.get(label) ?? Infinity, ms));
    }
    expect(best.size).toBeGreaterThan(200);
    expect(over().map(([label, ms]) => `${label}: ${ms.toFixed(1)} ms (limit ${(LIMIT_MS * slow).toFixed(1)})`)).toEqual([]);
  } finally {
    vi.unstubAllGlobals();
  }
}, 600_000);
