import { Raycaster, Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createCitizensTrust } from './citizens-trust';

afterEach(() => vi.unstubAllGlobals());
it('separates the office slab, roof well, low entrance and J Deck', () => {
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({ fillText() {}, fillRect() {} }) }) });
  const sites: VBuilding[] = [
    {
      id: '633f3f22-6e78-4c87-8211-837a9c0fa992',
      h: 13.9,
      floors: null,
      rings: [
        [
          [916.31, -335.62],
          [916.54, -331.76],
          [916.37, -309.86],
          [926.78, -309.78],
          [926.71, -301.41],
          [916.67, -301.48],
          [916.66, -300.18],
          [900.93, -300.3],
          [900.77, -268.5],
          [900.55, -230.82],
          [956.18, -230.52],
          [956.53, -269.64],
          [956.43, -275.02],
          [938.42, -275.12],
          [938.75, -335.5],
        ],
      ],
    },
    {
      id: '4aa2b33a-6a07-4b7b-b274-59c6cb7fa8dd',
      h: 58.3,
      floors: 12,
      rings: [
        [
          [900.77, -268.5],
          [900.93, -300.3],
          [916.66, -300.18],
          [916.67, -301.48],
          [926.71, -301.41],
          [926.78, -309.78],
          [916.37, -309.86],
          [916.54, -331.76],
          [904.55, -331.86],
          [904.63, -342.81],
          [879.62, -343.01],
          [879.39, -314.19],
          [875.88, -314.23],
          [875.77, -299.36],
          [881.65, -299.3],
          [881.49, -268.59],
        ],
      ],
    },
  ];
  const grid = new GroundGrid(
    {
      version: 1,
      rows: 2,
      cols: 2,
      stepM: 1100,
      bounds: { minX: 0, maxX: 1100, minZ: -1100, maxZ: 0 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3030).buffer,
  );
  const deck = sites.find((b) => b.id.startsWith('633f'))!;
  expect(createCitizensTrust([deck], grid)).toBeNull();
  const result = createCitizensTrust(sites, grid)!;
  expect(result.buildings).toEqual([deck]);
  result.group.updateMatrixWorld(true);
  function roof(u: number, v: number) {
    const eye = result.group.localToWorld(new Vector3(u, 390, v));
    return new Raycaster(eye, new Vector3(0, -1, 0)).intersectObject(result.group, true)[0]?.point.y + 323.8;
  }
  expect(roof(12, 16)).toBeCloseTo(354.6);
  expect(roof(6, 62)).toBeCloseTo(350.15);
  expect(roof(6, 51)).toBeCloseTo(354.07);
  expect(roof(32, 21)).toBeCloseTo(312.32);
  expect(roof(42, 36)).toBeCloseTo(306.95);
  expect(roof(-2.0, 35)).toBeCloseTo(307.38);
});
