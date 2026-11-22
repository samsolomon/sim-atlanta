import { Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { createHealey } from './healey';

const site: VBuilding = {
  id: 'eeb07e5a-dbed-4900-9314-e478769493ca',
  h: 62.7,
  floors: 16,
  rings: [
    [
      [191.28, -254.89],
      [178.21, -269.57],
      [130.69, -228.88],
      [142.33, -214.33],
      [143.33, -215.27],
      [154.2, -202.84],
      [165.75, -212.82],
      [167.36, -210.81],
      [190.84, -230.26],
      [203.39, -240.94],
    ],
  ],
};

it('splits the lidar roof levels on the Healey parcel and preserves its neighbors', () => {
  const neighbor = { ...site, id: 'broad-frontage' };
  const model = createHealey([site, neighbor], () => 0)!;
  expect(model.buildings).toEqual([neighbor]);
  // City x/z roof probes on the Forsyth slab, eastern lift house, low wing,
  // rotunda and connecting roof. A full-height parcel fails the last three.
  const roofAt = (x: number, z: number) => {
    const ray = new Raycaster(new Vector3(x, 100, z), new Vector3(0, -1, 0));
    return ray.intersectObjects(model.group.children)[0]?.point.y;
  };
  expect(roofAt(165.62, -253.52)).toBeCloseTo(63.6, 1);
  expect(roofAt(164.42, -238.01)).toBeGreaterThan(70);
  expect(roofAt(190.34, -243.1)).toBeCloseTo(10.95, 1);
  expect(roofAt(172.33, -228.46)).toBeCloseTo(11.05, 1);
  expect(roofAt(180.96, -236.38)).toBeCloseTo(6.75, 1);
  // Probe the coping outside the shaft, then shoot upward into a corbel
  // and the open soffit beside it on the Forsyth face.
  const underEave = (u: number, v: number, y: number, direction: number) => {
    const eye = new Vector3(
      178.21 - (47.52 / 62.56) * u + (40.69 / 62.56) * v,
      y,
      -269.57 + (40.69 / 62.56) * u + (47.52 / 62.56) * v
    );
    return new Raycaster(eye, new Vector3(0, direction, 0)).intersectObjects(model.group.children)[0]?.point.y;
  };
  const bay = 62.56 / 18;
  expect(underEave(bay * 1.5, -1.4, 80, -1)).toBeCloseTo(64.02, 2);
  expect(underEave(bay * 1.25, -1.12, 61, 1)).toBeLessThan(62.75);
  expect(underEave(bay * 1.5, -1.12, 61, 1)).toBeCloseTo(62.94, 2);
  expect(roofAt(122, -240)).toBeUndefined();
  model.setNight(1);
  expect((model.group.children[1] as Mesh).material).toMatchObject({ emissiveIntensity: 0.33 });
  model.setNight(0);
  expect((model.group.children[1] as Mesh).material).toMatchObject({ emissiveIntensity: 0 });
  expect(createHealey([neighbor], () => 0)).toBeNull();
  expect(createHealey([site], () => null)).toBeNull();
});

it('leaves a moved parcel to the generic renderer when the surveyed tower would miss it', () => {
  const shifted: VBuilding = { ...site, rings: site.rings.map((ring) => ring.map(([x, z]) => [x + 80, z])) };
  expect(createHealey([shifted], () => 0)).toBeNull();
});

it('raises the Forsyth display sills above the local sidewalk while keeping the shaft level', () => {
  // The western frontage is 1.35 m higher than the lowest rear corner.
  const model = createHealey([site], (x, z) =>
    ((x - 178.21) * 40.69) / 62.56 + ((z + 269.57) * 47.52) / 62.56 < 5 ? 1.35 : 0
  )!;
  const u = 4,
    v = -2;
  const normal = new Vector3(40.69 / 62.56, 0, 47.52 / 62.56);
  const hit = (y: number) =>
    new Raycaster(
      new Vector3(
        178.21 - (47.52 / 62.56) * u + (40.69 / 62.56) * v,
        y,
        -269.57 + (40.69 / 62.56) * u + (47.52 / 62.56) * v
      ),
      normal
    ).intersectObjects(model.group.children)[0]?.distance;
  expect(hit(1.5)).toBeCloseTo(1.98, 2); // stone below the display sill
  expect(hit(2.1)).toBeCloseTo(1.88, 2); // glazing just above it
});
