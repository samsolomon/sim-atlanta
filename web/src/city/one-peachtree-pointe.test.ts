import { Material, Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createOnePeachtreePointe, onePeachtreePointeId } from './one-peachtree-pointe';

const site = {"id": "osm:way:39450435", "cls": "office", "floors": 7, "h": null, "rings": [[[307.29, -4820.56], [307.83, -4821.55], [308.88, -4820.76], [310.12, -4820.06], [309.63, -4819.15], [311.54, -4818.38], [313.88, -4817.95], [316.36, -4818.03], [318.12, -4818.42], [320.05, -4819.21], [321.8, -4820.35], [323.44, -4821.93], [324.48, -4823.39], [325.3, -4825], [325.89, -4826.95], [326.13, -4829.07], [325.9, -4831.53], [326.57, -4835.33], [348.48, -4835.08], [348.41, -4861.63], [280.97, -4861.88], [280.88, -4847.13], [276.25, -4834.12]]], "name": "One Peachtree Pointe", "parts": [{"id": "osm:way:1456732496", "rings": [[[307.83, -4821.55], [306.36, -4823.09], [305.24, -4824.89], [304.5, -4826.88], [304.16, -4828.97], [304.25, -4831.09], [304.77, -4833.15], [305.68, -4835.06], [298.7, -4838.28], [298.79, -4847.73], [315.07, -4847.57], [315, -4840.03], [316.63, -4839.99], [318.66, -4839.4], [320.55, -4838.42], [322.19, -4837.09], [323.54, -4835.44], [326.57, -4835.33], [348.48, -4835.08], [348.41, -4861.63], [280.97, -4861.88], [280.88, -4847.13], [276.25, -4834.12], [307.29, -4820.56]]], "h": 25.2, "tier": "inferred"}, {"id": "osm:way:1456732497", "rings": [[[320.55, -4838.42], [318.66, -4839.4], [316.63, -4839.99], [315, -4840.03], [315.07, -4847.57], [298.79, -4847.73], [298.7, -4838.28], [305.68, -4835.06], [304.77, -4833.15], [304.25, -4831.09], [304.16, -4828.97], [304.5, -4826.88], [305.24, -4824.89], [306.36, -4823.09], [307.83, -4821.55], [308.88, -4820.76], [310.12, -4820.06], [312.11, -4819.33], [314.23, -4819.02], [316.31, -4819.12], [317.89, -4819.48], [319.71, -4820.25], [321.08, -4821.13], [322.55, -4822.45], [323.64, -4823.89], [324.41, -4825.32], [325.06, -4827.3], [325.3, -4829.1], [325.13, -4831.54], [324.5, -4833.63], [323.54, -4835.44], [322.19, -4837.09]]], "h": 25.2, "tier": "inferred"}, {"id": "osm:way:1456732499", "rings": [[[324.5, -4833.63], [325.13, -4831.54], [325.9, -4831.53], [326.57, -4835.33], [323.54, -4835.44]]], "h": 21.6, "tier": "inferred"}, {"id": "osm:way:1456732498", "rings": [[[311.54, -4818.38], [313.88, -4817.95], [316.36, -4818.03], [318.12, -4818.42], [320.05, -4819.21], [321.8, -4820.35], [323.44, -4821.93], [324.48, -4823.39], [325.3, -4825], [325.89, -4826.95], [326.13, -4829.07], [325.9, -4831.53], [325.13, -4831.54], [325.3, -4829.1], [325.06, -4827.3], [324.41, -4825.32], [323.64, -4823.89], [322.55, -4822.45], [321.08, -4821.13], [319.71, -4820.25], [317.89, -4819.48], [316.31, -4819.12], [314.23, -4819.02], [312.11, -4819.33], [310.12, -4820.06], [309.63, -4819.15]]], "h": 3.6, "tier": "inferred"}]} as VBuilding;
const grid = new GroundGrid(
  { version: 1, rows: 2, cols: 2, stepM: 600, bounds: { minX: 0, maxX: 600, minZ: -5100, maxZ: -4500 },
    encoding: 'signed int16 little-endian', vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '' },
  new Int16Array(4).fill(2850).buffer,
);

it('raises the block and the ringed glass drum to their lidar roofs', () => {
  expect(site.id).toBe(onePeachtreePointeId);
  const result = createOnePeachtreePointe([site], site, grid)!;
  expect(result.buildings).toEqual([]);
  for (const m of result.group.children as Mesh[])
    expect((m.material as Material).onBeforeCompile).toBe(Material.prototype.onBeforeCompile);
  result.group.updateMatrixWorld(true);
  const roof = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 500, z), new Vector3(0, -1, 0)).intersectObject(result.group)[0]?.point.y + 300;
  const floor = 285;
  expect(roof(330, -4850)).toBeCloseTo(floor + 28.2, 1); // the block
  expect(roof(314.5, -4829)).toBeCloseTo(floor + 32.2, 1); // the drum
  let triangles = 0;
  result.group.traverse(o => { if ('geometry' in o) triangles += (o as { geometry: { attributes: { position: { count: number } } } }).geometry.attributes.position.count / 3; });
  expect(triangles).toBeLessThan(2400);
});
