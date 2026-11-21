import * as THREE from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { World, type VData, type VRoad } from '../vignette/world';
import { GroundGrid } from './grid';
import { createDowntownTerrain } from './model';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('grounds scenery, omits decks, forwards wet/season/night and releases its owned resources', () => {
  const stroke = vi.fn();
  const ctx = { setLineDash() {}, scale() {}, translate() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke };
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
    buildings: [
      { id: 'cut', h: 15, floors: null, rings: [[[5, 5], [35, 5], [35, 15], [5, 15]]] },
      { id: 'bank', h: 20, floors: null, rings: [[[2, 25], [10, 25], [10, 35], [2, 35]]] },
    ] };
  const area = createDowntownTerrain(grid, { ...city,
    terrainTransport: { version: 1, roads: [
      { cls: 'secondary', kind: 'ground', pts: [[5, 0], [5, 10]] },
      { cls: 'secondary', kind: 'bridge', pts: [[5, 10], [5, 30]] },
    ], rail: [] } }, [[20, 30, 12, 3]], { quality: 'low' });
  expect(stroke).toHaveBeenCalledTimes(6); // sidewalk, asphalt and centreline for just the two ground runs
  expect(area.bottomY).toBe(-11);
  expect(area.bounds).toEqual(bounds);
  expect(area.groundAt(20, 30)).toBe(-6);
  const facades = area.scenery.children.filter(o => o instanceof THREE.Mesh && o.geometry.hasAttribute('aBase')) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>[];
  expect(facades).toHaveLength(1);
  const mesh = facades[0], base = mesh.geometry.getAttribute('aBase'), pos = mesh.geometry.getAttribute('position');
  const style = mesh.geometry.getAttribute('aStyle');
  const materialBases = new Set<number>(), roofHeights = new Set<number>();
  for (let i = 0; i < pos.count; i++) {
    if (style.getX(i) < 0) roofHeights.add(pos.getY(i));
    else materialBases.add(base.getX(i));
  }
  expect(materialBases).toEqual(new Set([-6, 0])); // footprint-edge low is between its corners
  expect(roofHeights).toEqual(new Set([9, 20]));
  expect(area.board.userData.lit).toBeUndefined(); // Control passes the target explicitly to buildLights
  const trunks: THREE.InstancedMesh[] = [];
  area.scenery.traverse(o => {
    if (o instanceof THREE.InstancedMesh && o.geometry.type === 'CylinderGeometry') trunks.push(o);
  });
  const matrix = new THREE.Matrix4();
  trunks[0].getMatrixAt(0, matrix);
  expect(matrix.elements[13]).toBe(-6);
  area.setWet(1);
  expect(area.board.material.color.r).toBeCloseTo(0.7);
  expect(mesh.material.color.r).toBeCloseTo(.7);
  const shader = { uniforms: {} as Record<string, { value: number }>, vertexShader: '', fragmentShader: '#include <emissivemap_fragment>' };
  mesh.material.onBeforeCompile(shader as Parameters<typeof mesh.material.onBeforeCompile>[0], {} as THREE.WebGLRenderer);
  expect(shader.fragmentShader).toContain('litWin * uNight');
  const season = vi.spyOn(World.prototype, 'setSeason');
  const night = vi.spyOn(World.prototype, 'setNight');
  area.setSeason(335);
  area.setNight(0.8);
  expect(season).toHaveBeenCalledWith(335);
  expect(night).toHaveBeenCalledWith(0.8);
  expect(shader.uniforms.uNight.value).toBe(0.8);
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
