import { expect, it } from 'vitest';
import { Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import fixture from './fixtures/t-deck.json';
import { detachedParts } from './skin-kit';
import { createTDeck, tDeckId } from './t-deck';

const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: 100, maxX: 700, minZ: -400, maxZ: 200 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3138).buffer,
);

it('builds T Deck at the lidar deck height with an open light well and nothing detached', () => {
  const site = fixture as unknown as VBuilding;
  expect(site.id).toBe(tDeckId);
  const other: VBuilding = { id: 'x', h: 10, floors: 3, rings: [[[150, 100], [160, 100], [160, 110], [150, 110]]] };
  const model = createTDeck([site, other], grid)!;
  expect(model.buildings).toEqual([other]);
  model.group.updateMatrixWorld(true);
  const h = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0]?.point.y;
  expect(h(430, -150)! + 323.8 - 313.8).toBeCloseTo(25.1, 0); // top deck
  expect(h(464, -135)).toBeUndefined(); // the light well is open to the sky
  expect(detachedParts(model.group, site.rings)).toEqual([]);
});
