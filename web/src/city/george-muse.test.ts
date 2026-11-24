import { Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { createGeorgeMuse, georgeMuseId } from './george-muse';
import { detachedParts } from './skin-kit';

const ring: [number, number][] = [[214.2, -135.0], [219.7, -144.4], [218.5, -145.8], [192.7, -175.9], [189.2, -179.9], [178.8, -171.3], [209.7, -134.5]];
const site: VBuilding = { id: georgeMuseId, h: 41.4, floors: 8, rings: [ring] };
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -1000, maxZ: 0 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3206).buffer,
);

it('draws the Muse building at its lidar roof with its cornice, nothing loose', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  expect(createGeorgeMuse([other], grid)).toBeNull();
  for (const tier of ['low', 'high'] as const) {
    const result = createGeorgeMuse([other, site], grid, tier)!;
    expect(result.buildings).toEqual([other]);
    result.group.updateMatrixWorld(true);
    const y = new Raycaster(new Vector3(200, 200, -157), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
    expect(y).toBeCloseTo(320.6 + 37.6, 1);
    expect(detachedParts(result.group, [ring])).toEqual([]);
  }
  const low = createGeorgeMuse([site], grid, 'low')!;
  expect((low.group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0)).toBeLessThan(600);
});
