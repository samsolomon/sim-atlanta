import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createMidtownUnion, midtownUnionId } from './midtown-union';

// The mapped office building and its parts, as staged for the brookwood-south area.
const site = {"id": "osm:way:1297223465", "cls": "office", "floors": 26, "h": null, "rings": [[[234.3, -4166.79], [234.68, -4166.69], [234.35, -4165.43], [235.5, -4165.13], [234.78, -4162.71], [231.03, -4163.83], [227.54, -4153.09], [260.43, -4144.24], [260.81, -4145.56], [263.9, -4144.01], [268.24, -4143.97], [268.22, -4142.05], [301.94, -4142.24], [308.24, -4142.29], [338.03, -4142.47], [338.27, -4167.75], [334.65, -4173.9], [330.81, -4180.43], [309.64, -4180.47], [302.07, -4180.48], [273.53, -4180.51], [273.13, -4178.42], [269.52, -4179.43], [270.05, -4181.4], [240.33, -4189.34]]], "name": "Midtown Union Office Building", "parts": [{"id": "osm:way:1433501523", "rings": [[[263.68, -4157.61], [269.52, -4179.43], [270.05, -4181.4], [240.33, -4189.34], [234.3, -4166.79], [234.68, -4166.69], [234.35, -4165.43], [235.5, -4165.13]]], "h": 97.2, "tier": "inferred"}, {"id": "osm:way:1453246988", "rings": [[[268.22, -4142.05], [301.94, -4142.24], [308.24, -4142.29], [308.58, -4157.51], [296.88, -4157.64], [271.26, -4157.65], [268.25, -4157.66], [268.24, -4143.97]]], "h": 97.2, "tier": "inferred"}, {"id": "osm:way:1453246989", "rings": [[[271.26, -4157.65], [271.27, -4170.35], [296.89, -4170.34], [296.88, -4157.64], [308.58, -4157.51], [308.65, -4160.2], [309.7, -4160.2], [309.64, -4180.47], [302.07, -4180.48], [273.53, -4180.51], [273.13, -4178.42], [269.52, -4179.43], [263.68, -4157.61], [235.5, -4165.13], [234.78, -4162.71], [233.74, -4159.23], [260.81, -4145.56], [263.9, -4144.01], [268.24, -4143.97], [268.25, -4157.66]]], "h": 93.6, "tier": "inferred"}, {"id": "osm:way:1453246990", "rings": [[[296.88, -4157.64], [296.89, -4170.34], [271.27, -4170.35], [271.26, -4157.65]]], "h": 93.6, "tier": "inferred"}, {"id": "osm:way:1433501524", "rings": [[[260.43, -4144.24], [260.81, -4145.56], [233.74, -4159.23], [234.78, -4162.71], [231.03, -4163.83], [227.54, -4153.09]]], "h": 90, "tier": "inferred"}, {"id": "osm:way:1433501525", "rings": [[[308.65, -4160.2], [308.58, -4157.51], [308.24, -4142.29], [338.03, -4142.47], [338.27, -4167.75], [334.65, -4173.9], [330.81, -4180.43], [309.64, -4180.47], [309.7, -4160.2]]], "h": 28.8, "tier": "inferred"}]} as VBuilding;

const flat = (navd88: number) => new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: 0, maxX: 600, minZ: -4500, maxZ: -3900 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(navd88 * 10).buffer,
);

it('stands the glass shaft on the mapped parts over the 17th Street garage', () => {
  const other: VBuilding = { id: 'other', h: 10, floors: null, rings: [[[0, 0], [1, 0], [1, 1]]] };
  const grid = flat(270);
  expect(site.id).toBe(midtownUnionId);
  expect(createMidtownUnion([other], site, grid)).toBeNull();
  expect(createMidtownUnion([site, other], { ...site, parts: site.parts!.slice(1) }, grid)).toBeNull();
  const result = createMidtownUnion([site, other], site, grid)!;
  expect(result.buildings).toEqual([other]);
  result.group.updateMatrixWorld(true);
  const roof = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 500, z), new Vector3(0, -1, 0)).intersectObject(result.group)[0]?.point.y + 300;
  // Floor is the lowest grade less 0.35 m plus 0.35 m: 270 m NAVD88.
  expect(roof(255, -4178)).toBeCloseTo(270 + 99.6, 1); // the prow, under its roof screen
  expect(roof(288, -4150)).toBeCloseTo(270 + 97.2, 1); // the Arts Center Way wing
  expect(roof(300, -4176)).toBeCloseTo(270 + 93.6, 1); // the middle mass over the garage
  expect(roof(330, -4160)).toBeCloseTo(270 + 28.8 + 0.4, 1); // the garage's planted roof
  // Within the routine skin's budget order: a few hundred quads, no per-pane grid.
  let triangles = 0;
  result.group.traverse(o => { if ('geometry' in o) triangles += (o as { geometry: { attributes: { position: { count: number } } } }).geometry.attributes.position.count / 3; });
  expect(triangles).toBeLessThan(1600);
});
