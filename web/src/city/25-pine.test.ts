import { BufferGeometry, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { create25Pine, pine25Id } from './25-pine';

// The staged north-band footprint of osm:way:270470130.
const site: VBuilding = {
  id: pine25Id,
  h: 33,
  floors: 10,
  rings: [[
    [440.1, -1490.4], [426.6, -1490.6], [409.9, -1490.8], [398.3, -1490.9], [398.3, -1489.6],
    [398.3, -1485.8], [395.1, -1485.8], [395.0, -1476.3], [398.1, -1476.3], [397.8, -1453.1],
    [397.8, -1451.5], [397.8, -1449.0], [403.6, -1449.0], [403.3, -1426.8], [448.3, -1426.3], [449.0, -1490.3],
  ]],
};
// Flat ground at 303 m NAVD88.
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -2000, maxZ: -1000 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3030).buffer,
);

const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

it('draws the deck at its lidar roof with the three stair towers above it', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  expect(create25Pine([other], grid, 'low')).toBeNull();
  const result = create25Pine([other, site], grid, 'low')!;
  expect(result.buildings).toEqual([other]);
  result.group.updateMatrixWorld(true);
  const top = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
  expect(top(425, -1460)).toBeCloseTo(336.4, 1); // parapet-height deck slab
  expect(top(398, -1481)).toBeCloseTo(341.3, 1); // West Peachtree stair tower
  expect(top(446, -1485)).toBeCloseTo(338.8, 1); // Pine Street stair tower
});

it('keeps the low tier lean and lights the open tiers at night', () => {
  const low = create25Pine([site], grid, 'low')!;
  const high = create25Pine([site], grid, 'high')!;
  expect(triangles(low.group)).toBeLessThan(400);
  expect(triangles(high.group)).toBeGreaterThan(triangles(low.group));
  const lamps = low.group.children[1] as Mesh<BufferGeometry, MeshLambertMaterial>;
  expect(lamps.geometry.attributes.position.count).toBeGreaterThan(0);
  low.setNight(1);
  expect(lamps.material.emissiveIntensity).toBeCloseTo(0.24);
});
