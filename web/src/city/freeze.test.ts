import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { checkFrozen, freezeSelf, freezeStatic } from './freeze';

function world() {
  const scene = new THREE.Scene();
  const area = new THREE.Group();
  area.position.set(100, 0, 0);
  const scenery = new THREE.Group();
  const house = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  house.position.set(5, 2, 0);
  scenery.add(house);
  const freight = new THREE.Object3D();
  area.add(scenery, freight);
  scene.add(area);
  return { scene, area, scenery, house, freight };
}

describe('freezeStatic', () => {
  it('computes world matrices once, then later frames skip recomposing and remultiplying them', () => {
    const { scene, area, scenery, house } = world();
    freezeSelf(scene);
    freezeSelf(area);
    freezeStatic(scenery);
    expect(new THREE.Vector3().setFromMatrixPosition(house.matrixWorld).toArray()).toEqual([105, 2, 0]);
    // A sentinel in the world matrix survives the per-frame update: nothing recomputed it.
    house.matrixWorld.elements[12] = 999;
    scene.updateMatrixWorld();
    expect(house.matrixWorld.elements[12]).toBe(999);
  });

  it('without freezeSelf on the container, its recompose would force the subtree again', () => {
    const { scene, area, scenery, house } = world();
    freezeSelf(scene);
    freezeStatic(scenery);
    house.matrixWorld.elements[12] = 999;
    scene.updateMatrixWorld();
    expect(house.matrixWorld.elements[12]).toBe(105);
    expect(area.matrixAutoUpdate).toBe(true);
  });

  it('keeps moving objects and late additions updating', () => {
    const { scene, area, scenery, freight } = world();
    freezeSelf(scene);
    freezeSelf(area);
    freezeStatic(scenery);
    freight.position.set(0, 0, 7);
    const late = new THREE.Object3D();
    late.position.set(1, 0, 0);
    scenery.add(late);
    scene.updateMatrixWorld();
    expect(freight.matrixWorld.elements[14]).toBe(7);
    expect(late.matrixWorld.elements[12]).toBe(101);
  });

  it('checkFrozen reports and repairs a frozen object moved without refreeze()', () => {
    const { scene, area, scenery, house } = world();
    freezeSelf(scene);
    freezeSelf(area);
    freezeStatic(scenery);
    expect(checkFrozen(scene)).toEqual([]);
    house.name = 'moved house';
    house.position.x = 6;
    const moved = checkFrozen(scene);
    expect(moved).toHaveLength(1);
    expect(moved[0]).toContain('moved house');
    scene.updateMatrixWorld();
    expect(house.matrixWorld.elements[12]).toBe(106);
    expect(checkFrozen(scene)).toEqual([]);
  });
});
