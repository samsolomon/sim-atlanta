import { readFileSync } from 'node:fs';
import { Raycaster, Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import { seventeenthAccess } from './seventeenth-street';
import { auburnTransport } from './sweet-auburn-transport';

const directory = new URL('../../../pipeline/prototypes/square-board/midtown-upper/', import.meta.url);
const read = (name: string) => readFileSync(new URL(name, directory));
const grid = new GroundGrid(JSON.parse(read('ground.json').toString()), Uint8Array.from(read('ground.i16')).buffer);
afterEach(() => vi.unstubAllGlobals());

it.each(['low', 'high'] as const)('mounts both Arts Center roofs above the plaza and bus loop on %s', (quality) => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  const city = seventeenthAccess(auburnTransport(JSON.parse(read('context.json').toString())));
  const terrain = createDowntownTerrain(grid, city, [], { quality });
  try {
    terrain.group.updateMatrixWorld(true);
    for (const [name, x, z] of [
      ['Arts Center station', 451, -3933],
      ['Arts Center bus canopy', 391, -3920],
    ] as const) {
      const ray = new Raycaster(new Vector3(x, 100, z), new Vector3(0, -1, 0));
      const model = terrain.scenery.getObjectByName(name);
      expect(model, name).toBeDefined();
      const hit = ray.intersectObject(model!)[0];
      expect(hit.point.y - terrain.groundAt(x, z)!).toBeGreaterThan(3);
    }
  } finally {
    terrain.dispose();
  }
});
