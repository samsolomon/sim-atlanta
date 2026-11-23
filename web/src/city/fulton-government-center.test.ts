import { Raycaster, Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import type { P2 } from '../vignette/geom';
import { createFultonGovernmentCenter } from './fulton-government-center';

afterEach(() => vi.unstubAllGlobals());
it('keeps both county records together and the courthouse across Pryor separate', () => {
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({ fillText() {} }) }) });
  const c = Math.cos((33.6 * Math.PI) / 180),
    s = Math.sin((33.6 * Math.PI) / 180);
  function footprint(id: string, local: P2[]): VBuilding {
    return { id, h: 25, floors: null, rings: [local.map(([u, v]) => [u * c - v * s, 300 + u * s + v * c])] };
  }
  const main = footprint('8ce87973-e33f-4f88-aa5d-2d557abf5bc5', [
    [-79, -41],
    [23, -41],
    [23, 77],
    [-14, 77],
    [-14, 55],
    [-47, 55],
    [-47, 37],
    [-79, 37],
  ]);
  const south = footprint('4f4d729c-a11b-48de-937e-93af0c7916ec', [
    [-78, 58],
    [-27, 58],
    [-27, 67],
    [-18, 67],
    [-18, 86],
    [-78, 86],
  ]);
  const court = footprint('0a4a8480-d8f4-40bf-9346-853c053cd064', [
    [52, -35],
    [93, -35],
    [93, 33],
    [52, 33],
  ]);
  const grid = new GroundGrid(
    {
      version: 1,
      rows: 2,
      cols: 2,
      stepM: 1000,
      bounds: { minX: -500, maxX: 500, minZ: 0, maxZ: 1000 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3120).buffer,
  );
  expect(createFultonGovernmentCenter([main, court], grid)).toBeNull();
  expect(createFultonGovernmentCenter([south, court], grid)).toBeNull();
  const result = createFultonGovernmentCenter([main, south, court], grid)!;
  expect(result.buildings).toEqual([court]);
  result.group.updateMatrixWorld(true);
  const scene = result.group.children[0];
  function roof(u: number, v: number) {
    const eye = scene.localToWorld(new Vector3(u, 390, v));
    return new Raycaster(eye, new Vector3(0, -1, 0)).intersectObject(result.group, true)[0]?.point.y + 323.8;
  }
  expect(roof(-40, -29.05)).toBeCloseTo(366.25);
  expect(roof(-34, -6.21)).toBeCloseTo(339.4, 1);
  expect(roof(-32, 75)).toBeCloseTo(331.4);
  expect(roof(38, 32.975)).toBeCloseTo(324.04);
  expect(roof(38, 40)).toBeNaN();
});
