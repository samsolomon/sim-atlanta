import { afterEach, expect, it, vi } from 'vitest';
import { Mesh, Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createGrady } from './grady';

afterEach(() => vi.unstubAllGlobals());

it('keeps both neighbours and resolves the ward, light well and E roof at their distinct elevations', () => {
  vi.stubGlobal('document', { createElement: () => ({getContext: () => ({fillRect() {}, fillText() {}})}) });
  const grid = new GroundGrid({version: 1, rows: 2, cols: 2, stepM: 300,
    bounds: {minX: 700, maxX: 1000, minZ: 100, maxZ: 400}, encoding: 'signed int16 little-endian',
    vertical: {crs: 'EPSG:5703', sceneZeroNavd88M: 323.8}, scaleM: .1, offsetM: 0, noData: -32768, sha256: ''},
  new Int16Array([3040, 3050, 3030, 3020]).buffer);
  const hospital: VBuilding = {id: 'b17dc236-2262-42f8-bb5b-f4d1ad993d9a', h: 20.69, floors: null,
    rings: [[[798, 277], [887, 139], [963, 203], [899, 321], [874, 342]]]};
  const correll = {...hospital, id: 'correll'}, deck = {...hospital, id: 'deck'};
  const model = createGrady([correll, hospital, deck], grid)!;
  expect(model.buildings).toEqual([correll, deck]);
  const mesh = model.group.children.find(o => o instanceof Mesh && o.castShadow)!;
  // Intersect in the architectural frame (the group carries the geographic transform).
  const roof = (u: number, v: number) => new Raycaster(new Vector3(u, 450, v), new Vector3(0, -1, 0))
    .intersectObject(mesh, false)[0].point.y;
  expect(roof(-32, -53)).toBeCloseTo(376.5);
  expect(roof(31, -50)).toBeCloseTo(376.5);
  expect(roof(1, -23)).toBeCloseTo(391.2);
  expect(roof(1, 3)).toBeCloseTo(322.8);
  expect(roof(10, 72)).toBeCloseTo(347.5);
});
