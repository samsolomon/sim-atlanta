import { BufferGeometry, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { createCrownePlaza, crownePlazaId } from './crowne-plaza-midtown';

// The staged midtown-south footprint of osm:way:234939892.
const site = {"id":"osm:way:234939892","h":98,"floors":4,"rings":[[[365.95,-1828.97],[331.96,-1829.18],[308.03,-1829.34],[263.95,-1829.61],[263.94,-1827.48],[263.9,-1821.53],[263.86,-1815.62],[263.75,-1798.68],[308.04,-1798.4],[313.25,-1798.37],[321.75,-1798.31],[364.57,-1798.05],[370.23,-1798.01],[370.42,-1828.95]]],"parts":[{"id":"osm:way:1456370858","rings":[[[280.95,-1802.94],[313.28,-1802.73],[313.25,-1798.37],[321.75,-1798.31],[321.77,-1802.38],[337.74,-1802.28],[337.89,-1826.58],[281.11,-1826.94]]],"h":98,"tier":"inferred"},{"id":"osm:way:1456370857","rings":[[[263.9,-1821.53],[263.86,-1815.62],[263.75,-1798.68],[308.04,-1798.4],[313.25,-1798.37],[313.28,-1802.73],[280.95,-1802.94],[281.11,-1826.94],[337.89,-1826.58],[337.74,-1802.28],[321.77,-1802.38],[321.75,-1798.31],[364.57,-1798.05],[370.23,-1798.01],[370.42,-1828.95],[365.95,-1828.97],[331.96,-1829.18],[308.03,-1829.34],[263.95,-1829.61],[263.94,-1827.48]]],"h":15.7,"tier":"inferred"}]} as VBuilding;
// Flat ground at 303.2 m NAVD88 (the lidar ground ring).
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -2500, maxZ: -1500 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3032).buffer,
);
const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

it('sets the slab and podium at their lidar heights, not the mapped 98 m', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  const result = createCrownePlaza([other, site], site, grid)!;
  expect(site.id).toBe(crownePlazaId);
  expect(result.buildings).toEqual([other]);
  result.group.updateMatrixWorld(true);
  const top = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 250, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
  expect(top(290, -1815)).toBeCloseTo(303.2 + 81.2, 1); // slab roof
  expect(top(355, -1815)).toBeCloseTo(303.2 + 17.1, 1); // podium
});

it('lights about three hotel rooms in ten inside the routine budget', () => {
  const result = createCrownePlaza([site], site, grid)!;
  expect(result.group.children).toHaveLength(2);
  expect(triangles(result.group)).toBeLessThan(700);
  result.setNight(1);
  const lamps = result.group.children[1] as Mesh<BufferGeometry, MeshLambertMaterial>;
  expect(lamps.material.emissiveIntensity).toBeCloseTo(0.62);
  expect(lamps.castShadow).toBe(result.group.children[0].castShadow);
});
