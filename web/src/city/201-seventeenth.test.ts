import { BufferGeometry, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { create201Seventeenth, seventeenth201Id } from './201-seventeenth';

// The staged brookwood-south footprint of osm:way:269542287.
const site = {"id":"osm:way:269542287","h":72,"floors":17,"rings":[[[-312.82,-4206.17],[-313.12,-4178.11],[-313.2,-4171.41],[-307.65,-4171.34],[-307.7,-4167.19],[-261.41,-4166.69],[-261.37,-4171.03],[-256.14,-4170.97],[-256.06,-4177.72],[-255.77,-4205.55]]],"parts":[{"id":"osm:way:1562299331","rings":[[[-261.1,-4180.77],[-261.01,-4193.61],[-307.44,-4193.97],[-307.54,-4181.12]]],"h":77,"tier":"reported"},{"id":"osm:way:1562299333","rings":[[[-255.77,-4205.55],[-312.82,-4206.17],[-313.12,-4178.11],[-307.58,-4178.06],[-307.65,-4171.34],[-307.7,-4167.19],[-261.41,-4166.69],[-261.37,-4171.03],[-261.29,-4177.78],[-256.06,-4177.72]],[[-307.54,-4181.12],[-307.44,-4193.97],[-261.01,-4193.61],[-261.1,-4180.77]]],"h":72,"tier":"reported"},{"id":"osm:way:1562299334","rings":[[[-256.06,-4177.72],[-261.29,-4177.78],[-261.37,-4171.03],[-256.14,-4170.97]]],"h":4,"tier":"reported"},{"id":"osm:way:1562299335","rings":[[[-307.65,-4171.34],[-307.58,-4178.06],[-313.12,-4178.11],[-313.2,-4171.41]]],"h":4,"tier":"reported"}]} as VBuilding;
// Flat ground at 276.2 m NAVD88 (the lidar ground ring).
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: -1000, maxX: 0, minZ: -5000, maxZ: -4000 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2762).buffer,
);
const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

it('sets the slab and raised spine at their lidar heights', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  const result = create201Seventeenth([other, site], site, grid)!;
  expect(site.id).toBe(seventeenth201Id);
  expect(result.buildings).toEqual([other]);
  result.group.updateMatrixWorld(true);
  const top = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 250, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
  expect(top(-284, -4200)).toBeCloseTo(276.2 + 72.6, 1); // slab
  expect(top(-284, -4187)).toBeCloseTo(276.2 + 77.1, 1); // central spine
});

it('lights a few offices and stays inside the routine budget', () => {
  const result = create201Seventeenth([site], site, grid)!;
  expect(result.group.children).toHaveLength(2);
  expect(triangles(result.group)).toBeLessThan(1000);
  result.setNight(1);
  const lamps = result.group.children[1] as Mesh<BufferGeometry, MeshLambertMaterial>;
  expect(lamps.material.emissiveIntensity).toBeCloseTo(0.6);
  expect(lamps.geometry.attributes.position.count / 6).toBeGreaterThan(5);
});
