import { BufferGeometry, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { createUniversityHouse, universityHouseId } from './university-house';

// The staged midtown-central footprint of osm:way:886034002.
const site: VBuilding = {
  id: universityHouseId,
  h: 80,
  floors: 19,
  rings: [[
    [209.1, -2868.8], [233.1, -2869.3], [240.3, -2869.4], [231.4, -2925.0], [229.0, -2924.9],
    [230.1, -2936.3], [228.0, -2950.1], [177.9, -2947.2], [177.7, -2924.3], [177.4, -2869.3],
  ]],
};
// Flat ground at 286 m NAVD88.
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -3500, maxZ: -2500 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2860).buffer,
);

const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

it('raises the L tower to its lidar roof around the garage deck', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  expect(createUniversityHouse([other], grid, 'low')).toBeNull();
  for (const tier of ['low', 'high'] as const) {
    const result = createUniversityHouse([other, site], grid, tier)!;
    expect(result.buildings).toEqual([other]);
    result.group.updateMatrixWorld(true);
    const top = (x: number, z: number) =>
      new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
    expect(top(195, -2936)).toBeCloseTo(351.6, 1); // the Peachtree Place bar
    expect(top(218, -2890)).toBeCloseTo(351.6, 1); // the Spring Street wing
    expect(top(190, -2900)).toBeCloseTo(294.14, 1); // the amenity deck on the garage
    expect(top(208.7, -2900)).toBeCloseTo(351.6, 1); // deck meets the wing with no slit
    expect(top(235, -2880)).toBeCloseTo(295, 1); // the Spring Street base wedge
  }
});

it('keeps the low tier lean', () => {
  const low = createUniversityHouse([site], grid, 'low')!;
  const high = createUniversityHouse([site], grid, 'high')!;
  expect(triangles(low.group)).toBeLessThan(400);
  expect(triangles(high.group)).toBeGreaterThan(triangles(low.group) * 5);
  low.setNight(1);
  expect((low.group.children[1] as Mesh<BufferGeometry, MeshLambertMaterial>).material.emissiveIntensity).toBeCloseTo(0.66);
});
