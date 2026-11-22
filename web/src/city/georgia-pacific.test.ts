import { Box3, Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { createGeorgiaPacific } from './georgia-pacific';

const tower: VBuilding = {
  id: '15576641-5f10-4b9b-b977-994a51489be1',
  h: 50,
  floors: 14,
  rings: [
    [
      [395.87, -412.92],
      [375.96, -375.87],
      [443.47, -375.49],
      [443.57, -387.73],
      [452.93, -387.72],
      [452.94, -399.74],
      [462.31, -399.67],
      [462.42, -412.56],
    ],
  ],
};
const north: VBuilding = {
  id: '84f5c9e9-115a-4d7c-ba20-332260a2b85e',
  h: 207,
  floors: null,
  rings: [
    [
      [413.79, -412.89],
      [413.79, -436.03],
      [404.62, -436.27],
      [404.34, -412.91],
    ],
  ],
};
const deck = { ...north, id: '2953e41b-652e-4264-963d-8bfc026bcb2a', h: 22.26 };

it('steps down toward the east and retains each separate footprint at the north', () => {
  const site = createGeorgiaPacific([tower, north, deck], () => 3)!;
  expect(site.buildings).toEqual([{ ...north, h: 10 }, deck]);
  expect(site.buildings[1]).toBe(deck);
  expect(north.h).toBe(207);
  const { group } = site;
  group.updateMatrixWorld(true);
  expect(new Box3().setFromObject(group).max.y).toBeCloseTo(215.5);
  function roofHeight(x: number, z: number) {
    const ray = new Raycaster(new Vector3(x, 300, z), new Vector3(0, -1, 0));
    return ray.intersectObject(group)[0]?.point.y - group.position.y;
  }
  expect(roofHeight(390, -382)).toBeCloseTo(210.7);
  expect(roofHeight(411, -382)).toBeGreaterThan(199.2);
  expect(roofHeight(421, -382)).toBeCloseTo(154.6);
  expect(roofHeight(430, -382)).toBeCloseTo(110.7);
  expect(roofHeight(440, -382)).toBeCloseTo(66.7);
  expect(roofHeight(440, -407)).toBeCloseTo(154.6);
  const revised = { ...north, h: 13 };
  expect(createGeorgiaPacific([tower, revised], () => 3)!.buildings[0]).toBe(revised);
  expect(createGeorgiaPacific([north], () => 3)).toBeNull();
  expect(createGeorgiaPacific([tower], () => null)).toBeNull();
});

it('lights both sides of each terrace from below and keeps the recessed central grille dark', () => {
  const site = createGeorgiaPacific([tower], () => 0)!;
  const lights = site.group.getObjectByName('Eastern terrace uplights') as Mesh;
  function irradiance(z: number, height: number) {
    const ray = new Raycaster(new Vector3(475, height, z), new Vector3(-1, 0, 0));
    const hit = ray.intersectObject(lights)[0];
    const color = lights.geometry.getAttribute('color');
    const { a, b, c } = hit.face!;
    const weight = hit.barycoord!;
    return color.getY(a) * weight.x + color.getY(b) * weight.y + color.getY(c) * weight.z;
  }
  site.setNight(1);
  expect(lights.visible).toBe(true);
  // Cross the three east-facing planes just above the second terrace, between louver rows.
  const grille = irradiance(-394, 69);
  for (const z of [-379, -403]) {
    expect(irradiance(z, 69)).toBeGreaterThan(3 * grille);
    expect(irradiance(z, 69)).toBeGreaterThan(2 * irradiance(z, 106));
  }
  expect(irradiance(-394, 202)).toBeGreaterThan(3 * grille);
  site.setNight(0);
  expect(lights.visible).toBe(false);
});
