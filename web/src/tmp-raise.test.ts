import { readFileSync } from 'node:fs';
import { it, vi } from 'vitest';
import { addSection, bounds, connect, joins, midtownRows, type Area, type Board } from './square-board/sections';
import { GroundGrid } from './terrain/grid';
import { createDowntownTerrain } from './terrain/model';
const source = new URL('../../pipeline/prototypes/', import.meta.url);
const file = (id: Board, name: string) => readFileSync(new URL((id === 'downtown' ? 'downtown-ground' : id === 'king' ? 'king-memorial/ground' : id === 'auburn' ? 'sweet-auburn/ground' : 'square-board/' + id) + '/' + name, source));
const grid = (id: Board) => new GroundGrid(JSON.parse(file(id, 'ground.json').toString()), Uint8Array.from(file(id, 'ground.i16')).buffer);
it('raise', async () => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  vi.stubGlobal('fetch', async (url: string) => { const [, id, name] = url.match(/square-board\/([^/]+)\/(.+)$/)!; return new Response(Uint8Array.from(file(id as Board, name)).buffer); });
  const m = new Map<Board, Area>(), sig = new AbortController().signal;
  for (const id of ['downtown', 'king', 'auburn'] as const) connect(m, new Map([[id, createDowntownTerrain(grid(id), { bounds: bounds[id], buildings: [], roads: [], rail: [] }, [], { quality: 'high', bottomY: -48, join: joins(id) })]]));
  (globalThis as any).__raise = [];
  await addSection('south', m, 'high', sig); await addSection('north', m, 'high', sig);
  for (const r of midtownRows.slice(0, 3)) await addSection(r, m, 'high', sig);
  const r: number[][] = (globalThis as any).__raise; const d = r.map(x => x[0]);
  const b = [0.001, 0.03, 0.1, 0.3, 1, 99].map((t, i, a) => d.filter(v => v >= (i ? a[i-1] : -1) && v < t).length);
  console.log('verts', d.length, 'raise buckets <1mm,<3cm,<10cm,<30cm,<1m,>1m', b.join(' '), 'max', Math.max(...d).toFixed(2));
  const deep = r.filter(x => x[0] > 0.3); const cells = new Map<string, number>(); for (const x of deep) { const k = Math.round(x[1]/50)*50 + ',' + Math.round(x[2]/50)*50; cells.set(k, Math.max(cells.get(k) ?? 0, x[0])); }
  console.log('deep sites', [...cells].slice(0, 12).map(([k, v]) => k + ':' + v.toFixed(2)).join('  '));
}, 60000);
