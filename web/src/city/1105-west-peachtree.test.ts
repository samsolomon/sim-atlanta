import { BufferGeometry, Box3, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { create1105WestPeachtree, westPeachtree1105Id } from './1105-west-peachtree';

// The staged midtown-upper footprint of the whole block.
const site = {"id":"osm:way:1001565075","h":124.9,"floors":5,"rings":[[[371.47,-3526.24],[371.5,-3518.43],[370.8,-3518.43],[367.84,-3518.42],[363.24,-3518.41],[361.88,-3518.41],[361.92,-3505.6],[367.89,-3505.63],[370.85,-3505.64],[377.58,-3505.65],[377.59,-3503.46],[377.61,-3496.51],[387.85,-3496.54],[397.51,-3496.56],[397.54,-3487.7],[397.57,-3478.65],[397.57,-3477.62],[396.18,-3477.62],[396.18,-3476.33],[390.14,-3476.3],[390.13,-3477.64],[388.62,-3477.63],[388.62,-3478.83],[379.05,-3478.79],[368.96,-3478.76],[368.97,-3477.54],[367.35,-3477.53],[367.35,-3475.77],[367.36,-3473.57],[362.77,-3473.55],[362.91,-3429.15],[367.44,-3429.17],[367.46,-3424.6],[390.08,-3424.66],[390.07,-3426.73],[395.96,-3426.74],[395.97,-3424.49],[409.76,-3424.53],[409.75,-3429.21],[414.11,-3429.22],[414.1,-3431.72],[417.44,-3431.74],[417.45,-3427.92],[427.86,-3427.96],[433.98,-3427.98],[434.01,-3420.78],[477.69,-3420.92],[477.67,-3428.11],[477.58,-3455.19],[477.56,-3463.65],[477.46,-3491.28],[477.43,-3504.32],[477.34,-3528.39],[455.26,-3528.32],[442.28,-3528.28],[371.46,-3528.05]]],"parts":[{"id":"osm:way:1427404721","rings":[[[397.57,-3477.62],[396.18,-3477.62],[396.18,-3476.33],[390.14,-3476.3],[390.13,-3477.64],[388.62,-3477.63],[388.62,-3478.83],[379.05,-3478.79],[368.96,-3478.76],[368.97,-3477.54],[367.35,-3477.53],[367.35,-3475.77],[367.36,-3473.57],[362.77,-3473.55],[362.91,-3429.15],[367.44,-3429.17],[367.46,-3424.6],[390.08,-3424.66],[390.07,-3426.73],[395.96,-3426.74],[395.97,-3424.49],[409.76,-3424.53],[409.75,-3429.21],[414.11,-3429.22],[414.1,-3431.72],[413.97,-3473.53],[410.08,-3473.52],[410.06,-3477.65],[408.57,-3477.65],[408.56,-3478.68],[397.57,-3478.65]]],"h":128.9,"tier":"reported"},{"id":"osm:way:1427404726","rings":[[[455.12,-3428.04],[477.67,-3428.11],[477.58,-3455.19],[477.56,-3463.65],[477.46,-3491.28],[454.92,-3491.21]]],"h":52.8,"tier":"inferred"},{"id":"osm:way:1427404722","rings":[[[370.85,-3505.64],[377.58,-3505.65],[387.88,-3505.68],[397.48,-3505.71],[455.33,-3505.9],[455.26,-3528.32],[442.28,-3528.28],[371.46,-3528.05],[371.47,-3526.24],[371.5,-3518.43],[370.8,-3518.43]]],"h":49.5,"tier":"inferred"},{"id":"osm:way:1427404688","rings":[[[447.91,-3487.61],[447.82,-3499.98],[440.92,-3499.93],[440.99,-3487.57]]],"h":19.8,"tier":"inferred"},{"id":"osm:way:1427404689","rings":[[[426.15,-3475.75],[426.19,-3470.94],[440.46,-3471.05],[442.8,-3469.13],[447.72,-3474.92],[447.68,-3481.17],[426.2,-3481.01],[426.21,-3480.29],[421.25,-3480.26],[421.29,-3475.7]]],"h":19.8,"tier":"inferred"},{"id":"osm:way:1464967900","rings":[[[454.92,-3491.21],[477.46,-3491.28],[477.43,-3504.32],[477.34,-3528.39],[455.26,-3528.32],[455.33,-3505.9],[397.48,-3505.71],[397.51,-3496.56],[397.54,-3487.7],[397.57,-3478.65],[408.56,-3478.68],[408.57,-3477.65],[410.06,-3477.65],[410.08,-3473.52],[413.97,-3473.53],[414.1,-3431.72],[417.44,-3431.74],[417.45,-3427.92],[427.86,-3427.96],[433.98,-3427.98],[455.12,-3428.04]],[[447.82,-3499.98],[447.91,-3487.61],[440.99,-3487.57],[440.92,-3499.93]],[[426.19,-3470.94],[426.15,-3475.75],[421.29,-3475.7],[421.25,-3480.26],[426.21,-3480.29],[426.2,-3481.01],[447.68,-3481.17],[447.72,-3474.92],[442.8,-3469.13],[440.46,-3471.05]]],"h":16.5,"tier":"inferred"},{"id":"osm:way:1427404725","rings":[[[377.61,-3496.51],[387.85,-3496.54],[397.51,-3496.56],[397.48,-3505.71],[387.88,-3505.68],[377.58,-3505.65],[377.59,-3503.46]]],"h":8,"tier":"illustrative"},{"id":"osm:way:1427404723","rings":[[[370.85,-3505.64],[370.8,-3518.43],[367.84,-3518.42],[367.89,-3505.63]]],"h":6.6,"tier":"inferred"},{"id":"osm:way:1427404718","rings":[[[477.69,-3420.92],[477.67,-3428.11],[455.12,-3428.04],[433.98,-3427.98],[434.01,-3420.78]]],"h":3.3,"tier":"inferred"},{"id":"osm:way:1427404724","rings":[[[361.88,-3518.41],[361.92,-3505.6],[367.89,-3505.63],[367.84,-3518.42],[363.24,-3518.41]]],"h":3.3,"tier":"inferred"}]} as VBuilding;
// Flat ground at 292 m NAVD88 with the scene zero used in Midtown.
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -4000, maxZ: -3000 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2920).buffer,
);
const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

