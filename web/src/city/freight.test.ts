import * as THREE from 'three';
import { expect, it } from 'vitest';
import { CityFreight } from './freight';

it('follows both trucks across joined treads and clips a car at a mapped cover gap', () => {
  const point = (s: number) => ({ s, position: new THREE.Vector3(s, s * .02, 0) });
  const freight = new CityFreight([[point(30), point(0)], [point(30), point(100)], [point(350), point(400)]], []);
  const start = Date.parse('2026-11-20T19:12:02Z');
  const move = (head: number) => freight.update(start + head / 4.5 * 1000);
  move(42);
  const lead = freight.poses.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
  expect(lead.userData.trainId).toBe('illustrative:freight:downtown');
  expect(lead.position.x).toBeCloseTo(42 - 22.3 / 2);
  expect(lead.position.y).toBeCloseTo(lead.position.x * .02);
  expect(new THREE.Vector3(0, 0, 1).applyQuaternion(lead.quaternion).x).toBeGreaterThan(.99);
  expect(lead.material.clippingPlanes).toHaveLength(0); // crosses the joined seam
  move(108);
  expect(lead.visible).toBe(true);
  expect(lead.material.clippingPlanes).toHaveLength(1);
  expect(lead.material.clippingPlanes![0].distanceToPoint(point(101).position)).toBeLessThan(0);
  move(310);
  expect(freight.visibleCars).toBe(0); // entire consist under cover
  move(42);
  expect(lead.position.x).toBeCloseTo(42 - 22.3 / 2); // clock rewind
  freight.dispose();
  expect(freight.group.children).toHaveLength(0);
});

it('does not expose an 11 m sliver just because the lab adds a shorter switcher', () => {
  const point = (s: number) => ({ s, position: new THREE.Vector3(s, 0, 0) });
  const start = Date.parse('2026-11-20T19:12:02Z');
  for (const length of [11, 12]) {
    const freight = new CityFreight([[point(0), point(length)]], []);
    freight.update(start + 10 / 4.5 * 1000);
    expect(freight.visibleCars).toBe(length === 11 ? 0 : 1);
    freight.dispose();
  }
});

it('batches only cars sharing a shape and clip planes, preserving their pick and follow poses', () => {
  const point = (s: number) => ({ s, position: new THREE.Vector3(s, s * .02, 0) });
  const tracks = [[point(0), point(150)], [point(180), point(350)]];
  const high = new CityFreight(tracks, [], true);
  const low = new CityFreight(tracks, [], false);
  const matrix = new THREE.Matrix4();
  const start = Date.parse('2026-11-20T19:12:02Z');
  try {
    for (const head of [140, 190, 280, 700, 140]) {
      for (const train of [high, low]) train.update(start + head / 4.5 * 1000);
      const batches = high.group.children.filter((mesh): mesh is THREE.InstancedMesh =>
        mesh instanceof THREE.InstancedMesh && mesh.visible);
      const count = batches.reduce((sum, mesh) => sum + mesh.count, 0);
      expect(count).toBe(low.visibleCars);
      if (head === 140) expect(batches.length).toBeLessThan(count);
      expect(high.visibleCars).toBe(count);
      const drawn = batches.flatMap(batch => Array.from({ length: batch.count }, (_, i) => {
        batch.getMatrixAt(i, matrix);
        return { material: batch.material, matrix: matrix.clone() };
      }));
      const visible = high.poses.children.filter(car => car.visible);
      for (const [index, car] of low.poses.children.filter(car => car.visible).entries()) {
        car.updateMatrix();
        expect(visible[index].matrix.elements).toEqual(car.matrix.elements);
        expect(drawn.some(instance => instance.material === (visible[index] as THREE.Mesh).material &&
          instance.matrix.elements.every((v, j) => Math.abs(v - car.matrix.elements[j]) < .0001))).toBe(true);
      }
    }
  } finally {
    high.dispose();
    low.dispose();
  }
});
