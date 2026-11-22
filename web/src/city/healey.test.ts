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
  expect(roofAt(122, -240)).toBeUndefined();
  model.setNight(1);
  expect((model.group.children[1] as Mesh).material).toMatchObject({ emissiveIntensity: 0.33 });
  model.setNight(0);
  expect((model.group.children[1] as Mesh).material).toMatchObject({ emissiveIntensity: 0 });
  expect(createHealey([neighbor], () => 0)).toBeNull();
  expect(createHealey([site], () => null)).toBeNull();
});
