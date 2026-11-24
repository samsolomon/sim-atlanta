import { Material, Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createRegistry, registryId } from './registry-on-the-park';

// The mapped tower and podium parts, as staged for the midtown-upper area.
const site = {"id": "osm:way:1442258925", "cls": "apartments", "floors": 5, "h": 98, "rings": [[[1022.65, -3483.71], [1022.11, -3450.86], [1021.69, -3450.22], [1026.75, -3449.32], [1026.77, -3445.42], [1070.86, -3444.37], [1070.97, -3447.87], [1076.33, -3448.84], [1077.08, -3482.05], [1076.49, -3482.64], [1076.59, -3487.26], [1023.12, -3488.65], [1023.18, -3484.68]]], "name": "The Registry on the Park", "parts": [{"id": "osm:way:536885263", "rings": [[[1074.52, -3451.96], [1074.62, -3456.93], [1071.54, -3457], [1071.63, -3461.44], [1072.89, -3461.4], [1073.06, -3469.72], [1071.73, -3469.74], [1071.83, -3474.32], [1074.61, -3474.27], [1074.72, -3478.84], [1077.08, -3482.05], [1062.35, -3485.25], [1062.45, -3479.46], [1059.02, -3479.62], [1059.05, -3482.75], [1040.56, -3483.09], [1040.59, -3480.16], [1037.55, -3480.16], [1037.49, -3485.64], [1022.65, -3483.71], [1024.88, -3479.85], [1024.87, -3475.46], [1027.59, -3475.46], [1027.58, -3470.95], [1026.34, -3470.95], [1026.32, -3462.59], [1027.24, -3462.59], [1027.23, -3458.26], [1024.27, -3458.26], [1024.27, -3454.3], [1022.11, -3450.86], [1021.69, -3450.22], [1026.75, -3449.32], [1036.45, -3447.26], [1037.84, -3447.31], [1037.99, -3454.73], [1045.34, -3457.03], [1052.92, -3456.8], [1061.87, -3453.21], [1061.63, -3446.62], [1070.97, -3447.87], [1076.33, -3448.84]]], "h": 98, "tier": "inferred"}, {"id": "osm:way:1454188326", "rings": [[[1074.72, -3478.84], [1074.61, -3474.27], [1071.83, -3474.32], [1071.73, -3469.74], [1073.06, -3469.72], [1072.89, -3461.4], [1071.63, -3461.44], [1071.54, -3457], [1074.62, -3456.93], [1074.52, -3451.96], [1076.33, -3448.84], [1077.08, -3482.05]]], "h": 19.6, "tier": "inferred"}, {"id": "osm:way:1454188327", "rings": [[[1070.86, -3444.37], [1070.97, -3447.87], [1061.63, -3446.62], [1061.87, -3453.21], [1052.92, -3456.8], [1045.34, -3457.03], [1037.99, -3454.73], [1037.84, -3447.31], [1036.45, -3447.26], [1026.75, -3449.32], [1026.77, -3445.42]]], "h": 19.6, "tier": "inferred"}, {"id": "osm:way:1454188328", "rings": [[[1024.27, -3454.3], [1024.27, -3458.26], [1027.23, -3458.26], [1027.24, -3462.59], [1026.32, -3462.59], [1026.34, -3470.95], [1027.58, -3470.95], [1027.59, -3475.46], [1024.87, -3475.46], [1024.88, -3479.85], [1022.65, -3483.71], [1022.11, -3450.86]]], "h": 19.6, "tier": "inferred"}, {"id": "osm:way:1454188329", "rings": [[[1037.55, -3480.16], [1040.59, -3480.16], [1040.56, -3483.09], [1059.05, -3482.75], [1059.02, -3479.62], [1062.45, -3479.46], [1062.35, -3485.25], [1077.08, -3482.05], [1076.49, -3482.64], [1076.59, -3487.26], [1023.12, -3488.65], [1023.18, -3484.68], [1022.65, -3483.71], [1037.49, -3485.64]]], "h": 19.6, "tier": "inferred"}]} as VBuilding;

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

it('tops the tower at the absolute lidar roof over its white podium', () => {
  const other: VBuilding = { id: 'other', h: 10, floors: null, rings: [[[0, 0], [1, 0], [1, 1]]] };
  expect(site.id).toBe(registryId);
  expect(createRegistry([other], site, grid)).toBeNull();
  const result = createRegistry([site, other], site, grid)!;
  expect(result.buildings).toEqual([other]);
  for (const m of result.group.children as Mesh[])
    expect((m.material as Material).onBeforeCompile).toBe(Material.prototype.onBeforeCompile);
  result.group.updateMatrixWorld(true);
  const roof = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 500, z), new Vector3(0, -1, 0)).intersectObject(result.group)[0]?.point.y + 300;
  // Heights are NAVD88, independent of the grade: 356.9 m roof, 360.6 m penthouse screen.
  expect(roof(1049.4, -3466.5)).toBeCloseTo(360.6, 1);
  expect(roof(1028.5, -3466)).toBeCloseTo(356.9, 1); // outside the screen, just in from the west wall
  expect(roof(1050, -3486)).toBeCloseTo(280 + 20.4, 1); // podium on 13th Street
  let triangles = 0;
  result.group.traverse(o => { if ('geometry' in o) triangles += (o as { geometry: { attributes: { position: { count: number } } } }).geometry.attributes.position.count / 3; });
  expect(triangles).toBeLessThan(8000);
});
