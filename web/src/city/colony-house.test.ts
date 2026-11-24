import { BufferGeometry, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { colonyHouseId, createColonyHouse } from './colony-house';

// The staged midtown-upper footprint of osm:way:536740360.
const site = {"id":"osm:way:536740360","h":62,"floors":14,"rings":[[[890.84,-3772.26],[898.26,-3779.52],[863.25,-3814.51],[857.58,-3808.95],[855.2,-3811.32],[851.96,-3814.56],[857.98,-3820.61],[822.57,-3855.87],[819.67,-3852.95],[816.06,-3849.33],[814.24,-3851.14],[809.18,-3846.07],[809.02,-3845.05],[809.66,-3844.21],[811.43,-3844.09],[808.65,-3841.37],[843.27,-3806.03],[841.97,-3804.76],[841.65,-3804.21],[841.63,-3803.48],[841.94,-3802.88],[842.65,-3802.45],[843.6,-3802.53],[844.5,-3803.31],[845.87,-3801.95],[846.32,-3801.5],[844.17,-3799.37],[843.79,-3798.82],[843.76,-3798.03],[844.08,-3797.46],[844.61,-3797.12],[845.34,-3797.09],[846.03,-3797.51],[848.78,-3800.23],[854.53,-3794.22],[846.53,-3786.29],[843.36,-3783.15],[866.87,-3759.47],[870.14,-3762.71],[878.01,-3770.5],[883.34,-3764.93]]],"parts":[{"id":"osm:way:1451518597","rings":[[[851.78,-3803.18],[877.93,-3776.6],[882.43,-3781.02],[856.27,-3807.6]]],"h":62,"tier":"inferred"},{"id":"osm:way:1451518598","rings":[[[841.97,-3804.76],[841.65,-3804.21],[841.63,-3803.48],[841.94,-3802.88],[842.65,-3802.45],[843.6,-3802.53],[844.5,-3803.31],[845.87,-3801.95],[846.32,-3801.5],[844.17,-3799.37],[843.79,-3798.82],[843.76,-3798.03],[844.08,-3797.46],[844.61,-3797.12],[845.34,-3797.09],[846.03,-3797.51],[848.78,-3800.23],[851.78,-3803.18],[856.27,-3807.6],[853.8,-3809.91],[850.28,-3813.27],[843.27,-3806.03]]],"h":62,"tier":"inferred"},{"id":"osm:way:1451518599","rings":[[[841.9,-3822.14],[833.23,-3830.68],[826.92,-3824.29],[835.6,-3815.75]]],"h":62,"tier":"inferred"},{"id":"osm:way:1451518600","rings":[[[854.53,-3794.22],[878.01,-3770.5],[883.34,-3764.93],[890.84,-3772.26],[898.26,-3779.52],[863.25,-3814.51],[857.58,-3808.95],[855.2,-3811.32],[851.96,-3814.56],[857.98,-3820.61],[822.57,-3855.87],[819.67,-3852.95],[816.06,-3849.33],[814.24,-3851.14],[809.18,-3846.07],[809.02,-3845.05],[809.66,-3844.21],[811.43,-3844.09],[808.65,-3841.37],[843.27,-3806.03],[850.28,-3813.27],[853.8,-3809.91],[856.27,-3807.6],[882.43,-3781.02],[877.93,-3776.6],[851.78,-3803.18],[848.78,-3800.23]],[[841.9,-3822.14],[835.6,-3815.75],[826.92,-3824.29],[833.23,-3830.68]]],"h":62,"tier":"inferred"},{"id":"osm:way:1414724126","rings":[[[878.01,-3770.5],[854.53,-3794.22],[846.53,-3786.29],[870.14,-3762.71]]],"h":8.9,"tier":"inferred"},{"id":"osm:way:1414724125","rings":[[[843.36,-3783.15],[866.87,-3759.47],[870.14,-3762.71],[846.53,-3786.29]]],"h":4.4,"tier":"inferred"}]} as VBuilding;
// Flat ground at 292.5 m NAVD88 (the lidar ground ring) with a Midtown scene zero.
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -4500, maxZ: -3500 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2925).buffer,
);
const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

it('sets the slab, cores and wings at their lidar heights, not the mapped 62 m', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  const result = createColonyHouse([other, site], site, grid)!;
  expect(site.id).toBe(colonyHouseId);
  expect(result.buildings).toEqual([other]);
  result.group.updateMatrixWorld(true);
  const top = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 250, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
  expect(top(830, -3835)).toBeCloseTo(340.2, 1); // slab roof
  expect(top(866, -3793)).toBeCloseTo(343.5, 1); // lift core
  expect(top(862, -3778)).toBeCloseTo(305.3, 1); // wing toward 15th Street
});

it('lights about three balconies in ten inside the routine budget', () => {
  const result = createColonyHouse([site], site, grid)!;
  expect(result.group.children).toHaveLength(2);
  expect(triangles(result.group)).toBeLessThan(1000);
  result.setNight(1);
  const lamps = result.group.children[1] as Mesh<BufferGeometry, MeshLambertMaterial>;
  expect(lamps.material.emissiveIntensity).toBeCloseTo(0.62);
  // No lit bays hide inside the lift core that fills the slab's slot.
  const pos = lamps.geometry.attributes.position;
  let inCore = 0;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + 853, z = pos.getZ(i) - 3808;
    if (x > 853 && x < 881 && z > -3806 && z < -3780 && Math.abs((x - 852) + (z + 3803.2)) < 3) inCore++;
  }
  expect(inCore).toBe(0);
  expect(pos.count / 6).toBeGreaterThan(50);
});
