import { readFileSync } from 'node:fs';
import { BufferGeometry, Texture } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import { addSection, bounds, joins, type Area, type Board } from './sections';

const source = new URL('../../../pipeline/prototypes/', import.meta.url);
const file = (id: Board, name: string) => readFileSync(new URL((id === 'downtown' ? 'downtown-ground' : 'square-board/' + id) + '/' + name, source));
afterEach(() => vi.unstubAllGlobals());

/**
 * A sliced mount that is abandoned (the camera left) must free everything it made. A normal
 * mount followed by dispose sets the count of geometries and textures freed; each of 20
 * abandoned mounts must free exactly as many, and nothing may join the mosaic.
 */
it('20 abandoned sliced mounts each dispose everything a completed mount makes', async () => {
  const ctx = new Proxy({}, { get: () => () => { } });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  vi.stubGlobal('location', { search: '' });
  let frames = 0, abortAt = Infinity, onFrame = () => { };
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => { if (++frames === abortAt) onFrame(); cb(performance.now()); }, 0));
  vi.stubGlobal('fetch', async (url: string) => {
    const [, id, name] = url.match(/square-board\/([^/]+)\/(.+)$/)!;
    return name.endsWith('.json') ? Response.json(JSON.parse(file(id as Board, name).toString())) : new Response(Uint8Array.from(file(id as Board, name)).buffer);
  });
  const downtown = createDowntownTerrain(new GroundGrid(JSON.parse(file('downtown', 'ground.json').toString()), Uint8Array.from(file('downtown', 'ground.i16')).buffer),
    { bounds: bounds.downtown, roads: [], rail: [], buildings: [] }, [], { quality: 'low', bottomY: -48, join: joins('downtown') });
  const geo = vi.spyOn(BufferGeometry.prototype, 'dispose'), tex = vi.spyOn(Texture.prototype, 'dispose');
  const count = () => [geo.mock.calls.length, tex.mock.calls.length];
  // Reference: a completed mount, then dispose.
  const mounted = new Map<Board, Area>([['downtown', downtown]]);
  let before = count();
  const added = await addSection('north', mounted, 'low', new AbortController().signal);
  const steps = frames;
  for (const a of added.values()) a.dispose();
  const freed = count().map((n, i) => n - before[i]);
  expect(steps).toBeGreaterThan(5);
  expect(freed[0]).toBeGreaterThan(20);
  for (let cycle = 0; cycle < 20; cycle++) {
    const m = new Map<Board, Area>([['downtown', downtown]]);
    const ctl = new AbortController();
    frames = 0;
    // Abandon part way through the build, at a different point each cycle.
    // (Frame counts vary with timing, so stay within the first eight frames.)
    abortAt = 1 + cycle % 8;
    onFrame = () => ctl.abort();
    before = count();
    await expect(addSection('north', m, 'low', ctl.signal)).rejects.toThrow(/abort/i);
    expect(count().map((n, i) => n - before[i])).toEqual(freed);
    expect([...m.keys()]).toEqual(['downtown']);
  }
}, 120_000);
