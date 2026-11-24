import { BufferGeometry, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { create77Twelfth, twelfth77Id } from './77-twelfth';

// The staged midtown-upper footprint of osm:way:536895716.
const site: VBuilding = {
  id: twelfth77Id,
  h: 90.1,
  floors: 23,
  rings: [[
    [569.3, -3396.6], [564.2, -3396.7], [564.2, -3339.9], [631.6, -3339.1], [631.6, -3338.7],
    [638.6, -3338.6], [646.9, -3338.6], [646.9, -3346.1], [649.4, -3359.8], [650.9, -3359.5],
    [654.9, -3380.6], [651.6, -3381.2], [651.7, -3382.5], [654.9, -3382.5], [654.9, -3392.5],
    [651.4, -3392.4], [651.3, -3394.9], [651.2, -3396.7], [615.4, -3396.9], [613.3, -3397.6],
    [610.9, -3397.8], [608.5, -3397.6], [606.6, -3397.0], [574.0, -3397.3], [574.1, -3396.6],
  ]],
};
// Flat ground at 292 m NAVD88 with the scene zero used in Midtown.
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -4000, maxZ: -3000 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2920).buffer,
);

const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

it('replaces the generic block with the lidar slab, garage deck and Crescent strip', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  expect(create77Twelfth([other], grid, 'low')).toBeNull();
  const result = create77Twelfth([other, site], grid, 'high')!;
  expect(result.buildings).toEqual([other]);
  result.group.updateMatrixWorld(true);
  const top = (x: number, z: number) => {
    const hit = new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0];
    return hit.point.y + 300;
  };
  expect(top(620, -3390)).toBeCloseTo(372.5, 1); // parapet height over the slab
  expect(top(570, -3345)).toBeCloseTo(312.8, 1); // the garage roof
  expect(top(653, -3385)).toBeCloseTo(302.6, 1); // the Crescent Avenue strip
  expect(top(600, -3356)).toBeCloseTo(312.86, 1); // the pool sits on the deck
});

it('keeps the low tier within the routine skin budget', () => {
  const low = create77Twelfth([site], grid, 'low')!;
  const high = create77Twelfth([site], grid, 'high')!;
  expect(triangles(low.group)).toBeLessThan(700);
  expect(triangles(high.group)).toBeGreaterThan(triangles(low.group) * 5);
  low.setNight(1);
  const lamps = low.group.children[1] as Mesh<BufferGeometry, MeshLambertMaterial>;
  expect(lamps.material.emissiveIntensity).toBeCloseTo(0.7);
});
