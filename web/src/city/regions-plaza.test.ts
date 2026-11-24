import { Material, Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createRegionsPlaza, regionsPlazaId } from './regions-plaza';

// The mapped tower, as staged for the midtown-upper area.
const site = {"id": "osm:way:269843399", "cls": "commercial", "floors": 24, "h": 94.1, "rings": [[[280.56, -3656.83], [289.18, -3656.82], [303.75, -3656.79], [318.24, -3656.78], [326.27, -3656.77], [328.64, -3658.94], [328.65, -3664.07], [328.66, -3678.71], [328.68, -3693.14], [328.68, -3697.99], [326.39, -3700.38], [318.36, -3700.39], [308.55, -3700.42], [305.55, -3700.41], [302.64, -3700.41], [289.37, -3700.43], [281.36, -3700.44], [279.17, -3698.35], [279.17, -3693.13], [279.14, -3664.22], [279.13, -3658.83]]], "name": "Regions Plaza", "parts": [{"id": "osm:way:1427661278", "rings": [[[285.92, -3693.13], [285.9, -3664.22], [283.33, -3664.22], [283.32, -3661.22], [291.42, -3669.35], [291.72, -3687.7], [283.14, -3696.28], [283.13, -3693.13]]], "h": 94.1, "tier": "inferred"}, {"id": "osm:way:1427661279", "rings": [[[324.34, -3696.17], [318.36, -3696.17], [318.36, -3693.62], [289.36, -3693.66], [289.36, -3696.27], [283.14, -3696.28], [291.72, -3687.7], [315.71, -3687.57]]], "h": 94.1, "tier": "inferred"}, {"id": "osm:way:1427661280", "rings": [[[321.85, -3664.07], [321.89, -3693.16], [324.33, -3693.14], [324.34, -3696.17], [315.71, -3687.57], [315.96, -3669.38], [324.24, -3661.23], [324.24, -3664.07]]], "h": 94.1, "tier": "inferred"}, {"id": "osm:way:1427661285", "rings": [[[315.71, -3687.57], [291.72, -3687.7], [291.42, -3669.35], [315.96, -3669.38]]], "h": 94.1, "tier": "inferred"}, {"id": "osm:way:1427661286", "rings": [[[289.19, -3663.54], [318.24, -3663.51], [318.24, -3661.23], [324.24, -3661.23], [315.96, -3669.38], [291.42, -3669.35], [283.32, -3661.22], [289.18, -3661.21]]], "h": 94.1, "tier": "inferred"}, {"id": "osm:way:1451518612", "rings": [[[283.13, -3693.13], [279.17, -3693.13], [279.14, -3664.22], [283.33, -3664.22], [285.9, -3664.22], [285.92, -3693.13]]], "h": 94.1, "tier": "inferred"}, {"id": "osm:way:1451518613", "rings": [[[318.24, -3663.51], [289.19, -3663.54], [289.18, -3661.21], [289.18, -3656.82], [318.24, -3656.78], [318.24, -3661.23]]], "h": 94.1, "tier": "inferred"}, {"id": "osm:way:1451518614", "rings": [[[324.24, -3664.07], [328.65, -3664.07], [328.66, -3678.71], [328.68, -3693.14], [324.33, -3693.14], [321.89, -3693.16], [321.85, -3664.07]]], "h": 94.1, "tier": "inferred"}, {"id": "osm:way:1451518615", "rings": [[[318.36, -3696.17], [318.36, -3700.39], [308.55, -3700.42], [305.55, -3700.41], [302.64, -3700.41], [289.37, -3700.43], [289.36, -3696.27], [289.36, -3693.66], [318.36, -3693.62]]], "h": 94.1, "tier": "inferred"}, {"id": "osm:way:1427661281", "rings": [[[328.64, -3658.94], [328.65, -3664.07], [324.24, -3664.07], [324.24, -3661.23], [318.24, -3661.23], [318.24, -3656.78], [326.27, -3656.77]]], "h": 78.4, "tier": "inferred"}, {"id": "osm:way:1427661282", "rings": [[[324.33, -3693.14], [328.68, -3693.14], [328.68, -3697.99], [326.39, -3700.38], [318.36, -3700.39], [318.36, -3696.17], [324.34, -3696.17]]], "h": 78.4, "tier": "inferred"}, {"id": "osm:way:1427661283", "rings": [[[289.36, -3696.27], [289.37, -3700.43], [281.36, -3700.44], [279.17, -3698.35], [279.17, -3693.13], [283.13, -3693.13], [283.14, -3696.28]]], "h": 78.4, "tier": "inferred"}, {"id": "osm:way:1427661284", "rings": [[[280.56, -3656.83], [289.18, -3656.82], [289.18, -3661.21], [283.32, -3661.22], [283.33, -3664.22], [279.14, -3664.22], [279.13, -3658.83]]], "h": 78.4, "tier": "inferred"}]} as VBuilding;

const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: 0, maxX: 600, minZ: -4000, maxZ: -3400 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2850).buffer,
);

it('steps the tower from its notched corners to the parapet and the hipped crown at the lidar heights', () => {
  const other: VBuilding = { id: 'other', h: 10, floors: null, rings: [[[0, 0], [1, 0], [1, 1]]] };
  expect(site.id).toBe(regionsPlazaId);
  expect(createRegionsPlaza([other], site, grid)).toBeNull();
  const result = createRegionsPlaza([site, other], site, grid)!;
  expect(result.buildings).toEqual([other]);
  for (const m of result.group.children as Mesh[])
    expect((m.material as Material).onBeforeCompile).toBe(Material.prototype.onBeforeCompile);
  result.group.updateMatrixWorld(true);
  const roof = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 500, z), new Vector3(0, -1, 0)).intersectObject(result.group)[0]?.point.y + 300;
  const floor = 285;
  expect(roof(281, -3699)).toBeCloseTo(floor + 84.4, 1); // notched corner roof
  expect(roof(304, -3657.5)).toBeCloseTo(floor + 96.8, 1); // parapet on the cross
  expect(roof(304, -3679)).toBeCloseTo(floor + 104, 1); // hip roof deck
  const slope = roof(304, -3664);
  expect(slope).toBeGreaterThan(floor + 96.8);
  expect(slope).toBeLessThan(floor + 104);
  let triangles = 0;
  result.group.traverse(o => { if ('geometry' in o) triangles += (o as { geometry: { attributes: { position: { count: number } } } }).geometry.attributes.position.count / 3; });
  expect(triangles).toBeLessThan(5000);
});
