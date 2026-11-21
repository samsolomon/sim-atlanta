import * as THREE from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { World, type VData, type VRoad } from '../vignette/world';
import { GroundGrid } from './grid';
import { createDowntownTerrain } from './model';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('grounds scenery, omits decks, forwards wet/season/night and releases its owned resources', () => {
  const stroke = vi.fn();
  const ctx = { scale() {}, translate() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke };
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx, width: 0, height: 0 }) });
  const bounds = { minX: 0, minZ: 0, maxX: 40, maxZ: 40 };
  const m = { version: 1, rows: 9, cols: 9, stepM: 5, bounds, scaleM: 0.1, offsetM: 0,
    encoding: 'signed int16 little-endian', noData: -32768, vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 }, sha256: '' };
  const bytes = new ArrayBuffer(2 * 81);
  const view = new DataView(bytes);
  for (let i = 0; i < 81; i++) view.setInt16(2 * i, i % 9 === 4 ? 2940 : 3000, true);
  const grid = new GroundGrid(m, bytes);
  const road: VRoad = { cls: 'secondary', name: null, bridge: false, tunnel: false, pts: [[5, 0], [5, 40]] };
  const city: VData = { bounds, rail: [], roads: [road, { ...road, bridge: true }, { ...road, tunnel: true }],
    buildings: [{ id: 'cut', h: 15, floors: null, rings: [[[5, 5], [35, 5], [35, 15], [5, 15]]] }] };
  const area = createDowntownTerrain(grid, { ...city,
    terrainTransport: { version: 1, roads: [
      { cls: 'secondary', kind: 'ground', pts: [[5, 0], [5, 10]] },
      { cls: 'secondary', kind: 'bridge', pts: [[5, 10], [5, 30]] },
    ], rail: [] } }, [[20, 30, 12, 3]], { quality: 'low' });
  expect(stroke).toHaveBeenCalledTimes(2); // whole at-grade road and the scoped approach
  expect(area.bottomY).toBe(-11);
  expect(area.bounds).toEqual(bounds);
  expect(area.groundAt(20, 30)).toBe(-6);
  expect(area.scenery.children[0].position.y).toBe(-6); // mid-edge low, all four corners are at zero
  const trunks: THREE.InstancedMesh[] = [];
  area.scenery.traverse(o => {
    if (o instanceof THREE.InstancedMesh && o.geometry.type === 'CylinderGeometry') trunks.push(o);
  });
  const matrix = new THREE.Matrix4();
  trunks[0].getMatrixAt(0, matrix);
  expect(matrix.elements[13]).toBe(-6);
  area.setWet(1);
  expect(area.board.material.color.r).toBeCloseTo(0.7);
  const season = vi.spyOn(World.prototype, 'setSeason');
  const night = vi.spyOn(World.prototype, 'setNight');
  area.setSeason(335);
  area.setNight(0.8);
  expect(season).toHaveBeenCalledWith(335);
  expect(night).toHaveBeenCalledWith(0.8);
  const textureDisposed = vi.fn(), geometryDisposed = vi.fn();
  area.board.material.map!.addEventListener('dispose', textureDisposed);
  area.board.geometry.addEventListener('dispose', geometryDisposed);
  new THREE.Scene().add(area.group);
  area.dispose();
  expect(textureDisposed).toHaveBeenCalledTimes(1);
  expect(geometryDisposed).toHaveBeenCalledTimes(1);
  expect(area.group.parent).toBeNull();
  expect(area.group.children).toHaveLength(0);
});
