import { Raycaster, Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createWorldOfCocaCola } from './world-of-coca-cola';
const [main, ticketCanopy]: VBuilding[] = [
  {
    id: '238d116b-be0d-4143-8430-7dce06763b88',
    h: 12.121541976928711,
    floors: null,
    rings: [
      [
        [-140.67, -961.16],
        [-137.04, -957.52],
        [-123.19, -971.86],
        [-103.55, -952.43],
        [-90.59, -966.0],
        [-100.7, -975.49],
        [-96.8, -975.58],
        [-93.53, -976.19],
        [-90.38, -977.34],
        [-87.23, -978.69],
        [-82.53, -969.08],
        [-67.38, -969.0],
        [-67.26, -972.71],
        [-53.6, -972.66],
        [-53.74, -1029.32],
        [-52.58, -1031.59],
        [-52.15, -1034.06],
        [-52.62, -1036.16],
        [-53.84, -1038.26],
        [-56.17, -1039.56],
        [-58.6, -1040.02],
        [-60.78, -1039.53],
        [-62.95, -1038.4],
        [-91.36, -1038.04],
        [-91.52, -1031.68],
        [-96.45, -1030.73],
        [-99.84, -1029.57],
        [-98.79, -1027.23],
        [-102.78, -1026.86],
        [-106.95, -1025.99],
        [-111.56, -1024.21],
        [-109.62, -1019.79],
        [-112.24, -1018.2],
        [-114.85, -1016.29],
        [-118.26, -1012.36],
        [-120.62, -1008.17],
        [-122.04, -1003.29],
        [-122.46, -999.89],
        [-122.33, -995.72],
        [-128.98, -1001.19],
        [-127.16, -1002.95],
        [-134.41, -1009.95],
        [-136.11, -1008.41],
        [-144.25, -1015.69],
        [-125.17, -1036.49],
        [-132.83, -1048.3],
        [-134.97, -1047.11],
        [-137.4, -1045.75],
        [-141.88, -1042.25],
        [-146.39, -1038.02],
        [-150.48, -1033.25],
        [-154.66, -1027.66],
        [-155.09, -1026.84],
        [-157.7, -1021.78],
        [-159.89, -1016.38],
        [-161.2, -1010.22],
        [-161.92, -1003.84],
        [-161.56, -996.54],
        [-160.27, -989.63],
        [-158.56, -984.27],
        [-156.16, -979.07],
        [-153.15, -974.41],
        [-150.33, -975.84],
        [-148.68, -972.87],
        [-147.02, -969.89],
        [-143.91, -965.01],
      ],
    ],
  },
  {
    id: '5e67bb11-bd56-41b3-b637-45c46b68ecfe',
    h: 5.2,
    floors: null,
    rings: [
      [
        [-137.4, -1045.75],
        [-134.97, -1047.11],
        [-139.15, -1053.18],
        [-145.27, -1050.48],
        [-149.29, -1047.55],
        [-152.47, -1044.6],
        [-155.29, -1041.36],
        [-157.8, -1037.17],
        [-160.02, -1031.41],
        [-155.09, -1026.84],
        [-154.66, -1027.66],
        [-150.48, -1033.25],
        [-146.39, -1038.02],
        [-141.88, -1042.25],
      ],
    ],
  },
];
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
  new Int16Array(4).fill(3000).buffer,
);
afterEach(() => {
  vi.unstubAllGlobals();
});
it('retains the ticket canopy and open court while placing the tower on its surveyed cap', () => {
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({ scale() {}, fill() {} }) }) });
  vi.stubGlobal('Path2D', class {});
  expect(createWorldOfCocaCola([ticketCanopy], grid)).toBeNull();
  const ring = main.rings[0];
  for (const outline of [ring, [...ring.slice(13), ...ring.slice(0, 13)].reverse()]) {
    const result = createWorldOfCocaCola([{ ...main, rings: [outline] }, ticketCanopy], grid)!;
    expect(result.buildings).toEqual([ticketCanopy]);
    result.group.updateMatrixWorld(true);
    const roof = (x: number, z: number) =>
      new Raycaster(new Vector3(x, 100, z), new Vector3(0, -1, 0)).intersectObject(result.group, true)[0]?.point.y + 323.8;
    expect(roof(-153.6, -1002.1)).toBeCloseTo(329.1);
    expect(roof(-109, -995)).toBeCloseTo(318.22, 1);
    expect(roof(-77, -1022)).toBeCloseTo(309.72);
    expect(roof(-77, -994)).toBeCloseTo(315.91);
    expect(roof(-140, -1032)).toBeCloseTo(307.16);
    expect(roof(-123, -1018)).toBeNaN();
    expect(roof(-160, -1005)).toBeCloseTo(310.75, 1);
  }
});
