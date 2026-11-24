import { BufferGeometry, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { createWindsorOverPeachtree, windsorOverPeachtreeId } from './windsor-over-peachtree';

// The staged midtown-south footprint of osm:way:234939890.
const site: VBuilding = {
  id: windsorOverPeachtreeId,
  h: 66,
  floors: 20,
  rings: [[
    [517.2, -1951.6], [523.3, -1951.5], [539.8, -1951.4], [546.2, -1951.4], [597.9, -1951.0], [598.0, -1963.8],
    [598.0, -1974.3], [543.5, -1974.7], [536.2, -1974.7], [536.3, -1987.6], [517.4, -1988.2],
  ]],
};
// Flat ground at 311 m NAVD88.
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -2500, maxZ: -1500 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3110).buffer,
);

const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

it('draws the slab at its lidar roof over the low south-west wing', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  expect(createWindsorOverPeachtree([other], grid, 'low')).toBeNull();
  for (const tier of ['low', 'high'] as const) {
    const result = createWindsorOverPeachtree([other, site], grid, tier)!;
    expect(result.buildings).toEqual([other]);
    result.group.updateMatrixWorld(true);
    const top = (x: number, z: number) =>
      new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
    expect(top(557, -1963)).toBeCloseTo(369.5, 1);
    expect(top(527, -1982)).toBeCloseTo(316, 1);
  }
});

it('keeps the low tier lean with a stable night pattern', () => {
  const low = createWindsorOverPeachtree([site], grid, 'low')!;
  const again = createWindsorOverPeachtree([site], grid, 'low')!;
  const high = createWindsorOverPeachtree([site], grid, 'high')!;
  expect(triangles(low.group)).toBeLessThan(500);
  expect(triangles(high.group)).toBeGreaterThan(triangles(low.group) * 3);
  const lamps = (g: typeof low) => g.group.children[1] as Mesh<BufferGeometry, MeshLambertMaterial>;
  expect(lamps(low).geometry.attributes.position.array).toEqual(lamps(again).geometry.attributes.position.array);
  low.setNight(1);
  expect(lamps(low).material.emissiveIntensity).toBeCloseTo(0.66);
});
