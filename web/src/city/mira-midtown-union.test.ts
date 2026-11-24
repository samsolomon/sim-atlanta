import { Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { createMira, miraId } from './mira-midtown-union';

// The staged fragments of osm:way:1297223462, split at z = -4100 between the two tiles.
const upper = {"id":"osm:way:1297223462","cls":"apartments","floors":18,"h":null,"rings":[[[279.15,-4098.05],[279.16,-4100],[223.18,-4100],[222.88,-4042.4],[226.97,-4042.37],[226.94,-4037.42],[223.88,-4037.44],[223.86,-4034.48],[225.31,-4034.47],[225.22,-4015.92],[247.21,-4015.8],[247.21,-4017.3],[251.25,-4017.28],[260.75,-4017.22],[260.74,-4016.17],[278.72,-4016.08],[279.12,-4092.98]]],"name":"Mira at Midtown Union","parts":[{"id":"osm:way:1453246987","rings":[[[226.51,-4085.05],[224.7,-4085.06],[224.51,-4047.22],[227,-4047.21],[226.97,-4042.37],[226.94,-4037.42],[223.88,-4037.44],[223.86,-4034.48],[225.31,-4034.47],[225.22,-4015.92],[247.21,-4015.8],[247.21,-4017.3],[251.25,-4017.28],[260.75,-4017.22],[260.85,-4037.06],[247.36,-4037.13],[247.38,-4040.62],[245.93,-4040.63],[246.23,-4098.22],[236.17,-4098.27],[236.17,-4099],[226.58,-4099.05]]],"h":64.8,"tier":"inferred"},{"id":"osm:way:1433501530","rings":[[[223.18,-4100],[222.88,-4042.4],[226.97,-4042.37],[227,-4047.21],[224.51,-4047.22],[224.7,-4085.06],[226.51,-4085.05],[226.58,-4099.05],[236.17,-4099],[236.17,-4098.27],[246.23,-4098.22],[279.15,-4098.05],[279.16,-4100]]],"h":32.4,"tier":"inferred"},{"id":"osm:way:1297223463","rings":[[[247.38,-4040.62],[247.36,-4037.13],[260.85,-4037.06],[260.75,-4017.22],[260.74,-4016.17],[278.72,-4016.08],[279.12,-4092.98],[279.15,-4098.05],[246.23,-4098.22],[245.93,-4040.63]]],"h":28.8,"tier":"inferred"}]} as VBuilding;
const lower = {"id":"osm:way:1297223462","cls":"apartments","floors":18,"h":null,"rings":[[[279.22,-4112.54],[265.17,-4112.61],[232.18,-4112.77],[232.17,-4111.77],[226.99,-4111.79],[226.98,-4109.43],[226.96,-4106.61],[223.21,-4106.63],[223.18,-4100],[279.16,-4100]]],"name":"Mira at Midtown Union","parts":[{"id":"osm:way:1433501530","rings":[[[265.17,-4112.61],[232.18,-4112.77],[232.17,-4111.77],[226.99,-4111.79],[226.98,-4109.43],[226.96,-4106.61],[223.21,-4106.63],[223.18,-4100],[279.16,-4100],[279.22,-4112.54]]],"h":32.4,"tier":"inferred"}]} as VBuilding;
// Flat ground at 292 m NAVD88 with the Midtown scene zero.
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -5000, maxZ: -4000 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2920).buffer,
);

const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

function top(group: Mesh['parent'], x: number, z: number) {
  group!.updateMatrixWorld(true);
  const hit = new Raycaster(new Vector3(x, 250, z), new Vector3(0, -1, 0)).intersectObject(group!, true)[0];
  return hit.point.y + 300;
}

it('raises the inferred 26-storey tower over the garage podium', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  const result = createMira([other, upper], upper, grid)!;
  expect(upper.id).toBe(miraId);
  expect(result.buildings).toEqual([other]);
  // Inferred: 17 floors of 3.05 m and a 1.5 m parapet over the 28.8 m garage (OSM's 18 levels conflict).
  expect(top(result.group, 236, -4060)).toBeCloseTo(374.15, 1); // the L-plan slab, south arm
  expect(top(result.group, 250, -4025)).toBeCloseTo(374.15, 1); // the slab's north arm
  expect(top(result.group, 265, -4060)).toBeCloseTo(320.8, 1); // the garage roof east of the slab
});

it('stays inside the landmark budget on both tiles', () => {
  const a = createMira([upper], upper, grid)!;
  const b = createMira([lower], lower, grid)!;
  expect(a.group.children).toHaveLength(2); // body plus lit flats
  expect(b.group.children).toHaveLength(1); // the podium strip has no lit windows
  expect(top(b.group, 250, -4106)).toBeCloseTo(320.8, 1);
  expect(triangles(a.group) + triangles(b.group)).toBeLessThan(1400);
});
