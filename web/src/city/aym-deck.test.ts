import { Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { aymDeckId, createAymDeck } from './aym-deck';
import { detachedParts } from './skin-kit';

// The staged downtown footprint of d56f2678 (OSM way 871428776).
const ring: [number, number][] = [[307.3, -655.8], [307.4, -673.9], [304.5, -674.0], [304.7, -686.1], [289.7, -686.3], [270.3, -686.4], [270.0, -655.9]];
const site: VBuilding = { id: aymDeckId, h: 78.7, floors: 0, rings: [ring] };
// Flat ground at 319 m NAVD88.
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -1000, maxZ: 0 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3193).buffer,
);

it('draws the deck at its lidar roof, not the mapped 78.7 m', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  expect(createAymDeck([other], grid)).toBeNull();
  const result = createAymDeck([other, site], grid)!;
  expect(result.buildings).toEqual([other]);
  result.group.updateMatrixWorld(true);
  const top = new Raycaster(new Vector3(288, 200, -671), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
  expect(top).toBeCloseTo(347, 0);
  expect(detachedParts(result.group, [ring])).toEqual([]);
  const tris = (result.group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);
  expect(tris).toBeLessThan(400);
});
