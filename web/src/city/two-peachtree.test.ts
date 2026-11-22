import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createTwoPeachtree } from './two-peachtree';

const tower: VBuilding = { id: 'e1dec5e7-426b-4dcc-b118-319a02735c18', h: 169, floors: 44,
  rings: [[[115.01,6.54],[132.73,-19.7],[102.83,-39.2],[84.78,-51.53],[80.03,-54.75],[62.57,-29.01]]] };
const apron: VBuilding = { id: '375da932-0e7e-4297-b010-f39110f1538c', h: 165, floors: null,
  rings: [[[27.49,-13.22],[93.15,30.91],[104.81,23.23],[117.71,8.6],[115.01,6.54],[62.57,-29.01],[45.29,-40.01],[44.73,-39.15]]] };
const grid = new GroundGrid({version: 1, rows: 2, cols: 2, stepM: 200,
  bounds: {minX: 0, maxX: 200, minZ: -100, maxZ: 100}, encoding: 'signed int16 little-endian',
  vertical: {crs: 'EPSG:5703', sceneZeroNavd88M: 323.8}, scaleM: .1, offsetM: 0, noData: -32768, sha256: ''},
new Int16Array(4).fill(3210).buffer);

it('replaces only the surveyed pair and places the roof court, deck and both station-side roofs on their datum', () => {
  const neighbor = {...tower, id: 'separate-building'};
  const { group, buildings } = createTwoPeachtree([apron, neighbor, tower], grid)!;
  expect(buildings).toEqual([neighbor]);
  group.updateMatrixWorld(true);
  const height = (u: number, v: number) => {
    const start = new Vector3(80.03 + .83265749*u - .55378833*v, 250, -54.75 + .55378833*u + .83265749*v);
    const hit = new Raycaster(start, new Vector3(0, -1, 0)).intersectObject(group)[0];
    return hit && hit.point.y + 323.8;
  };
  expect(height(16, 14)).toBeCloseTo(478.6);
  expect(height(37, 16)).toBeCloseTo(483.85);
  expect(height(5, 50)).toBeCloseTo(328.05);
  expect(height(40, 50)).toBeCloseTo(329.9);
  expect(height(-30, 52)).toBeUndefined();
  expect(createTwoPeachtree([tower], grid)).toBeNull();
  expect(createTwoPeachtree([tower, {...apron, rings: tower.rings}], grid)).toBeNull();
});
