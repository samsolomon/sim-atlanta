import * as THREE from 'three';
import { expect, it } from 'vitest';
import { CityFreight } from './freight';

it('follows both trucks across joined treads and clips a car at a mapped cover gap', () => {
  const point = (s: number) => ({ s, position: new THREE.Vector3(s, s * .02, 0) });
  const freight = new CityFreight([[point(30), point(0)], [point(30), point(100)], [point(350), point(400)]], []);
  const start = Date.parse('2026-11-20T19:12:02Z');
  const move = (head: number) => freight.update(start + head / 4.5 * 1000);
  move(42);
  const lead = freight.group.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
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
