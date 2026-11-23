import { Box3, Mesh, Raycaster, Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createGeorgiaPower } from './georgia-power';

const hq: VBuilding = {
  id: '0831390e-07dd-4e8b-8eff-1e70d35e1c55',
  h: 11.7,
  floors: null,
  rings: [
    [
      [982.46, -1078.69],
      [925.79, -1079.09],
      [925.72, -1069.67],
      [916.46, -1063.6],
      [907.32, -1052.27],
      [902.36, -1028.28],
      [904.84, -1007.45],
      [914.76, -988.11],
      [929.63, -975.23],
      [950.46, -968.28],
      [1002.54, -970.27],
      [1002.54, -1032.25],
      [1000.52, -1037.84],
      [997.69, -1038.4],
      [982.17, -1038.78],
      [982.45, -1077.5],
    ],
  ],
};
const annex: VBuilding = {
  id: '98ea45a8-aec5-4eab-b1b1-77a136c99a38',
  h: 100.2,
  floors: 2,
  rings: [
    [
      [982.17, -1038.78],
      [997.69, -1038.4],
      [997.72, -1049.49],
      [997.82, -1077.45],
      [982.45, -1077.5],
    ],
  ],
};
const zero = 314;
const grid = new GroundGrid(
  {
    version: 1,
    rows: 2,
    cols: 2,
    stepM: 120,
    bounds: { minX: 880, maxX: 1000, minZ: -1080, maxZ: -960 },
    scaleM: 1,
    offsetM: 0,
    noData: -32768,
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: zero },
    sha256: '',
  },
  new Int16Array(4).fill(293).buffer,
);
afterEach(() => vi.unstubAllGlobals());

it('puts each roof on its measured level and clips the curved wing at the board edge', () => {
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({ fillText() {} }) }) });
  const site = createGeorgiaPower([hq, annex], grid)!;
  expect(site.buildings).toEqual([]);
  site.group.updateMatrixWorld(true);
  const y = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(site.group)[0].point.y + zero;
  expect(y(954, -1056)).toBeCloseTo(395.0, 1);
  expect(y(942, -995)).toBeCloseTo(306.1, 1);
  expect(y(990, -1061)).toBeCloseTo(301.7, 1);
  expect(new Box3().setFromObject(site.group).max.x).toBeCloseTo(999.95, 2);
  const facade = (elevation: number) =>
    new Raycaster(new Vector3(950, elevation - zero, -1010), new Vector3(0, 0, -1)).intersectObject(site.group)[0]
      .point.z;
  // At two equivalent points 12 stories apart the south wall projects another 12 × 15 inches.
  const pitch = (395 - (293 - 0.45)) / 24;
  expect(facade(293 - 0.45 + 17.5 * pitch) - facade(293 - 0.45 + 5.5 * pitch)).toBeCloseTo(12 * 0.381, 2);
  site.setNight(1);
  const glass = site.group.children.find((x) => x instanceof Mesh && x.material.isMeshPhongMaterial) as Mesh;
  expect(glass.material).toMatchObject({ emissiveIntensity: 1.3 });
});

it('lets the verified annex replace its own extrusion when the tower footprint changes', () => {
  const altered = { ...hq, rings: annex.rings },
    other = { ...annex, id: 'neighbor' };
  const site = createGeorgiaPower([altered, annex, other], grid)!;
  expect(site.buildings).toEqual([altered, other]);
  expect(createGeorgiaPower([altered, other], grid)).toBeNull();
  const missing = Object.create(grid) as GroundGrid;
  missing.sample = () => null;
  expect(createGeorgiaPower([hq, annex], missing)).toBeNull();
});
