import { existsSync, readFileSync } from 'node:fs';
import { Group, Mesh } from 'three';
import { expect, it, vi } from 'vitest';
import { brookwoodGrid } from '../city/brookwood';
import { prepareNorthLine } from '../city/midtown-marta-rail';
import { GroundGrid } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import { staged } from '../terrain/step-budget';
import { addSection, bounds, joins, midtownRows, type Area, type Board, type TrafficArea } from './sections';

const data = new URL('../../public/data/', import.meta.url);
const bytes = (u: URL) => Uint8Array.from(readFileSync(u)).buffer;
const json = (path: string) => JSON.parse(readFileSync(new URL(path, data), 'utf8'));

/** The North Line is built with its row, before City mounts anything: an abandoned row must free it. */
it.skipIf(!staged(['brookwood-station']) || !existsSync(new URL('scene/downtown/scene.json', data)))('frees the North Line of a Station row that is abandoned after building it', async () => {
  const ctx: object = new Proxy(function () { }, { get: () => ctx, apply: () => ctx });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  vi.stubGlobal('fetch', async (url: string) => {
    try { return new Response(bytes(new URL(url.split('/data/')[1], data))); } catch { return new Response(null, { status: 404 }); }
  });
  const grid = new GroundGrid(json('scene/downtown/ground.json'), bytes(new URL('scene/downtown/ground.i16', data)));
  const downtown = createDowntownTerrain(grid, { bounds: bounds.downtown, roads: [], rail: [], buildings: [] }, [], { quality: 'low', join: joins('downtown') });
  const mounted = new Map<Board, Area>([['downtown', downtown]]);
  const brookwood = async (...[m, b]: Parameters<typeof brookwoodGrid>) => brookwoodGrid(m, b);
  const abandon = new AbortController();
  const freed: unknown[] = [];
  let built: { holder: Group; meshes: number; disposed: number; line: unknown } | undefined;
  const prepare = (id: Board, area: TrafficArea) => id !== 'brookwood-station' ? undefined : (function* () {
    const made = yield* prepareNorthLine(area, json('ga/routes.json'), json('scene/downtown/scene.json').origin, new Group(), line => freed.push(line));
    const seen = built = { holder: made.holder, meshes: 0, disposed: 0, line: made.line };
    made.holder.traverse(o => { if (o instanceof Mesh) { seen.meshes++; o.geometry.addEventListener('dispose', () => seen.disposed++); } });
    // The camera leaves as the line is finished.
    abandon.abort();
  })();
  try {
    for (const row of ['north', ...midtownRows.slice(0, midtownRows.indexOf('brookwood-station'))] as const) await addSection(row, mounted, 'low', new AbortController().signal, { brookwood });
    await expect(addSection('brookwood-station', mounted, 'low', abandon.signal, { brookwood, prepare })).rejects.toThrow();
    expect(built!.line).toBeTruthy();
    expect(built!.meshes).toBeGreaterThan(3);
    expect(freed).toEqual([built!.line]);
    expect(built!.disposed).toBeGreaterThanOrEqual(built!.meshes);
    expect(built!.holder.children.filter(c => c.name !== 'cq400 prewarm template')).toEqual([]);
  } finally {
    for (const area of mounted.values()) area.dispose();
    vi.unstubAllGlobals();
  }
}, 120_000);
