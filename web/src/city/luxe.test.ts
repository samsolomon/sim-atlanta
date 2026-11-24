import { Material, Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createLuxe, luxeId } from './luxe';

// The mapped tower lot, as staged for the midtown-upper area.
const site = {"id": "osm:way:269843447", "cls": "apartments", "floors": 22, "h": null, "rings": [[[1111.4, -3428.9], [1111.48, -3434.19], [1034.33, -3435.42], [1033.7, -3394.66], [1101.91, -3393.58], [1102.05, -3402.08], [1106.58, -3402.01], [1112.62, -3401.91], [1116.5, -3401.86], [1116.91, -3428.81]]], "name": "Luxe", "parts": [{"id": "osm:way:536776077", "rings": [[[1081.22, -3427.81], [1077.96, -3427.81], [1078.02, -3429.96], [1067.09, -3430.11], [1067.07, -3428.23], [1064.08, -3428.3], [1064.15, -3430.2], [1049.4, -3430.45], [1049.29, -3420.63], [1053.03, -3420.53], [1052.81, -3411.93], [1049.35, -3411.98], [1049.04, -3401.97], [1063.3, -3401.87], [1063.29, -3403.75], [1065.97, -3403.74], [1066.04, -3401.85], [1077.47, -3401.48], [1077.47, -3403.69], [1080.78, -3403.63], [1080.78, -3401.48], [1088.27, -3401.3], [1088.45, -3400.59], [1088.99, -3399.99], [1089.65, -3399.57], [1090.48, -3399.47], [1091.31, -3399.48], [1092.03, -3399.72], [1092.69, -3399.99], [1093.05, -3400.59], [1093.47, -3401.34], [1093.46, -3401.98], [1093.31, -3402.78], [1093.18, -3403.34], [1095.78, -3409.75], [1096.18, -3421.24], [1095.12, -3424.7], [1094.58, -3424.78], [1094.51, -3429.58], [1081.23, -3429.86]]], "h": 76.2, "tier": "reported"}, {"id": "podium", "rings": [[[1111.48, -3434.19], [1034.33, -3435.42], [1033.7, -3394.66], [1101.91, -3393.58], [1102.05, -3402.08], [1106.58, -3402.01], [1112.62, -3401.91], [1116.5, -3401.86], [1116.91, -3428.81], [1111.4, -3428.9]], [[1081.23, -3429.86], [1094.51, -3429.58], [1094.58, -3424.78], [1095.12, -3424.7], [1096.18, -3421.24], [1095.78, -3409.75], [1093.18, -3403.34], [1093.31, -3402.78], [1093.46, -3401.98], [1093.47, -3401.34], [1093.05, -3400.59], [1092.69, -3399.99], [1092.03, -3399.72], [1091.31, -3399.48], [1090.48, -3399.47], [1089.65, -3399.57], [1088.99, -3399.99], [1088.45, -3400.59], [1088.27, -3401.3], [1080.78, -3401.48], [1080.78, -3403.63], [1077.47, -3403.69], [1077.47, -3401.48], [1066.04, -3401.85], [1065.97, -3403.74], [1063.29, -3403.75], [1063.3, -3401.87], [1049.04, -3401.97], [1049.35, -3411.98], [1052.81, -3411.93], [1053.03, -3420.53], [1049.29, -3420.63], [1049.4, -3430.45], [1064.15, -3430.2], [1064.08, -3428.3], [1067.07, -3428.23], [1067.09, -3430.11], [1078.02, -3429.96], [1077.96, -3427.81], [1081.22, -3427.81]]], "h": 76.2, "tier": "inferred"}]} as VBuilding;

const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: 800, maxX: 1400, minZ: -3800, maxZ: -3200 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2800).buffer,
);

it('stands the tower and its glass drum at the lidar roof over the pool-deck podium, leanly', () => {
  const other: VBuilding = { id: 'other', h: 10, floors: null, rings: [[[0, 0], [1, 0], [1, 1]]] };
  expect(site.id).toBe(luxeId);
  expect(createLuxe([other], site, grid)).toBeNull();
  const result = createLuxe([site, other], site, grid)!;
  expect(result.buildings).toEqual([other]);
  for (const m of result.group.children as Mesh[])
    expect((m.material as Material).onBeforeCompile).toBe(Material.prototype.onBeforeCompile);
  result.group.updateMatrixWorld(true);
  const roof = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 500, z), new Vector3(0, -1, 0)).intersectObject(result.group)[0]?.point.y + 300;
  const floor = 280;
  expect(roof(1052, -3428)).toBeCloseTo(floor + 67, 1); // tower roof
  expect(roof(1070, -3415)).toBeCloseTo(floor + 71, 1); // rooftop plant
  expect(roof(1100, -3430)).toBeCloseTo(floor + 13.5, 1); // podium deck, west of the pool
  let triangles = 0;
  result.group.traverse(o => { if ('geometry' in o) triangles += (o as { geometry: { attributes: { position: { count: number } } } }).geometry.attributes.position.count / 3; });
  // Lean on both tiers: high-tier geometry headroom is about 2 MB.
  expect(triangles).toBeLessThan(2400);
});
