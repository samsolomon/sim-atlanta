import { Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { createTheMitchell, theMitchellId } from './the-mitchell';
import { detachedParts } from './skin-kit';

const ring: [number, number][] = [[-567.4, -57.0], [-616.7, -57.0], [-616.7, -0.6], [-572.1, 22.0], [-572.0, -37.2], [-567.4, -37.2]];
const site: VBuilding = { id: theMitchellId, h: 62.7, floors: 19, rings: [ring] };
// Flat ground at 316 m NAVD88.
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: -1000, maxX: 0, minZ: -500, maxZ: 500 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3160).buffer,
);

const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

it('raises the slab to the reported 19 storeys over its podium', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  expect(createTheMitchell([other], grid)).toBeNull();
  for (const tier of ['low', 'high'] as const) {
    const result = createTheMitchell([other, site], grid, tier)!;
    expect(result.buildings).toEqual([other]);
    result.group.updateMatrixWorld(true);
    const top = (x: number, z: number) =>
      new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
    expect(top(-605, -30)).toBeCloseTo(316 + 62.7, 0); // tower
    expect(top(-575, -45)).toBeCloseTo(316 + 10, 0); // podium
    expect(detachedParts(result.group, [ring])).toEqual([]);
  }
  expect(triangles(createTheMitchell([site], grid, 'low')!.group)).toBeLessThan(600);
});
