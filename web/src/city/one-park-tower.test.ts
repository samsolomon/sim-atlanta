import { Mesh, PlaneGeometry, Raycaster, Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createOneParkTower } from './one-park-tower';

afterEach(() => vi.unstubAllGlobals());
it('retains the lower equipment well behind the Walton corner and the taller southwest penthouse', () => {
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({ fillRect() {}, fillText() {} }) }) });
  const office: VBuilding = {
    id: 'f2448d24-91b3-4b68-9fff-c903d9c1f40c',
    h: 134,
    floors: 32,
    rings: [
      [
        [202.7, -117.5],
        [177.3, -95.5],
        [157.3, -118.6],
        [183, -140.6],
      ],
    ],
  };
  const other = { ...office, id: 'William-Oliver' };
  const grid = new GroundGrid(
    {
      version: 1,
      rows: 2,
      cols: 2,
      stepM: 80,
      bounds: { minX: 140, maxX: 220, minZ: -160, maxZ: -80 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3190).buffer
  );
  const { group, buildings } = createOneParkTower([other, office], grid)!;
  expect(buildings).toEqual([other]);
  group.updateMatrixWorld(true);
  const top = (u: number, v: number) => {
    const eye = new Vector3(u, 500, v);
    group.localToWorld(eye);
    return new Raycaster(eye, new Vector3(0, -1, 0)).intersectObject(group)[0].point.y + 323.8;
  };
  expect(top(14, 11)).toBeCloseTo(425.6);
  expect(top(10, -8)).toBeCloseTo(432.8);
  expect(top(-5, 4)).toBeCloseTo(442.9);
  const sign = group.children.find((c) => c instanceof Mesh && c.geometry instanceof PlaneGeometry)!;
  const facing = sign.getWorldDirection(new Vector3());
  expect(facing.x).toBeCloseTo(0.654, 2);
  expect(facing.z).toBeCloseTo(0.757, 2);
  expect(createOneParkTower([other], grid)).toBeNull();
});
