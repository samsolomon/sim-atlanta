import { Material, Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createHanoverHouse, hanoverHouseId } from './hanover-house';

// The mapped slab, as staged for the midtown-upper area.
const site = {"id": "osm:way:536740358", "cls": "apartments", "floors": 14, "h": 62, "rings": [[[921.77, -3733.11], [930, -3741.28], [901.09, -3770.58], [898.86, -3768.37], [897.3, -3769.95], [894.09, -3766.78], [890.76, -3770.17], [891.85, -3771.25], [890.84, -3772.26], [883.34, -3764.93], [880.66, -3762.09], [880.42, -3760.54], [880.78, -3759.45], [882.07, -3758.99], [883.75, -3759.59], [886.8, -3756.49], [883.46, -3753.25], [881.48, -3751.29], [910.57, -3722], [912.57, -3723.98]]], "name": "Hanover House", "parts": [{"id": "osm:way:1414724124", "rings": [[[881.48, -3751.29], [910.57, -3722], [912.57, -3723.98], [883.46, -3753.25]]], "h": 8.9, "tier": "inferred"}, {"id": "podium", "rings": [[[930, -3741.28], [901.09, -3770.58], [898.86, -3768.37], [897.3, -3769.95], [894.09, -3766.78], [890.76, -3770.17], [891.85, -3771.25], [890.84, -3772.26], [883.34, -3764.93], [880.66, -3762.09], [880.42, -3760.54], [880.78, -3759.45], [882.07, -3758.99], [883.75, -3759.59], [886.8, -3756.49], [883.46, -3753.25], [912.57, -3723.98], [921.77, -3733.11]]], "h": 62, "tier": "reported"}]} as VBuilding;

const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: 600, maxX: 1200, minZ: -4000, maxZ: -3400 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2900).buffer,
);

it('raises the concrete slab to its lidar roof with plant above, leanly', () => {
  const other: VBuilding = { id: 'other', h: 10, floors: null, rings: [[[0, 0], [1, 0], [1, 1]]] };
  expect(site.id).toBe(hanoverHouseId);
  expect(createHanoverHouse([other], site, grid)).toBeNull();
  const result = createHanoverHouse([site, other], site, grid)!;
  expect(result.buildings).toEqual([other]);
  for (const m of result.group.children as Mesh[])
    expect((m.material as Material).onBeforeCompile).toBe(Material.prototype.onBeforeCompile);
  result.group.updateMatrixWorld(true);
  const roof = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 500, z), new Vector3(0, -1, 0)).intersectObject(result.group)[0]?.point.y + 300;
  const floor = 290;
  expect(roof(906.5, -3747.3)).toBeCloseTo(floor + 55.8, 1); // plant
  expect(roof(925, -3740)).toBeCloseTo(floor + 53.1, 1); // roof outside the plant
  let triangles = 0;
  result.group.traverse(o => { if ('geometry' in o) triangles += (o as { geometry: { attributes: { position: { count: number } } } }).geometry.attributes.position.count / 3; });
  expect(triangles).toBeLessThan(1200);
});
