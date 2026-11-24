import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createMetropolis, metropolisId } from './metropolis';

// The mapped condominium and its parts, as staged for the midtown-central area.
const site = {"id": "osm:way:234733557", "cls": "apartments", "floors": 21, "h": 75.6, "rings": [[[694.47, -2863.81], [693.58, -2862.04], [693.18, -2860.02], [693.53, -2857.69], [695.08, -2855.8], [697.24, -2854.86], [699.71, -2855.01], [701.37, -2855.78], [702.08, -2856.56], [738.8, -2856.26], [738.95, -2858.08], [757.87, -2856.77], [758.85, -2869.19], [760.82, -2894.13], [762.04, -2909.6], [762.7, -2918.07], [764.03, -2934.78], [765.99, -2959.82], [766.97, -2972.14], [748.15, -2973.56], [719.83, -2975.68], [720.11, -2978.15], [702.59, -2979.68], [701.44, -2964.06], [703.7, -2963.82], [701.87, -2941.09], [701.2, -2933.78], [698.87, -2904.87], [698.37, -2897.67], [696.49, -2874.37], [695.72, -2864.8]]], "name": "Metropolis Condominium", "parts": [{"id": "osm:way:796357404", "rings": [[[701.87, -2941.09], [714.67, -2940.09], [715, -2943.98], [717.92, -2943.77], [718.86, -2959.51], [716.46, -2959.82], [716.76, -2963.03], [703.7, -2963.82]]], "h": 75.6, "tier": "reported"}, {"id": "osm:way:796357410", "rings": [[[709.59, -2873.28], [709.9, -2877.56], [712.84, -2877.26], [713.8, -2892.74], [711.07, -2893.11], [711.37, -2896.71], [698.37, -2897.67], [696.49, -2874.37]]], "h": 75.6, "tier": "reported"}, {"id": "osm:way:886036482", "rings": [[[718.86, -2959.51], [717.92, -2943.77], [715, -2943.98], [714.67, -2940.09], [751.52, -2937.02], [751.39, -2935.75], [764.03, -2934.78], [765.99, -2959.82], [747.22, -2961.18], [716.76, -2963.03], [716.46, -2959.82]]], "h": 71.4, "tier": "reported"}, {"id": "osm:way:886036484", "rings": [[[713.8, -2892.74], [712.84, -2877.26], [709.9, -2877.56], [709.59, -2873.28], [739.99, -2870.76], [758.85, -2869.19], [760.82, -2894.13], [747.92, -2895.3], [747.92, -2894.05], [711.37, -2896.71], [711.07, -2893.11]]], "h": 71.4, "tier": "reported"}, {"id": "osm:way:796357402", "rings": [[[747.22, -2961.18], [765.99, -2959.82], [766.97, -2972.14], [748.15, -2973.56]]], "h": 54.6, "tier": "reported"}, {"id": "osm:way:796357409", "rings": [[[758.85, -2869.19], [739.99, -2870.76], [738.95, -2858.08], [757.87, -2856.77]]], "h": 54.6, "tier": "reported"}, {"id": "osm:way:796357406", "rings": [[[698.87, -2904.87], [715.56, -2903.51], [715.88, -2907.37], [722.02, -2906.87], [723.76, -2928.4], [717.88, -2928.88], [718.17, -2932.41], [701.2, -2933.78]]], "h": 24.9, "tier": "reported"}, {"id": "osm:way:886036474", "rings": [[[711.37, -2896.71], [747.92, -2894.05], [747.92, -2895.3], [760.82, -2894.13], [762.04, -2909.6], [762.7, -2918.07], [764.03, -2934.78], [751.39, -2935.75], [751.52, -2937.02], [701.87, -2941.09], [701.2, -2933.78], [718.17, -2932.41], [717.88, -2928.88], [723.76, -2928.4], [722.02, -2906.87], [715.88, -2907.37], [715.56, -2903.51], [698.87, -2904.87], [698.37, -2897.67]]], "h": 21.9, "tier": "reported"}, {"id": "osm:way:886036477", "rings": [[[720.11, -2978.15], [702.59, -2979.68], [701.44, -2964.06], [703.7, -2963.82], [716.76, -2963.03], [747.22, -2961.18], [748.15, -2973.56], [719.83, -2975.68]]], "h": 9.3, "tier": "reported"}, {"id": "osm:way:886036490", "rings": [[[693.58, -2862.04], [693.18, -2860.02], [693.53, -2857.69], [695.08, -2855.8], [697.24, -2854.86], [699.71, -2855.01], [701.37, -2855.78], [702.08, -2856.56], [738.8, -2856.26], [738.95, -2858.08], [739.99, -2870.76], [709.59, -2873.28], [696.49, -2874.37], [695.72, -2864.8], [694.47, -2863.81]]], "h": 9.3, "tier": "reported"}]} as VBuilding;

