import { BufferGeometry, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { ascentMidtownId, createAscentMidtown } from './ascent-midtown';

// The staged brookwood-south footprint of osm:way:884939412.
const site: VBuilding = {
  id: ascentMidtownId,
  h: 82.5,
  floors: 25,
  rings: [[
    [337.6, -4338.8], [337.5, -4344.0], [324.8, -4343.9], [324.8, -4341.8], [290.3, -4341.6], [290.4, -4331.5],
    [283.0, -4331.5], [243.9, -4331.3], [236.3, -4331.3], [236.4, -4326.5], [236.4, -4306.4], [236.5, -4300.6],
    [243.2, -4300.7], [250.9, -4300.7], [331.1, -4301.1], [339.1, -4301.1], [339.1, -4307.1], [339.0, -4313.8],
    [338.0, -4313.8], [337.9, -4321.2], [339.7, -4321.2], [339.6, -4334.1], [337.6, -4334.1],
  ]],
};
// Flat ground at 275 m NAVD88.
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -5000, maxZ: -4000 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2750).buffer,
);

const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

it('puts the L-shaped tower and its crown over the lidar podium', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  expect(createAscentMidtown([other], grid, 'low')).toBeNull();
  const result = createAscentMidtown([other, site], grid, 'high')!;
  expect(result.buildings).toEqual([other]);
  result.group.updateMatrixWorld(true);
  const top = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
  expect(top(310, -4332)).toBeCloseTo(366.5, 1); // crown over the north slab
  expect(top(326, -4312)).toBeCloseTo(366.5, 1); // crown over the West Peachtree wing
  expect(top(262, -4325)).toBeCloseTo(295.1, 1); // podium deck
  expect(top(268, -4313)).toBeCloseTo(295.16, 1); // pool on the deck
  // The deck meets the tower with no slit between them.
  expect(top(311.8, -4315)).toBeCloseTo(295.1, 1);
  expect(top(300, -4321.8)).toBeCloseTo(295.1, 1);
});

it('keeps the low tier lean', () => {
  const low = createAscentMidtown([site], grid, 'low')!;
  const high = createAscentMidtown([site], grid, 'high')!;
  expect(triangles(low.group)).toBeLessThan(500);
  expect(triangles(high.group)).toBeGreaterThan(triangles(low.group) * 5);
  low.setNight(1);
  expect((low.group.children[1] as Mesh<BufferGeometry, MeshLambertMaterial>).material.emissiveIntensity).toBeCloseTo(0.66);
});
