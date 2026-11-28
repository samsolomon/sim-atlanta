import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { Mesh, Raycaster, Vector3, type BufferGeometry } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { cityHeightsId, createCityHeights } from './city-heights';
import { detachedParts } from './skin-kit';

const buildings: VBuilding[] = JSON.parse(readFileSync(new URL(
  '../../../pipeline/prototypes/square-board/north-corner/context.json', import.meta.url), 'utf8')).buildings;

/** Flat ground at 304.6 m NAVD88 on Ralph McGill Boulevard. */
const grid = new GroundGrid({
  version: 1, rows: 2, cols: 2, stepM: 400,
  bounds: { minX: 1200, maxX: 1600, minZ: -1300, maxZ: -900 },
  encoding: 'signed int16 little-endian',
  vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
  scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
}, new Int16Array(4).fill(3046).buffer);

it('replaces City Heights at the lidar roof, not the mapped 78.4 m, within the landmark budget', () => {
  const site = buildings.find(b => b.id === cityHeightsId)!;
  const model = createCityHeights(buildings, site, grid)!;
  expect(model.buildings).toHaveLength(buildings.length - 1);
  const triangles = model.group.children
    .map(child => ((child as Mesh).geometry as BufferGeometry).getAttribute('position').count / 3)
    .reduce((a, b) => a + b, 0);
  expect(triangles).toBeLessThanOrEqual(2400);
  model.group.updateMatrixWorld(true);
  const roof = (x: number, z: number) => {
    const hit = new Raycaster(new Vector3(x, 400, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0];
    return hit ? hit.point.y + 300 : null;
  };
  expect(roof(1453, -1089)).toBeCloseTo(365.7, 0); // penthouse
  expect(roof(1446, -1084)).toBeCloseTo(362, 0); // crown parapet, inside the roof edge
  expect(detachedParts(model.group, site.rings)).toEqual([]);
});