const grid = (west: number, east: number) => new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: 400, maxX: 1000, minZ: -3200, maxZ: -2600 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array([west * 10, east * 10, west * 10, east * 10]).buffer,
);

it('raises both towers, the podium deck and the retail bases at their mapped heights', () => {
  const other: VBuilding = { id: 'other', h: 10, floors: null, rings: [[[0, 0], [1, 0], [1, 1]]] };
  const flat = grid(270, 270);
  expect(site.id).toBe(metropolisId);
  expect(createMetropolis([other], site, flat)).toBeNull();
  expect(createMetropolis([site], { ...site, parts: site.parts!.slice(1) }, flat)).toBeNull();
  const result = createMetropolis([site, other], site, flat)!;
  expect(result.buildings).toEqual([other]);
  result.group.updateMatrixWorld(true);
  const roof = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 500, z), new Vector3(0, -1, 0)).intersectObject(result.group)[0]?.point.y + 300;
  expect(roof(704, -2885)).toBeCloseTo(270 + 75.6, 1); // south tower, Peachtree slice
  expect(roof(735, -2882)).toBeCloseTo(270 + 71.4, 1); // south tower body
  expect(roof(750, -2864)).toBeCloseTo(270 + 54.6, 1); // south tower's alley step
  expect(roof(710, -2952)).toBeCloseTo(270 + 75.6, 1); // north tower, Peachtree slice
  expect(roof(710, -2918)).toBeCloseTo(270 + 24.9, 1); // amenity deck
  expect(roof(740, -2915)).toBeCloseTo(270 + 21.9, 1); // garage podium (beside the pool)
  expect(roof(715, -2860)).toBeCloseTo(270 + 9.3, 1); // 8th Street retail base
  // The lamp quads darken with the shaded wall by day, or they show as pale panes.
  expect(result.group.children.every(m => m.receiveShadow)).toBe(true);
  let triangles = 0;
  result.group.traverse(o => { if ('geometry' in o) triangles += (o as { geometry: { attributes: { position: { count: number } } } }).geometry.attributes.position.count / 3; });
  expect(triangles).toBeLessThan(2400);
});

it('sinks the walls below a falling street and keeps storefront heads 4.6 m above it', () => {
  const sloped = grid(280, 260);
  const result = createMetropolis([site], site, sloped)!;
  const [body, lamps] = result.group.children as unknown as { geometry: { attributes: { position: { array: ArrayLike<number> } } } }[];
  const points = (mesh: typeof body) => {
    const a = mesh.geometry.attributes.position.array, out: [number, number, number][] = [];
    for (let i = 0; i < a.length; i += 3) out.push([a[i] + result.group.position.x, a[i + 1], a[i + 2] + result.group.position.z]); // y is NAVD88
    return out;
  };
  const lowest = Math.min(...site.rings[0].map(([x, z]) => sloped.sample(x, z)!));
  expect(Math.min(...points(body).map(p => p[1]))).toBeLessThan(lowest - 0.9);
  // Storefront heads are the lamp vertices in the first storey; each sits 4.6 m over its ground.
  const heads = points(lamps).filter(([x, y, z]) => y > sloped.sample(x, z)! + 3 && y < sloped.sample(x, z)! + 6);
  expect(heads.length).toBeGreaterThan(20);
  for (const [x, y, z] of heads) expect(y - sloped.sample(x, z)!).toBeCloseTo(4.6, 0);
});
