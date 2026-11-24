import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { hideEmptyMeshes } from './empty-draws';

const mesh = (positions: number[], usage: THREE.Usage = THREE.StaticDrawUsage) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3).setUsage(usage));
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial());
};

describe('hideEmptyMeshes', () => {
  it('hides static meshes with no vertices and marks them for the draw capture', () => {
    const root = new THREE.Group();
    const empty = mesh([]);
    const full = mesh([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    root.add(empty, full);
    expect(hideEmptyMeshes(root)).toBe(1);
    expect(empty.visible).toBe(false);
    expect(empty.userData.emptyHidden).toBe(true);
    expect(full.visible).toBe(true);
  });
  it('leaves dynamic geometry (filled later), instanced meshes and indexed meshes with indices alone', () => {
    const root = new THREE.Group();
    const dynamic = mesh([], THREE.DynamicDrawUsage);
    const inst = new THREE.InstancedMesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([], 3)), new THREE.MeshBasicMaterial(), 0);
    const indexed = mesh([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    indexed.geometry.setIndex([0, 1, 2]);
    root.add(dynamic, inst, indexed);
    expect(hideEmptyMeshes(root)).toBe(0);
    expect(dynamic.visible && inst.visible && indexed.visible).toBe(true);
  });
  it('shows a hidden mesh again when it is filled later: geometry swapped or attributes replaced', () => {
    const root = new THREE.Group();
    const swapped = mesh([]);
    const refilled = mesh([]);
    const reindexed = mesh([]);
    root.add(swapped, refilled, reindexed);
    expect(hideEmptyMeshes(root)).toBe(3);
    // A far form whose geometry arrives later.
    swapped.geometry = mesh([0, 0, 0, 1, 0, 0, 0, 1, 0]).geometry;
    expect(swapped.visible).toBe(true);
    expect(swapped.userData.emptyHidden).toBe(false);
    // A geometry filled in place (season or clock rebuild).
    refilled.geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
    expect(refilled.visible).toBe(true);
    // Still empty after an index with no entries: stays hidden, then shows once indexed.
    reindexed.geometry.setIndex([]);
    expect(reindexed.visible).toBe(false);
    reindexed.geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
    expect(reindexed.visible).toBe(false);
    reindexed.geometry.setIndex([0, 1, 2]);
    expect(reindexed.visible).toBe(true);
  });
});
