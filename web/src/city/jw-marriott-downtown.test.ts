import { BufferGeometry, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { createJwMarriott, jwMarriottId } from './jw-marriott-downtown';

// The staged downtown footprint of the whole block.
const site = {"id":"30de017f-b8eb-4692-9674-b9db13a90288","h":109.7,"floors":28,"rings":[[[231.75,-1275.53],[209.11,-1275.83],[172.72,-1276.31],[172.68,-1273.15],[171.55,-1273.17],[171.05,-1235.43],[178.37,-1235.34],[200.29,-1235.05],[205.42,-1234.99],[205.44,-1237.1],[208.6,-1237.06],[208.57,-1234.94],[208.48,-1228.49],[201.08,-1228.59],[201.03,-1224.48],[200.97,-1220.18],[208.37,-1220.08],[208.26,-1211.33],[208.2,-1207.62],[230.97,-1207.32],[231.19,-1224.14],[232.86,-1224.11],[232.91,-1228.15],[231.21,-1228.17],[231.28,-1232.66],[232.96,-1232.64],[233.01,-1236.56],[231.29,-1236.58],[231.47,-1249.68],[233.17,-1249.65],[233.23,-1253.64],[231.49,-1253.66],[231.55,-1258.34],[233.28,-1258.32],[233.34,-1262.33],[231.57,-1262.35],[231.69,-1270.89]]],"parts":[{"id":"overture:e2fff5c3-e886-3479-8fa1-ba44b4ff6b72","rings":[[[212.67,-1256.37],[229.29,-1256.29],[229.36,-1273.24],[212.75,-1273.32]]],"h":109.7,"tier":"inferred"},{"id":"overture:b3f079eb-af5f-34e4-84bc-e6029587a8b8","rings":[[[208.57,-1234.94],[208.48,-1228.49],[208.37,-1220.08],[208.26,-1211.33],[208.2,-1207.62],[230.97,-1207.32],[231.19,-1224.14],[232.86,-1224.11],[232.91,-1228.15],[231.21,-1228.17],[231.28,-1232.66],[232.96,-1232.64],[233.01,-1236.56],[231.29,-1236.58],[231.47,-1249.68],[233.17,-1249.65],[233.23,-1253.64],[231.49,-1253.66],[231.55,-1258.34],[233.28,-1258.32],[233.34,-1262.33],[231.57,-1262.35],[231.69,-1270.89],[231.75,-1275.53],[209.11,-1275.83],[208.6,-1237.06]],[[212.75,-1273.32],[229.36,-1273.24],[229.29,-1256.29],[212.67,-1256.37]]],"h":102.4,"tier":"inferred"},{"id":"overture:071358c8-92fc-35f9-b03f-68745ee71c44","rings":[[[207.3,-1260.54],[207.21,-1273.53],[185.51,-1273.38],[185.6,-1260.4],[187.38,-1260.41]]],"h":18.3,"tier":"inferred"},{"id":"overture:1047d8c4-f632-3557-b5f8-6b2831a214a9","rings":[[[187.5,-1242.4],[208.14,-1242.54],[208.02,-1260.54],[207.3,-1260.54],[187.38,-1260.41]]],"h":18.3,"tier":"inferred"},{"id":"overture:e569c9b1-2752-3d7d-8d5f-34490158cf2a","rings":[[[182.58,-1240.69],[182.57,-1237.11],[190.16,-1237.08],[190.18,-1240.66]]],"h":18.3,"tier":"inferred"},{"id":"overture:f2b968f6-518c-32ff-b9e8-67f4f4e1dd4f","rings":[[[176.88,-1247.05],[176.85,-1241.89],[183.18,-1241.85],[183.22,-1247.01]]],"h":18.3,"tier":"inferred"},{"id":"overture:58b20517-3558-36f2-9dec-bdf0fab0bc42","rings":[[[172.68,-1273.15],[171.55,-1273.17],[171.05,-1235.43],[178.37,-1235.34],[200.29,-1235.05],[205.42,-1234.99],[205.44,-1237.1],[208.6,-1237.06],[209.11,-1275.83],[172.72,-1276.31]],[[207.21,-1273.53],[207.3,-1260.54],[208.02,-1260.54],[208.14,-1242.54],[187.5,-1242.4],[187.38,-1260.41],[185.6,-1260.4],[185.51,-1273.38]],[[176.85,-1241.89],[176.88,-1247.05],[183.22,-1247.01],[183.18,-1241.85]],[[190.16,-1237.08],[182.57,-1237.11],[182.58,-1240.69],[190.18,-1240.66]]],"h":14.6,"tier":"inferred"},{"id":"overture:604fa32f-6817-3688-b6a8-6de417adc102","rings":[[[200.97,-1220.18],[208.37,-1220.08],[208.48,-1228.49],[201.08,-1228.59],[201.03,-1224.48]]],"h":3.7,"tier":"inferred"}]} as VBuilding;
// Flat ground at 301.5 m NAVD88 (the lidar ground ring).
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -2000, maxZ: -1000 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(3015).buffer,
);
const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

it('sets the slab deck, south block and podium at their lidar heights', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  const result = createJwMarriott([other, site], grid)!;
  expect(site.id).toBe(jwMarriottId);
  expect(result.buildings).toEqual([other]);
  result.group.updateMatrixWorld(true);
  const top = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 250, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
  expect(top(220, -1230)).toBeCloseTo(301.5 + 98, 1); // roof deck inside the parapet
  expect(top(220, -1265)).toBeCloseTo(301.5 + 106, 1); // taller south block
  expect(top(190, -1250)).toBeCloseTo(301.5 + 22, 1); // podium
});

it('lights hotel and condominium rooms and stays inside the landmark budget', () => {
  const result = createJwMarriott([site], grid)!;
  expect(result.group.children).toHaveLength(2);
  expect(triangles(result.group)).toBeLessThan(2000);
  result.setNight(1);
  const lamps = result.group.children[1] as Mesh<BufferGeometry, MeshLambertMaterial>;
  expect(lamps.material.emissiveIntensity).toBeCloseTo(0.62);
  expect(lamps.geometry.attributes.position.count / 6).toBeGreaterThan(60);
});
