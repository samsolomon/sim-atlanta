import { Raycaster, Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createGeorgiaAquarium } from './georgia-aquarium';
const sites: VBuilding[] = [
  {
    id: 'bb792e0e-9fe2-4c92-8ee9-dd3c60fa4dbb',
    h: 12.462872505187988,
    floors: 5,
    rings: [
      [
        [-238.01, -1002.78],
        [-243.3, -1006.38],
        [-243.44, -1105.4],
        [-259.53, -1139.96],
        [-270.28, -1139.74],
        [-270.13, -1156.51],
        [-274.54, -1156.36],
        [-274.51, -1153.94],
        [-277.63, -1153.94],
        [-277.64, -1155.04],
        [-278.29, -1154.95],
        [-281.38, -1154.96],
        [-281.42, -1135.68],
        [-365.25, -1135.85],
        [-365.39, -1064.6],
        [-403.97, -1064.69],
        [-406.91, -1053.8],
        [-407.08, -1029.43],
        [-406.54, -1025.89],
        [-405.46, -1022.59],
        [-403.38, -1018.99],
        [-360.07, -967.35],
        [-349.93, -967.19],
        [-346.72, -957.57],
        [-351.83, -957.11],
        [-351.5, -953.46],
        [-350.47, -953.55],
        [-346.06, -948.63],
        [-341.91, -945.04],
        [-306.11, -945.06],
        [-306.05, -942.68],
        [-262.61, -944.04],
        [-257.03, -944.78],
        [-253.44, -945.26],
        [-235.19, -945.59],
        [-233.91, -946.16],
        [-233.21, -946.81],
        [-232.25, -946.28],
        [-228.47, -951.77],
        [-225.86, -957.18],
        [-224.09, -962.92],
        [-223.21, -968.86],
        [-223.27, -975.27],
        [-224.35, -981.59],
        [-226.43, -987.63],
        [-229.45, -993.28],
        [-233.35, -998.38],
      ],
    ],
  },
  {
    id: '40215321-bea4-48dc-a8b7-5a05a7206f36',
    h: 27.0,
    floors: null,
    rings: [
      [
        [-278.29, -1154.95],
        [-278.25, -1170.64],
        [-356.81, -1170.82],
        [-398.53, -1170.78],
        [-404.66, -1170.78],
        [-404.83, -1077.75],
        [-403.97, -1064.69],
        [-365.39, -1064.6],
        [-365.25, -1135.85],
        [-281.42, -1135.68],
        [-281.38, -1154.96],
      ],
    ],
  },
];
const [main, deck] = sites;
const grid = new GroundGrid(
  {
    version: 1,
    rows: 2,
    cols: 2,
    stepM: 1000,
    bounds: { minX: -1000, maxX: 0, minZ: -1500, maxZ: -500 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
    scaleM: 0.1,
    offsetM: 0,
    noData: -32768,
    sha256: '',
  },
  new Int16Array(4).fill(3040).buffer,
);
afterEach(() => vi.unstubAllGlobals());
it('replaces only the aquarium and keeps the surveyed roof levels under ring reordering', () => {
  vi.stubGlobal('document', {
    createElement: () => ({
      getContext: () => ({
        save() {},
        scale() {},
        fillText() {},
        beginPath() {},
        moveTo() {},
        quadraticCurveTo() {},
        fill() {},
        restore() {},
      }),
    }),
  });
  expect(createGeorgiaAquarium([deck], grid)).toBeNull();
  const ring = main.rings[0];
  for (const outline of [ring, [...ring.slice(12), ...ring.slice(0, 12)].reverse()]) {
    const result = createGeorgiaAquarium([deck, { ...main, rings: [outline] }], grid)!;
    expect(result.buildings).toEqual([deck]);
    result.group.updateMatrixWorld(true);
    const roof = (u: number, v: number) =>
      new Raycaster(result.group.localToWorld(new Vector3(u, 400, v)), new Vector3(0, -1, 0)).intersectObject(
        result.group,
        true,
      )[0]?.point.y + 323.8;
    expect(roof(58, 132)).toBeCloseTo(331.24, 1);
    expect(roof(128.5, 80)).toBeCloseTo(323.25);
    expect(roof(130, 198)).toBeCloseTo(317.86);
    expect(roof(93, 65)).toBeCloseTo(318.05);
    expect(roof(142, 198)).toBeCloseTo(326.72);
    expect(roof(211, 211)).toBeGreaterThan(319);
    expect(roof(51, 61)).toBeNaN();
  }
});
