import { readFileSync } from 'node:fs';
import type { Mesh } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import type { JoiningEdge } from '../terrain/surface';
import { boardPoint, eastJoin, northBounds, northSouthJoin, northWestJoin } from './board-footprint';
import { verifyNorth } from './sweet-auburn-board';

function baked(folder: string) {
  const base = new URL('../../../pipeline/prototypes/' + folder + '/', import.meta.url);
  const bytes = Uint8Array.from(readFileSync(new URL('ground.i16', base))).buffer;
  return new GroundGrid(JSON.parse(readFileSync(new URL('ground.json', base), 'utf8')), bytes);
}

afterEach(() => vi.unstubAllGlobals());

it.each(['high', 'low'] as const)('joins the rendered ground, skirts and triple corner on %s', quality => {
  const west = baked('downtown-ground'), south = baked('king-memorial/ground'), north = baked('sweet-auburn/ground');
  verifyNorth(west, south, north);
  vi.stubGlobal('document', { createElement: () => ({ getContext: () =>
    ({ scale() {}, translate() {}, fillRect() {}, setLineDash() {} }) }) });
  const area = (g: GroundGrid, join: JoiningEdge[]) => createDowntownTerrain(g,
    { bounds: g.manifest.bounds, buildings: [], roads: [], rail: [] }, [], { quality, join });
  const w = area(west, [eastJoin, northWestJoin]), s = area(south, [eastJoin, northSouthJoin]),
    n = area(north, [northWestJoin, northSouthJoin]);
  try {
    w.openJoin(); s.openJoin();
    for (const board of [w,s]) expect(board.board.getObjectByName('joining edge 1')?.visible).toBe(true);
    w.openJoin(1); s.openJoin(1); n.openJoin(); n.openJoin(1);
    for (const model of [w,s,n]) {
      for (const child of model.board.children as Mesh[]) {
        if (!child.visible) continue;
        const pos = child.geometry.getAttribute('position');
        for (let i = 0; i < pos.count; i += 3) {
          const xs = [0,1,2].map(j => pos.getX(i+j)), zs = [0,1,2].map(j => pos.getZ(i+j));
          if (xs.every(x => x === 1000)) expect(Math.min(...zs) >= 640 || Math.max(...zs) <= -520).toBe(true);
          if (zs.every(z => z === 280)) expect(Math.max(...xs) <= 1000 || Math.min(...xs) >= 1800).toBe(true);
        }
      }
    }
    for (let d = 0; d <= 800; d += 2.5) {
      const z = northBounds.minZ + d, x = northBounds.minX + d;
      const westY = w.groundAt(1000,z)!, southY = s.groundAt(x,280)!;
      expect(n.groundAt(1000,z)).toBeCloseTo(westY, 5);
      expect(n.groundAt(x,280)).toBeCloseTo(southY, 5);
      expect(n.groundAt(x,280)).toBeCloseTo(north.sample(x,280)! - 323.8, 4);
      expect(n.groundAt(1000,z)).toBeCloseTo(north.sample(1000,z)! - 323.8, 4);
    }
    expect(w.groundAt(1000,280)).toBe(s.groundAt(1000,280));
    expect(boardPoint(w.bounds,true,1300,-200,true)).toEqual({x:1300,z:-200});
    expect(boardPoint(w.bounds,true,1300,-200)).toEqual({x:1000,z:-200});
  } finally { for (const region of [w,s,n]) region.dispose(); }
});

it('rejects a tile with a changed south seam node before opening either wall', () => {
  const north = baked('sweet-auburn/ground'), south = baked('king-memorial/ground');
  const original = south.sample.bind(south);
  vi.spyOn(south,'sample').mockImplementation((x,z) => x === 1150 && z === 280 ? null : original(x,z));
  expect(() => verifyNorth(baked('downtown-ground'), south, north)).toThrow(/shared ground/);
});
