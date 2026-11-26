/**
 * Node side of baked ground (terrain/ground-bake.ts): mounts Midtown rows as a page does, with
 * fetch served from web/public/data, for the bake script (`pnpm data:bake`) and the parity tests.
 * Not imported by the site.
 */
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { brookwoodGrid } from '../city/brookwood';
import { addSection, bounds, joins, midtownRows, type Area, type Board, type MidtownRow } from '../square-board/sections';
import { GroundGrid } from './grid';
import { createDowntownTerrain } from './model';
import type { TerrainQuality } from './surface';
import { BakeRecorder, encodeBake, type BakedGround } from './ground-bake';

export const dataRoot = new URL('../../public/data/', import.meta.url);
const bytes = (u: URL) => Uint8Array.from(readFileSync(u)).buffer;

/**
 * Stub what a Node mount needs from a page: a canvas (ground maps paint into a no-op context),
 * fetch over web/public/data with `files` (path under /data/ → bytes) served first and no bake
 * read from disk, and an unsliced build. Returns the restore function.
 */
export function stubPage(files: Map<string, Uint8Array> = new Map()) {
  const g = globalThis as unknown as Record<string, unknown>;
  const saved = { document: g.document, fetch: g.fetch, location: g.location };
  const ctx: object = new Proxy(function () {}, { get: () => ctx, apply: () => ctx });
  g.document = { createElement: () => ({ getContext: () => ctx }) };
  g.location = { search: '?slice=0' };
  g.fetch = async (url: string) => {
    const path = url.includes('/data/') ? url.split('/data/')[1] : url.replace(/^\//, '');
    const own = files.get(path);
    if (own) return new Response(own.slice().buffer);
    // Only bakes handed in are served: one on disk may be stale or absent.
    if (path.includes('/ground-bake-')) return new Response(null, { status: 404 });
    try { return new Response(bytes(new URL(path, dataRoot))); } catch { return new Response(null, { status: 404 }); }
  };
  return () => { Object.assign(g, saved); };
}

/**
 * Mount downtown, the north patches and the Midtown rows up to `row`, as City does, and return
 * them (dispose each when done). `record` records the named rows' ground.
 */
export async function mountRows(quality: TerrainQuality, row: MidtownRow, record?: Map<Board, BakeRecorder>) {
  const grid = new GroundGrid(JSON.parse(readFileSync(new URL('scene/downtown/ground.json', dataRoot), 'utf8')), bytes(new URL('scene/downtown/ground.i16', dataRoot)));
  const downtown = createDowntownTerrain(grid, { bounds: bounds.downtown, roads: [], rail: [], buildings: [] }, [], { quality, join: joins('downtown') });
  const mounted = new Map<Board, Area>([['downtown', downtown]]);
  const signal = new AbortController().signal;
  try {
    for (const id of ['north', ...midtownRows.slice(0, midtownRows.indexOf(row) + 1)] as const)
      // As City does, with the Brookwood grid module loaded.
      await addSection(id, mounted, quality, signal, { record: board => record?.get(board), brookwood: async (m, b) => brookwoodGrid(m, b) });
  } catch (error) { for (const a of mounted.values()) a.dispose(); throw error; }
  return mounted;
}

/** Bake one row's ground: mount it recording, and encode the surface its mount leaves. */
export async function bakeRow(quality: TerrainQuality, row: MidtownRow, tapes: 'smaller' | 'always' = 'smaller'): Promise<{ baked: BakedGround; file: Uint8Array }> {
  const recorder = new BakeRecorder();
  const mounted = await mountRows(quality, row, new Map([[row, recorder]]));
  try {
    const manifest = JSON.parse(readFileSync(new URL(`scene/square-board/${row}/ground.json`, dataRoot), 'utf8'));
    const baked = recorder.bake({ id: row, quality, gridSha256: manifest.sha256 }, tapes);
    return { baked, file: gzipSync(encodeBake(baked), { level: 9 }) };
  } finally { for (const a of mounted.values()) a.dispose(); }
}
