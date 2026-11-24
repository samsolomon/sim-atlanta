import { BufferGeometry, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { createTwelveMidtown, twelveMidtownId } from './twelve-midtown';

// The staged brookwood-south footprint of osm:way:247997228.
const site: VBuilding = {
  id: twelveMidtownId,
  h: 85,
  floors: 26,
  rings: [[
    [-644.7, -4174.9], [-629.2, -4174.9], [-629.3, -4171.8], [-574.2, -4171.5], [-574.1, -4174.5], [-558.8, -4174.4],
    [-558.5, -4208.3], [-576.3, -4208.4], [-576.3, -4204.5], [-582.0, -4204.6], [-582, -4208.1], [-587.6, -4208.1],
    [-599.8, -4208.2], [-599.7, -4218.5], [-599.6, -4228.9], [-592.5, -4228.9], [-592.5, -4236.6], [-592.5, -4241.2],
    [-592.3, -4264.3], [-629.7, -4264.5], [-629.7, -4262.9], [-630.5, -4262.9], [-630.6, -4257.3], [-630.6, -4248.9],
    [-630.7, -4243.9], [-635.7, -4243.9], [-635.7, -4234.3], [-640.5, -4234.3], [-640.6, -4229.3], [-635.6, -4229.3],
    [-602.5, -4229.1], [-602.6, -4218.5], [-602.7, -4208.3], [-623.8, -4208.4], [-623.8, -4205.3], [-644.5, -4205.4],
  ]],
};
// Flat ground at 276 m NAVD88.
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: -1000, maxX: 0, minZ: -5000, maxZ: -4000 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2760).buffer,
);

const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

it('draws the slab at its lidar roof with spires and the low wing behind', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  expect(createTwelveMidtown([other], grid, 'low')).toBeNull();
  for (const tier of ['low', 'high'] as const) {
    const result = createTwelveMidtown([other, site], grid, tier)!;
    expect(result.buildings).toEqual([other]);
    result.group.updateMatrixWorld(true);
    const top = (x: number, z: number) =>
      new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
    expect(top(-600, -4190)).toBeCloseTo(365.3, 1); // parapet over the slab
    expect(top(-640, -4196)).toBeGreaterThan(370); // spire apex over the west end
    expect(top(-615, -4250)).toBeCloseTo(284.8, 1); // low wing
    expect(top(-601, -4205.2)).toBeCloseTo(365.3, 1); // wing edge tucked inside the slab
  }
});

it('keeps the low tier within the routine budget', () => {
  const low = createTwelveMidtown([site], grid, 'low')!;
  const high = createTwelveMidtown([site], grid, 'high')!;
  expect(triangles(low.group)).toBeLessThan(600);
  expect(triangles(high.group)).toBeGreaterThan(triangles(low.group) * 5);
  low.setNight(1);
  expect((low.group.children[1] as Mesh<BufferGeometry, MeshLambertMaterial>).material.emissiveIntensity).toBeCloseTo(0.66);
});
