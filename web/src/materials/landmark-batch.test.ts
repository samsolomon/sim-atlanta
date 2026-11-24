import { BoxGeometry, Group, Mesh, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { batchLandmarkBodies, StaticLandmarkMaterial } from './landmark-batch';

it('batches nearby static shells in world space and keeps a custom skin and a distant shell separate', () => {
  function landmark(x: number) {
    const group = new Group();
    group.position.set(x, 10, 20);
    group.rotation.y = .3;
    const body = new Mesh(new BoxGeometry().toNonIndexed(), new StaticLandmarkMaterial());
    body.castShadow = body.receiveShadow = true;
    group.add(body);
    return { group, body };
  }
  const sites = [10, 20, 30, 1100].map(landmark);
  sites[2].body.material.onBeforeCompile = () => {};
  const source = sites[1].body;
  const expected = source.localToWorld(new Vector3().fromBufferAttribute(source.geometry.attributes.position, 0));
  const batch = batchLandmarkBodies(sites.map(s => s.group));
  expect(batch.children).toHaveLength(1);
  const mesh = batch.children[0] as Mesh;
  const positions = mesh.geometry.attributes.position;
  expect(positions.count).toBe(72);
  expect(new Vector3().fromBufferAttribute(positions, 36).distanceTo(expected)).toBeLessThan(.00001);
  expect(mesh.castShadow && mesh.receiveShadow).toBe(true);
  expect(sites.map(s => s.group.children.length)).toEqual([0, 0, 1, 1]);
});
