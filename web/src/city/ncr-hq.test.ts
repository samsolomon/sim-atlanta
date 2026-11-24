import { Material, Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createNcrHq, ncrId } from './ncr-hq';

// The mapped headquarters and its parts, as staged for the midtown-central area.
const site = {"id": "osm:way:26795281", "cls": "yes", "floors": 19, "h": null, "rings": [[[109.88, -2804.01], [109.91, -2767.91], [170.23, -2767.93], [177.96, -2767.93], [178.29, -2730.14], [248.47, -2729.76], [248.4, -2754.61], [242.8, -2767.99], [236.66, -2768.29], [236.61, -2772.1], [234.02, -2772.86], [234.6, -2786.17], [238.84, -2818.41], [243.63, -2820.35], [241.86, -2833.67], [230.57, -2837.89], [229.64, -2842.27], [172.99, -2842.27], [109.48, -2842.28], [106.86, -2840.72], [105.7, -2804.26]]], "name": "NCR Global Headquarters", "parts": [{"id": "osm:way:886033995", "rings": [[[172.99, -2842.27], [109.48, -2842.28], [106.86, -2840.72], [105.7, -2804.26], [109.88, -2804.01], [159.02, -2803.46], [170.02, -2806.46], [172.82, -2812.41]]], "h": 68.4, "tier": "inferred"}, {"id": "osm:way:886033999", "rings": [[[178.29, -2730.14], [248.47, -2729.76], [248.4, -2754.61], [242.8, -2767.99], [236.66, -2768.29], [177.96, -2767.93]]], "h": 43.2, "tier": "inferred"}, {"id": "osm:way:886034005", "rings": [[[170.02, -2806.46], [159.02, -2803.46], [109.88, -2804.01], [109.91, -2767.91], [170.23, -2767.93], [177.96, -2767.93], [236.66, -2768.29], [236.61, -2772.1], [234.02, -2772.86], [234.6, -2786.17], [238.84, -2818.41], [243.63, -2820.35], [241.86, -2833.67], [230.57, -2837.89], [229.64, -2842.27], [172.99, -2842.27], [172.82, -2812.41]]], "h": 18, "tier": "inferred"}]} as VBuilding;

const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: -100, maxX: 500, minZ: -3100, maxZ: -2500 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2850).buffer,
);

it('stands both towers at their lidar roofs over the sky-garden base, with the sloping facet', () => {
  const other: VBuilding = { id: 'other', h: 10, floors: null, rings: [[[0, 0], [1, 0], [1, 1]]] };
  expect(site.id).toBe(ncrId);
  expect(createNcrHq([other], site, grid)).toBeNull();
  expect(createNcrHq([site], { ...site, parts: site.parts!.slice(1) }, grid)).toBeNull();
  const result = createNcrHq([site, other], site, grid)!;
  expect(result.buildings).toEqual([other]);
  expect(result.group.children.every(m => m.receiveShadow)).toBe(true);
  result.group.updateMatrixWorld(true);
  // Batchable: no hooked (library-painted) material, and the lamps share the body's shadow flags.
  for (const m of result.group.children as Mesh[]) {
    expect((m.material as Material).onBeforeCompile).toBe(Material.prototype.onBeforeCompile);
    expect(m.castShadow && m.receiveShadow).toBe(true);
  }
  const roof = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 500, z), new Vector3(0, -1, 0)).intersectObject(result.group)[0]?.point.y + 300;
  const floor = 285;
  expect(roof(140, -2835)).toBeCloseTo(floor + 95, 1); // tower plant screen
  expect(roof(108.5, -2840.5)).toBeCloseTo(floor + 85.6, 1); // tower roof outside the screen, at the 8th & Williams corner
  expect(roof(215, -2737)).toBeCloseTo(floor + 58.6, 1); // Spring Street tower screen
  expect(roof(200, -2790)).toBeCloseTo(floor + 19.7, 1); // sky garden
  // Two metres in from the southwest corner along Williams, the facet slopes below the roof.
  const facet = roof(107.5, -2808);
  expect(facet).toBeGreaterThan(floor + 7.6);
  expect(facet).toBeLessThan(floor + 80);
  let triangles = 0;
  result.group.traverse(o => { if ('geometry' in o) triangles += (o as { geometry: { attributes: { position: { count: number } } } }).geometry.attributes.position.count / 3; });
  expect(triangles).toBeLessThan(1600);
});
