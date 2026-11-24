import { Material, Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createMarriottSuites, marriottSuitesId } from './marriott-suites';

// The mapped hotel and its parts, as staged for the midtown-upper area.
const site = {"id": "osm:way:269843461", "cls": "hotel", "floors": 19, "h": null, "rings": [[[502.94, -3574.71], [497.7, -3574.74], [497.81, -3599.47], [497.87, -3611.43], [497.9, -3616.54], [484.06, -3616.61], [484.06, -3617.23], [482.37, -3617.23], [482.39, -3622.71], [482.42, -3628.18], [469.22, -3628.25], [469.19, -3622.74], [469.16, -3617.3], [467.24, -3617.31], [467.24, -3616.61], [456.64, -3616.66], [456.62, -3611.92], [453.44, -3611.93], [453.4, -3605.11], [456.59, -3605.1], [456.56, -3599.97], [456.53, -3593.71], [456.48, -3580.75], [466.58, -3580.7], [482.5, -3580.63], [482.38, -3556.17], [502.85, -3556.09]]], "name": "Atlanta Marriott Suites Midtown", "parts": [{"id": "osm:way:885777448", "rings": [[[466.58, -3580.7], [482.5, -3580.63], [483.99, -3580.62], [484.07, -3599.54], [497.81, -3599.47], [497.87, -3611.43], [497.9, -3616.54], [484.06, -3616.61], [484.06, -3617.23], [482.37, -3617.23], [475.77, -3617.26], [469.16, -3617.3], [467.24, -3617.31], [467.24, -3616.61], [456.64, -3616.66], [456.62, -3611.92], [453.44, -3611.93], [453.4, -3605.11], [456.59, -3605.1], [456.56, -3599.97], [466.67, -3599.93]]], "h": 68.4, "tier": "inferred"}, {"id": "osm:way:885777451", "rings": [[[482.38, -3556.17], [502.85, -3556.09], [502.94, -3574.71], [497.7, -3574.74], [497.81, -3599.47], [484.07, -3599.54], [483.99, -3580.62], [482.5, -3580.63]]], "h": 7.2, "tier": "inferred"}, {"id": "osm:way:885777455", "rings": [[[456.53, -3593.71], [456.48, -3580.75], [466.58, -3580.7], [466.67, -3599.93], [456.56, -3599.97]]], "h": 7.2, "tier": "inferred"}, {"id": "osm:way:885777450", "rings": [[[482.42, -3628.18], [469.22, -3628.25], [469.19, -3622.74], [469.16, -3617.3], [475.77, -3617.26], [482.37, -3617.23], [482.39, -3622.71]]], "h": 3.6, "tier": "inferred"}]} as VBuilding;

const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: 200, maxX: 800, minZ: -3900, maxZ: -3300 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2850).buffer,
);

it('raises the hotel tower to its lidar roof over its low wings, leanly', () => {
  const other: VBuilding = { id: 'other', h: 10, floors: null, rings: [[[0, 0], [1, 0], [1, 1]]] };
  expect(site.id).toBe(marriottSuitesId);
  expect(createMarriottSuites([other], site, grid)).toBeNull();
  const result = createMarriottSuites([site, other], site, grid)!;
  expect(result.buildings).toEqual([other]);
  for (const m of result.group.children as Mesh[])
    expect((m.material as Material).onBeforeCompile).toBe(Material.prototype.onBeforeCompile);
  result.group.updateMatrixWorld(true);
  const roof = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 500, z), new Vector3(0, -1, 0)).intersectObject(result.group)[0]?.point.y + 300;
  const floor = 285;
  expect(roof(476, -3606)).toBeCloseTo(floor + 59, 1); // rooftop plant
  expect(roof(495, -3614)).toBeCloseTo(floor + 56.4, 1); // tower roof
  expect(roof(495, -3565)).toBeCloseTo(floor + 13.1, 1); // north wing
  let triangles = 0;
  result.group.traverse(o => { if ('geometry' in o) triangles += (o as { geometry: { attributes: { position: { count: number } } } }).geometry.attributes.position.count / 3; });
  expect(triangles).toBeLessThan(3000);
});
