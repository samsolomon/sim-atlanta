import { Raycaster, Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createAltitudeApartments } from './altitude-apartments';

const slab: VBuilding = {
  id: '53678626-003d-40da-86c2-cfe2fb7c63e7',
  h: 92,
  floors: 22,
  rings: [
    [
      [861.13, -855.51],
      [861.26, -879.36],
      [829.03, -879.53],
      [828.69, -814.88],
      [860.9, -814.7],
    ],
  ],
};
const grid = new GroundGrid(
  {
    version: 1,
    rows: 2,
    cols: 2,
    stepM: 100,
    bounds: { minX: 800, maxX: 900, minZ: -900, maxZ: -800 },
    encoding: 'signed int16 little-endian',
    scaleM: 1,
    offsetM: 0,
    noData: -32768,
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 314 },
    sha256: '',
  },
  new Int16Array(4).fill(300).buffer,
);
afterEach(() => vi.unstubAllGlobals());

it('keeps the Piedmont ledge low and puts the shaft and housing on their surveyed roofs', () => {
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({ fillText() {} }) }) });
  const podium = { ...slab, id: 'c97061e3-9654-4b96-88de-06d74037fa35' };
  const site = createAltitudeApartments([slab, podium], grid)!;
  expect(site.buildings).toEqual([podium]);
  site.group.updateMatrixWorld(true);
  const top = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 120, z), new Vector3(0, -1, 0)).intersectObject(site.group)[0].point.y + 314;
  expect(top(859.6, -853)).toBeCloseTo(306.8);
  expect(top(853.5, -853)).toBeCloseTo(387.85);
  expect(top(843.5, -852)).toBeCloseTo(392.2);
});
it('retains the generic source when a corner or terrain sample is missing', () => {
  expect(createAltitudeApartments([{ ...slab, rings: [slab.rings[0].slice(0, -1)] }], grid)).toBeNull();
  const missing = Object.create(grid) as GroundGrid;
  missing.sample = () => null;
  expect(createAltitudeApartments([slab], missing)).toBeNull();
});
