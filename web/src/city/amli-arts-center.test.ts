import { BufferGeometry, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { amliArtsCenterId, createAmliArtsCenter } from './amli-arts-center';

// The staged midtown-upper footprint of osm:way:885667868.
const site: VBuilding = {
  id: amliArtsCenterId,
  h: 82.5,
  floors: 25,
  rings: [[
    [263.3, -3911.2], [263.5, -3937.2], [233.2, -3937.4], [228.7, -3937.5], [226.0, -3937.5], [225.9, -3924.3],
    [225.4, -3858.9], [231.7, -3858.9], [231.7, -3859.6], [262.9, -3859.3], [262.9, -3863.6], [272.5, -3863.6],
    [272.5, -3860.9], [297.2, -3860.9], [297.2, -3862.3], [300.5, -3862.3], [302.0, -3861.4], [325.9, -3867.0],
    [325.8, -3867.8], [339.1, -3871.2], [339.5, -3880.4], [337.8, -3880.4], [337.9, -3884.2], [336.6, -3889.6],
    [331.0, -3888.4], [330.6, -3889.9], [321, -3887.8], [320.0, -3892.5], [296.4, -3887.4], [277.5, -3887.5],
    [272.7, -3887.5], [272.7, -3882.4], [263.1, -3882.4],
  ]],
};
// Flat ground at 274 m NAVD88.
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -4000, maxZ: -3000 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2740).buffer,
);

const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

it('raises the tower on 15th Street to its lidar roof beside the garage deck', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  expect(createAmliArtsCenter([other], grid, 'low')).toBeNull();
  const result = createAmliArtsCenter([other, site], grid, 'high')!;
  expect(result.buildings).toEqual([other]);
  result.group.updateMatrixWorld(true);
  const top = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
  expect(top(300, -3875)).toBeCloseTo(364.3, 1); // tower roof inside the crown frame
  expect(top(240, -3935)).toBeCloseTo(294.1, 1); // garage deck
  expect(top(263.4, -3870)).toBeCloseTo(364.3, 1); // no slit where the deck meets the tower
  expect(top(240, -3920)).toBeCloseTo(294.16, 1); // pool
});

it('keeps the low tier lean', () => {
  const low = createAmliArtsCenter([site], grid, 'low')!;
  const high = createAmliArtsCenter([site], grid, 'high')!;
  expect(triangles(low.group)).toBeLessThan(600);
  expect(triangles(high.group)).toBeGreaterThan(triangles(low.group) * 5);
  low.setNight(1);
  expect((low.group.children[1] as Mesh<BufferGeometry, MeshLambertMaterial>).material.emissiveIntensity).toBeCloseTo(0.66);
});
