import { BufferGeometry, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { createNine15Midtown, nine15MidtownId } from './nine15-midtown';

// The staged midtown-central footprint of osm:way:789980819, reduced to its corners.
const site: VBuilding = {
  id: nine15MidtownId,
  h: 94.44,
  floors: 21,
  rings: [[[415.7, -2880.3], [414.8, -2870.2], [420.7, -2863.8], [488.1, -2862.6], [487.8, -2888.0], [420.2, -2886.3]]],
};
// Flat ground at 293 m NAVD88.
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -3500, maxZ: -2500 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2930).buffer,
);

const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

it('draws the slab at its lidar parapet', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  expect(createNine15Midtown([other], grid, 'low')).toBeNull();
  for (const tier of ['low', 'high'] as const) {
    const result = createNine15Midtown([other, site], grid, tier)!;
    expect(result.buildings).toEqual([other]);
    result.group.updateMatrixWorld(true);
    const top = new Raycaster(new Vector3(451, 200, -2875), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
    expect(top).toBeCloseTo(366.7, 1);
  }
});

it('keeps the low tier lean with a stable night pattern', () => {
  const low = createNine15Midtown([site], grid, 'low')!;
  const again = createNine15Midtown([site], grid, 'low')!;
  const high = createNine15Midtown([site], grid, 'high')!;
  expect(triangles(low.group)).toBeLessThan(400);
  expect(triangles(high.group)).toBeGreaterThan(triangles(low.group) * 5);
  const lamps = (g: typeof low) => g.group.children[1] as Mesh<BufferGeometry, MeshLambertMaterial>;
  expect(lamps(low).geometry.attributes.position.array).toEqual(lamps(again).geometry.attributes.position.array);
  low.setNight(1);
  expect(lamps(low).material.emissiveIntensity).toBeCloseTo(0.66);
});
