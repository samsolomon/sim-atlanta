import * as THREE from 'three';
import { expect, test } from 'vitest';
import type { TerrainCity } from '../terrain/transport-data';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { residential } from './residential';
import { SWITCH_M, TILE_M, houseLod, takeHouseLodChange } from './house-lod';

const rect = (x: number, z: number, w: number, d: number): P2[] => [[x, z], [x + w, z], [x + w, z + d], [x, z + d]];
// Two streets of houses 1.7 km apart, so they fall in different tiles.
function street(x0: number, n: number): VBuilding[] {
  return Array.from({ length: n }, (_, i) => ({ id: `h${x0}-${i}`, cls: 'house', h: null, floors: null, rings: [rect(x0 + i * 16, 0, 11, 9)] }));
}
const buildings = [...street(0, 40), ...street(1700, 12)];
const city = { bounds: { minX: -100, maxX: 2000, minZ: -100, maxZ: 100 }, buildings,
  roads: [{ cls: 'residential', name: 'Lab St', bridge: false, tunnel: false, pts: [[-100, 20], [2000, 20]] }], rail: [] } as unknown as TerrainCity;
const tris = (o: THREE.Object3D) => { let n = 0; o.traverse(m => { if (m instanceof THREE.Mesh) n += m.geometry.getAttribute('position').count / 3; }); return n; };

function make(force?: 'near' | 'far') {
  const homes = residential(city, undefined, () => 0, () => 0, 'low');
  return houseLod({ houses: homes.city.buildings.filter(b => homes.isHouse(b.id)), bounds: city.bounds, ground: () => 0,
    foundation: () => 0, near: homes.finishFor, far: homes.farFinishFor, roofUnits: 3, force });
}

test('a far house is a fraction of a near one', () => {
  const near = make('near'), far = make('far');
  const perNear = tris(near.group) / buildings.length, perFar = tris(far.group) / buildings.length;
  console.log(`house triangles: near ${perNear.toFixed(0)}, far ${perFar.toFixed(0)}`);
  expect(perFar).toBeLessThan(perNear / 3);
  near.dispose(); far.dispose();
});

test('builds only far houses until a camera comes within range of a tile, then the near version there alone', () => {
  const lod = make();
  expect(lod.tiles).toHaveLength(2);
  expect(lod.tiles.every(t => !t.nearWorld)).toBe(true);
  const camera = new THREE.PerspectiveCamera();
  // Far from both tiles: nothing near is built.
  camera.position.set(900, 3000, 0); camera.updateMatrixWorld();
  lod.group.updateMatrixWorld(true);
  takeHouseLodChange();
  for (const t of lod.tiles) t.update(camera);
  expect(lod.tiles.every(t => !t.nearWorld)).toBe(true);
  // Over the first street: only its tile builds near, and shows it.
  camera.position.set(90, 150, 0); camera.updateMatrixWorld();
  takeHouseLodChange();
  for (const t of lod.tiles) t.update(camera);
  expect(lod.tiles.map(t => !!t.nearWorld)).toEqual([true, false]);
  expect(lod.tiles[0].near.visible).toBe(true);
  expect(lod.tiles[0].farWorld.group.visible).toBe(false);
  expect(SWITCH_M).toBeGreaterThanOrEqual(TILE_M);
  lod.dispose();
});

test('measures the switch to the nearest house, builds one tile per frame, and clips new near houses like the far ones', () => {
  const lod = make();
  const camera = new THREE.PerspectiveCamera();
  const plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
  lod.tiles.forEach(t => t.farWorld.group.traverse(m => { if (m instanceof THREE.Mesh) (m.material as THREE.Material).clippingPlanes = [plane]; }));
  // 850 m from the end of the first street but about 1.17 km from its middle: near, by the nearest house.
  camera.position.set(-850, 0, 0); camera.updateMatrixWorld();
  takeHouseLodChange();
  lod.tiles[0].update(camera);
  expect(lod.tiles[0].nearWorld).not.toBeNull();
  expect(takeHouseLodChange()).toBe(true);
  lod.tiles[0].nearWorld!.group.traverse(m => { if (m instanceof THREE.Mesh) expect((m.material as THREE.Material).clippingPlanes).toEqual([plane]); });
  lod.dispose();
  // Both tiles of a fresh set in range in one frame: the second waits for the next frame.
  const fresh = make();
  camera.position.set(1200, 0, 0); camera.updateMatrixWorld();
  takeHouseLodChange();
  fresh.tiles[0].update(camera); fresh.tiles[1].update(camera);
  expect(fresh.tiles.map(t => !!t.nearWorld)).toEqual([true, false]);
  expect(fresh.tiles[1].farWorld.group.visible).toBe(true);
  takeHouseLodChange();
  fresh.tiles[1].update(camera);
  expect(fresh.tiles[1].nearWorld).not.toBeNull();
  fresh.dispose();
});
