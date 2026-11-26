import { existsSync, readFileSync } from 'node:fs';
import * as THREE from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import { addSection, bounds, joins, type Area, type Board } from './sections';

// Record every far-form registration (the far prefix length each transport mesh keeps).
const keeps = vi.hoisted(() => [] as { name: string; keep: number }[]);
vi.mock('../terrain/far-form', async importOriginal => {
  const m = await importOriginal<typeof import('../terrain/far-form')>();
  return { ...m, registerFar: (mesh: THREE.Mesh, keep: number, o?: Parameters<typeof m.registerFar>[2]) => {
    keeps.push({ name: mesh.name, keep });
    return m.registerFar(mesh, keep, o);
  } };
});

const source = new URL('../../../pipeline/prototypes/', import.meta.url);
// The staged rows (pnpm data) carry the full Connector decks; the prototype fixtures a subset.
const staged = new URL('../../public/data/scene/', import.meta.url);
const hasStaged = existsSync(new URL('square-board/north-band/context.json', staged));
let useStaged = false;
const file = (id: Board, name: string) => id !== 'downtown' && useStaged
  ? readFileSync(new URL('square-board/' + id + '/' + name, staged))
  : readFileSync(new URL((id === 'downtown' ? 'downtown-ground' : 'square-board/' + id) + '/' + name, source));
afterEach(() => vi.unstubAllGlobals());

/** Names and order of every mesh, and their exact attribute bytes, indices and draw ranges. */
function fingerprint(root: THREE.Object3D) {
  const meshes: string[] = [];
  let h = 2166136261;
  const mix = (v: number) => { h ^= v; h = Math.imul(h, 16777619) >>> 0; };
  const bytes = (a: ArrayLike<number> & { buffer?: ArrayBufferLike; byteOffset?: number }) => {
    const f = a instanceof Float32Array ? new Uint32Array(a.buffer, a.byteOffset, a.length) : a;
    for (let i = 0; i < f.length; i++) mix(f[i] | 0);
  };
  root.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    meshes.push(m.name);
    const g = m.geometry;
    for (const name of Object.keys(g.attributes).sort()) { for (const c of name) mix(c.charCodeAt(0)); bytes(g.getAttribute(name).array as Float32Array); }
    if (g.index) bytes(g.index.array as Uint32Array);
    mix(g.drawRange.start); mix(Number.isFinite(g.drawRange.count) ? g.drawRange.count : -1);
  });
  return { hash: h.toString(16), meshes };
}

async function mountNorth(sliced: boolean) {
  vi.stubGlobal('location', { search: sliced ? '' : '?slice=0' });
  const downtown = createDowntownTerrain(new GroundGrid(JSON.parse(file('downtown', 'ground.json').toString()), Uint8Array.from(file('downtown', 'ground.i16')).buffer),
    { bounds: bounds.downtown, roads: [], rail: [], buildings: [] }, [], { quality: 'low', bottomY: -48, join: joins('downtown') });
  keeps.length = 0;
  const added = await addSection('north', new Map<Board, Area>([['downtown', downtown]]), 'low', new AbortController().signal);
  const out = { prints: [...added].map(([id, a]) => [id, fingerprint(a.group)] as const), keeps: [...keeps] };
  for (const a of added.values()) a.dispose();
  downtown.dispose();
  return out;
}

it.each([false, ...(hasStaged ? [true] : [])])('the Connector band builds byte-identical decks, carved ground and far prefixes sliced and synchronously (staged data %s)', async stagedRows => {
  useStaged = stagedRows;
  const ctx = new Proxy({}, { get: () => () => { } });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  let frames = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => { frames++; cb(performance.now()); }, 0));
  vi.stubGlobal('fetch', async (url: string) => {
    const [, id, name] = url.match(/square-board\/([^/]+)\/(.+)$/)!;
    return name.endsWith('.json') ? Response.json(JSON.parse(file(id as Board, name).toString())) : new Response(Uint8Array.from(file(id as Board, name)).buffer);
  });
  const sync = await mountNorth(false);
  frames = 0;
  const sliced = await mountNorth(true);
  expect(frames).toBeGreaterThan(5);
  expect(sync.keeps.some(k => k.name === 'Decks and embedded rails' && k.keep > 0)).toBe(true);
  expect(sliced.keeps).toEqual(sync.keeps);
  expect(sliced.prints).toEqual(sync.prints);
}, 120_000);

it('a transport build closed at its last yield has assembled and registered nothing', async () => {
  const ctx = new Proxy({}, { get: () => () => { } });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  useStaged = false;
  const { buildSurfaceTransport } = await import('../terrain/transport');
  const { northConnectorTransport } = await import('./connector-ground');
  const g = new GroundGrid(JSON.parse(file('north-band', 'ground.json').toString()), Uint8Array.from(file('north-band', 'ground.i16')).buffer);
  const city = northConnectorTransport(JSON.parse(file('north-band', 'context.json').toString()));
  keeps.length = 0;
  const gen = buildSurfaceTransport(city, g, (x, z) => g.sample(x, z));
  let label: string | void = undefined;
  for (;;) { const r = gen.next(); if (r.done) throw Error('no transport meshes yield'); label = r.value; if (label === 'transport meshes') break; }
  // The mount is abandoned here: the generator is closed. Mesh assembly (far ordering,
  // registerFar, the freight texture) is one step after this yield, so nothing was made yet.
  gen.return(undefined as never);
  expect(keeps).toEqual([]);
});
