import { Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { createRenaissanceLofts, renaissanceLoftsId } from './renaissance-lofts';
import { detachedParts } from './skin-kit';

const ring: [number, number][] = [[718.9, -1223.3], [711.2, -1223.4], [710.5, -1190.6], [746.3, -1189.9], [746.6, -1210.4], [746.8, -1222.8]];
const site: VBuilding = { id: renaissanceLoftsId, h: 62.9, floors: 16, rings: [ring] };
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -1500, maxZ: -500 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3036).buffer,
);

it('draws the slab at its lidar roof with the penthouse and nothing loose', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  expect(createRenaissanceLofts([other], grid)).toBeNull();
  for (const tier of ['low', 'high'] as const) {
    const result = createRenaissanceLofts([other, site], grid, tier)!;
    expect(result.buildings).toEqual([other]);
    result.group.updateMatrixWorld(true);
    const top = (x: number, z: number) =>
      new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
    expect(top(715, -1215)).toBeCloseTo(303.6 + 57.8, 1);
    expect(top(729, -1207)).toBeCloseTo(303.6 + 63.4, 1);
    expect(detachedParts(result.group, [ring])).toEqual([]);
  }
  const low = createRenaissanceLofts([site], grid, 'low')!;
  expect((low.group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0)).toBeLessThan(600);
});
