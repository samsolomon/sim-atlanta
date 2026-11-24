/**
 * Main-thread client for terrain/surface-worker.ts. Heights are read here (a grid may be a
 * subclass with its own node()), the tessellation, normals and far mesh run in the Worker.
 * Without Worker support (tests, old browsers) it builds inline with the same code.
 */
import type { GroundGrid } from './grid';
import type { OpenSlot } from './openings';
import { surfaceSpec, type BuiltSurface } from './surface';
import { buildSurfaceArrays, nodeHeights, type TerrainJoins, type TerrainQuality } from './surface-build';

let worker: Worker | undefined;
let seq = 0;
const pending = new Map<number, { resolve: (b: BuiltSurface) => void; reject: (e: Error) => void }>();

function start() {
  if (worker) return worker;
  worker = new Worker(new URL('./surface-worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<{ id: number; built?: BuiltSurface; error?: string }>) => {
    const p = pending.get(e.data.id);
    if (!p) return;
    pending.delete(e.data.id);
    if (e.data.built) p.resolve(e.data.built);
    else p.reject(Error(e.data.error ?? 'surface worker failed'));
  };
  // A Worker that fails (to load, or later) is dropped, so the next request starts a fresh one.
  worker.onerror = e => {
    worker?.terminate(); worker = undefined;
    for (const p of pending.values()) p.reject(Error(e.message || 'surface worker failed'));
    pending.clear();
  };
  return worker;
}

export function prebuildSurface(grid: GroundGrid, quality: TerrainQuality, openings: readonly OpenSlot[] | undefined,
  join: TerrainJoins | undefined, farErrorM?: number): Promise<BuiltSurface> {
  const spec = surfaceSpec(grid);
  const { heights, minY } = nodeHeights(spec, (r, c) => grid.node(r, c));
  const input = { spec, heights, minY, quality, openings: openings ? [...openings] : [], join, farErrorM };
  if (typeof Worker === 'undefined') return Promise.resolve(buildSurfaceArrays(input));
  const id = ++seq;
  // The heights are transferred, so keep a copy for the inline fallback.
  const fallback = { ...input, heights: heights.slice() };
  return new Promise<BuiltSurface>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    start().postMessage({ id, input }, [heights.buffer]);
  }).catch(error => {
    console.warn('Surface worker unavailable; building on the main thread', error);
    return buildSurfaceArrays(fallback);
  });
}
