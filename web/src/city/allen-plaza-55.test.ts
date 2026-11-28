import { Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { allenPlaza55Id, createAllenPlaza55 } from './allen-plaza-55';
import { detachedParts } from './skin-kit';

const ring: [number, number][] = [[171.1, -1235.4], [171.6, -1273.2], [165.2, -1273.2], [165.2, -1276.3], [137.0, -1276.7], [137.0, -1273.7], [131.0, -1273.8], [130.1, -1211.4], [136.5, -1211.3], [136.5, -1208.9], [164.6, -1208.5], [164.6, -1211.2], [168.6, -1211.1], [170.7, -1211.1], [170.7, -1211.8], [170.9, -1220.9], [175.9, -1220.8], [175.9, -1223.9], [176.0, -1227.0], [170.9, -1227.1]];
const site: VBuilding = { id: allenPlaza55Id, h: 72.6, floors: 14, rings: [ring] };
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -2000, maxZ: -1000 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2993).buffer,
);

it('draws 55 Allen Plaza at its lidar roof, not the mapped 72.6 m, with nothing loose', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  expect(createAllenPlaza55([other], grid)).toBeNull();
  for (const tier of ['low', 'high'] as const) {
    const result = createAllenPlaza55([other, site], grid, tier)!;
    expect(result.buildings).toEqual([other]);
    result.group.updateMatrixWorld(true);
    const top = (x: number, z: number) =>
      new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
    expect(top(135, -1265)).toBeCloseTo(299.3 + 57.6, 1);
    expect(top(151, -1242)).toBeCloseTo(299.3 + 66, 1);
    expect(detachedParts(result.group, [ring])).toEqual([]);
  }
  const low = createAllenPlaza55([site], grid, 'low')!;
  expect((low.group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0)).toBeLessThan(800);
});
