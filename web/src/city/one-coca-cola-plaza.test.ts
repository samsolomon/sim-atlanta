import { expect, it } from 'vitest';
import { Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createOneCocaColaPlaza, oneCocaColaId } from './one-coca-cola-plaza';

// The mapped ring as staged in midtown-south/context.json.
const ring: [number, number][] = [
  [-442.03, -1910.48], [-479.96, -1910.55], [-478.88, -1909.48], [-481.22, -1907.14], [-484.81, -1910.74],
  [-488.22, -1910.72], [-488.2, -1906.78], [-484.93, -1903.6], [-487.22, -1901.27], [-488.22, -1902.24],
  [-488.47, -1864.7], [-486.96, -1863.13], [-469.96, -1863.04], [-459.11, -1862.97], [-448.76, -1862.92],
  [-450.02, -1864.22], [-447.84, -1866.34], [-444.7, -1863.13], [-441.3, -1863.34], [-441.5, -1866.47],
  [-444.48, -1869.63], [-441.78, -1872.17], [-440.84, -1871.17], [-440.9, -1909.45],
];

it('replaces the mapped tower and keeps the lidar deck, penthouse and corner shaft heights', () => {
  const site: VBuilding = { id: oneCocaColaId, h: 122.8, floors: 29, rings: [ring] };
  const neighbor: VBuilding = { id: 'osm:way:536718217', h: 12, floors: 3, rings: [[[-484, -1863], [-456, -1863], [-456, -1836], [-484, -1836]]] };
  const grid = new GroundGrid(
    {
      version: 1, rows: 2, cols: 2, stepM: 600,
      bounds: { minX: -800, maxX: -200, minZ: -2200, maxZ: -1600 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
      scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
    },
    new Int16Array(4).fill(2900).buffer,
  );
  const model = createOneCocaColaPlaza([site, neighbor], site, grid)!;
  expect(model).not.toBeNull();
  expect(model.buildings).toEqual([neighbor]);
  // A second ring means the footprint changed; fall back to the generic box.
  const split = { ...site, rings: [ring, ring] };
  expect(createOneCocaColaPlaza([split], split, grid)).toBeNull();
  model.group.updateMatrixWorld(true);
  // Ground is 290 m NAVD88, scene zero 300 m.
  const roof = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 400, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y + 10;
  expect(roof(-464.6 + 15, -1886.8 + 15)).toBeCloseTo(119.2, 1);
  expect(roof(-464.6 - 5, -1886.8 + 5)).toBeCloseTo(122.8, 1);
  expect(roof(-464.6 - 23.1, -1886.8 - 23.1)).toBeCloseTo(124.6, 1);
});