it('sets the office roof, hotel and condominium heights', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  const result = create1105WestPeachtree([other, site], site, grid)!;
  expect(site.id).toBe(westPeachtree1105Id);
  expect(result.buildings).toEqual([other]);
  result.group.updateMatrixWorld(true);
  const top = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 250, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0].point.y + 300;
  expect(top(405, -3440)).toBeCloseTo(292 + 113.1, 1); // office roof inside the screen crown
  expect(top(400, -3517)).toBeCloseTo(292 + 49.5, 1); // Epicurean hotel
  expect(top(466, -3460)).toBeCloseTo(292 + 64, 1); // condominium
  expect(top(440, -3460)).toBeCloseTo(292 + 19.8 + 0.3, 1); // lawn on the podium deck
});

it('stands the blue frame clear of the glass and up to 125 m, inside the landmark budget', () => {
  const result = create1105WestPeachtree([site], site, grid)!;
  expect(result.group.children).toHaveLength(3);
  expect(triangles(result.group)).toBeLessThan(2400);
  const led = result.group.children[2] as Mesh<BufferGeometry, MeshLambertMaterial>;
  result.group.updateMatrixWorld(true);
  const box = new Box3().setFromObject(led);
  expect(box.max.y + 300).toBeCloseTo(292 + 125.5, 0);
  expect(box.max.z).toBeCloseTo(-3424.6 + 1.4, 1); // south frame off the south glass
  expect(box.min.z).toBeCloseTo(-3478.8 - 1.4, 1); // north frame off the north glass
  result.setNight(1);
  expect(led.material.emissiveIntensity).toBeCloseTo(0.7);
  expect(led.material.emissive.getHexString()).toBe('2f5cff');
});
