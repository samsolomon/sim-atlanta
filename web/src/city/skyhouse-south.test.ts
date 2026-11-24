import { BufferGeometry, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { createSkyhouseSouth, skyhouseSouthId } from './skyhouse-south';

// The staged midtown-central footprint of osm:way:445841094.
const site: VBuilding = {
  id: skyhouseSouthId,
  h: 90.1,
  floors: 23,
  rings: [[
    [743.7, -2637.1], [741.7, -2614], [741.5, -2612.2], [752.5, -2611.3], [786.2, -2608.3], [796.6, -2607.4],
    [798.9, -2633.1], [797.6, -2633.3], [790.9, -2633.9], [788.3, -2634.1], [754.6, -2636.9], [743.7, -2637.9],
  ]],
};
// Flat ground at 305 m NAVD88.
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -3000, maxZ: -2000 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3050).buffer,
);

const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

it('draws the slab at its lidar roof with the set-back sky deck', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  expect(createSkyhouseSouth([other], grid, 'low')).toBeNull();
  for (const tier of ['low', 'high'] as const) {
    const result = createSkyhouseSouth([other, site], grid, tier)!;
    expect(result.buildings).toEqual([other]);
    result.group.updateMatrixWorld(true);
    const top = (x: number, z: number) =>
      new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
    expect(top(770, -2622)).toBeCloseTo(384.6, 1); // sky deck
    expect(top(746, -2614)).toBeCloseTo(380.7, 0); // main roof at the corner, beside the deck
  }
});

it('keeps the low tier lean and lights rooms from the shared hash', () => {
  const low = createSkyhouseSouth([site], grid, 'low')!;
  const again = createSkyhouseSouth([site], grid, 'low')!;
  const high = createSkyhouseSouth([site], grid, 'high')!;
  expect(triangles(low.group)).toBeLessThan(400);
  expect(triangles(high.group)).toBeGreaterThan(triangles(low.group) * 5);
  const lamps = (g: typeof low) => (g.group.children[1] as Mesh<BufferGeometry, MeshLambertMaterial>);
  expect(lamps(low).geometry.attributes.position.array).toEqual(lamps(again).geometry.attributes.position.array);
  low.setNight(1);
  expect(lamps(low).material.emissiveIntensity).toBeCloseTo(0.66);
});
