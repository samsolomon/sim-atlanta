import { existsSync, readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import { addSection, bounds, connect, joins, seam, verifySeam, type Area, type Board } from './sections';

import { buildEastRail, extendRail } from '../city/east-rail';
import { terrainAlignment } from '../city/terrain-rail';
import { alignment } from '../vignette/alignment';

const source = new URL('../../../pipeline/prototypes/', import.meta.url);
function file(id: Board, name: string) {
  const path = id === 'downtown' ? 'downtown-ground' : id === 'king' ? 'king-memorial/ground' : id === 'auburn' ? 'sweet-auburn/ground' : 'square-board/' + id;
  return readFileSync(new URL(path + '/' + name, source));
}
function grid(id: Board) {
  return new GroundGrid(JSON.parse(file(id, 'ground.json').toString()), Uint8Array.from(file(id, 'ground.i16')).buffer);
}
afterEach(() => vi.unstubAllGlobals());

it.each(['high', 'low'] as const)('preserves all exterior and internal seam nodes and midpoints on %s', async quality => {
  const ctx = new Proxy({}, { get: () => () => { } });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  let failSouth = true;
  vi.stubGlobal('fetch', async (url: string) => {
    const [, id, name] = url.match(/square-board\/([^/]+)\/(.+)$/)!;
    const data = Uint8Array.from(file(id as Board, name));
    if (failSouth && id === 'south-corner' && name === 'ground.i16') data[0] ^= 1;
    return new Response(data.buffer);
  });
  const mounted = new Map<Board, Area>();
  try {
    for (const id of ['downtown', 'king', 'auburn'] as const) {
      const g = grid(id), context = { bounds: bounds[id], buildings: [], roads: [], rail: [] };
      connect(mounted, new Map([[id, createDowntownTerrain(g, context, [], { quality, bottomY: -48, join: joins(id) })]]));
    }
    const signal = new AbortController().signal;
    await expect(addSection('south', mounted, quality, signal)).rejects.toThrow(/checksum/);
    expect([...mounted.keys()]).toEqual(['downtown', 'king', 'auburn']);
    expect(mounted.get('king')!.board.getObjectByName('joining edge 2')?.visible).toBe(true);
    failSouth = false;
    for (const d of quality === 'high' ? ['north', 'south'] as const : ['south', 'north'] as const) {
      await addSection(d, mounted, quality, signal);
      if (mounted.size === 5) expect(mounted.has(d === 'north' ? 'south-corner' : 'north-corner')).toBe(false);
    }
    let boardArea = 0;
    for (const [id, area] of mounted) {
      const b = bounds[id];
      boardArea += (b.maxX - b.minX) * (b.maxZ - b.minZ);
      for (const [i, edge] of joins(id).entries()) {
        expect(area.board.getObjectByName(i ? 'joining edge ' + i : 'joining edge')?.visible).toBe(false);
        const vertical = 'x' in edge;
        for (let v = vertical ? edge.minZ : edge.minX; v <= (vertical ? edge.maxZ : edge.maxX); v += 2.5) {
          const x = vertical ? edge.x : v, z = vertical ? v : edge.z;
          const h = area.grid.sample(x, z)!;
          expect(area.groundAt(x, z)! + 323.8).toBeCloseTo(h, 4);
        }
      }
    }
    expect(boardArea).toBe(2800 ** 2);
    // A valid-length, separately hashed tile can still disagree on a single shared node.
    const corner = grid('south-corner'), original = corner.sample.bind(corner);
    vi.spyOn(corner, 'sample').mockImplementation((x, z) => x === 1400 && z === 640 ? null : original(x, z));
    expect(() => verifySeam(grid('king'), corner, seam('king', 'south-corner'))).toThrow(/1400,640/);
  } finally { for (const area of mounted.values()) area.dispose(); }
});

const staged = new URL('../../public/data/', import.meta.url);
const railInputs = ['ga/routes.json', 'scene/downtown/scene.json', 'scene/king-memorial/corridor.json'];
it.skipIf(!railInputs.every(path => existsSync(new URL(path, staged))))('joins the existing guideway beds at the downtown–King edge within 2 cm', () => {
  const [routes, manifest, pack] = railInputs.map(path => JSON.parse(readFileSync(new URL(path, staged), 'utf8')));
  const downtown = grid('downtown'), king = grid('king');
  const zero = downtown.manifest.vertical.sceneZeroNavd88M;
  const id = 'marta:path:155177';
  const west = terrainAlignment(alignment(routes, manifest, bounds.downtown, id), id, manifest, downtown);
  const east = buildEastRail(extendRail(manifest, routes), routes, pack, (x, z) => {
    const h = king.sample(x, z);
    return h == null ? null : h - zero;
  }, zero);
  try {
    let lo = 0, hi = west.line.length;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (west.line.at(mid).x < bounds.king.minX) lo = mid;
      else hi = mid;
    }
    expect(west.line.at(lo).x).toBeCloseTo(bounds.king.minX, 5);
    expect(Math.abs(west.elev(lo) - east.bed(east.sSeam))).toBeLessThan(0.02);
  } finally { east.dispose(); }
});
