import * as THREE from 'three';
import { expect, it } from 'vitest';
import { CityFreight, DOWNTOWN_ENTRY_MS, DOWNTOWN_SLOT_MS } from './freight';
import { FREIGHT_LENGTH } from '../vignette/freight-stock';
import { FREIGHT_CLIP_PLANES } from './freight-batches';

const point = (s: number, rise = .02) => ({ s, position: new THREE.Vector3(s, s * rise, 0) });
/** Slot 0 runs up the chainage from the first section's start. */
const at = (head: number) => DOWNTOWN_ENTRY_MS + head / 4.5 * 1000;

it('follows both trucks across joined treads and clips a car at a mapped cover gap', () => {
  const freight = new CityFreight([[point(30), point(0)], [point(30), point(100)], [point(350), point(400)]], []);
  const lead = freight.poses.children[0] as THREE.Object3D & { material: THREE.MeshLambertMaterial };
  const leadLength = FREIGHT_LENGTH[freight.passage(0).units[0].kind];
  freight.update(at(42));
  expect(lead.userData.trainId).toBe('illustrative:freight:downtown');
  expect(lead.position.x).toBeCloseTo(42 - leadLength / 2);
  expect(lead.position.y).toBeCloseTo(lead.position.x * .02);
  // The lead faces the direction of travel (+x here).
  expect(new THREE.Vector3(0, 0, 1).applyQuaternion(lead.quaternion).x).toBeGreaterThan(.99);
  // Materials are padded to FREIGHT_CLIP_PLANES with planes that never clip; count the real ones.
  const real = () => lead.material.clippingPlanes!.filter(p => p.constant < 1e5);
  expect(lead.material.clippingPlanes).toHaveLength(FREIGHT_CLIP_PLANES);
  expect(real()).toHaveLength(0); // crosses the joined seam
  freight.update(at(108));
  expect(lead.visible).toBe(true);
  expect(real()).toHaveLength(1);
  expect(real()[0].distanceToPoint(point(101).position)).toBeLessThan(0);
  freight.update(at(310));
  // Nothing is drawn wholly inside the cover between 100 m and 350 m.
  for (const car of freight.poses.children.filter(c => c.visible)) {
    const half = car.userData.lengthM / 2;
    expect(car.position.x - half < 100 || car.position.x + half > 350).toBe(true);
  }
  freight.update(at(42));
  expect(lead.position.x).toBeCloseTo(42 - leadLength / 2); // clock rewind
  freight.dispose();
  expect(freight.group.children).toHaveLength(0);
});

it('runs odd slots the other way with the lead still facing forward', () => {
  const freight = new CityFreight([[point(0, 0), point(2000, 0)]], []);
  freight.update(DOWNTOWN_ENTRY_MS + DOWNTOWN_SLOT_MS + 100 / 4.5 * 1000);
  const lead = freight.poses.children[0];
  const leadLength = FREIGHT_LENGTH[freight.passage(1).units[0].kind];
  expect(lead.visible).toBe(true);
  expect(lead.position.x).toBeCloseTo(2000 - 100 + leadLength / 2);
  expect(new THREE.Vector3(0, 0, 1).applyQuaternion(lead.quaternion).x).toBeLessThan(-.99);
  freight.dispose();
});

it('does not expose an 11 m sliver just because the consist can include a shorter switcher', () => {
  for (const length of [11, 12]) {
    const freight = new CityFreight([[point(0, 0), point(length, 0)]], []);
    freight.update(at(10));
    expect(freight.visibleCars).toBe(length === 11 ? 0 : 1);
    freight.dispose();
  }
});

it('draws one instanced batch per car kind and clip material, matching every visible pose', () => {
  const tracks = [[point(0), point(150)], [point(180), point(350)]];
  const freight = new CityFreight(tracks, []);
  const matrix = new THREE.Matrix4();
  try {
    for (const head of [140, 190, 280, 700, 140]) {
      freight.update(at(head));
      const batches = freight.group.children.filter((mesh): mesh is THREE.InstancedMesh =>
        mesh instanceof THREE.InstancedMesh && mesh.visible);
      const count = batches.reduce((sum, mesh) => sum + mesh.count, 0);
      expect(count).toBe(freight.visibleCars);
      expect(freight.draws).toBe(batches.length);
      const kinds = new Set(freight.passage(0).units.map(u => u.kind));
      expect(batches.length).toBeLessThanOrEqual(kinds.size * 2 * tracks.length);
      for (const car of freight.poses.children.filter(c => c.visible) as (THREE.Object3D & { material: THREE.Material })[]) {
        car.updateMatrix();
        expect(batches.some(batch => batch.material === car.material && Array.from({ length: batch.count }, (_, i) => {
          batch.getMatrixAt(i, matrix);
          return matrix.elements.every((v, j) => Math.abs(v - car.matrix.elements[j]) < .0001);
        }).some(Boolean))).toBe(true);
      }
    }
  } finally {
    freight.dispose();
  }
});

it('gives every freight material the same clipping-plane count, so instanced freight shares one program', () => {
  const freight = new CityFreight([[point(0), point(150)], [point(180), point(350)]], [new THREE.Plane(new THREE.Vector3(1, 0, 0), 10)]);
  for (const head of [20, 160, 300]) {
    freight.update(at(head));
    for (const mesh of freight.group.children.filter((m): m is THREE.InstancedMesh => m instanceof THREE.InstancedMesh)) {
      expect((mesh.material as THREE.Material).clippingPlanes).toHaveLength(FREIGHT_CLIP_PLANES);
    }
  }
  freight.dispose();
});
