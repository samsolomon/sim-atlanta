import { expect, it } from 'vitest';
import { Box3, Mesh } from 'three';
import { readFileSync } from 'node:fs';
import type { VBuilding } from '../vignette/world';
import { createRhodesHall, rhodesHallId } from './midtown-culture-rhodes';
const buildings: VBuilding[] = JSON.parse(
  readFileSync(
    new URL('../../../pipeline/prototypes/square-board/brookwood-south/context.json', import.meta.url),
    'utf8',
  ),
).buildings;
const site = buildings.find((b) => b.id === rhodesHallId)!;
it('claims the archived Rhodes footprint, keeps the tower in bounds and carves the entrance stairs', () => {
  const model = createRhodesHall(buildings, site, 299, () => 300)!;
  expect(model.buildings).toEqual(buildings.filter((b) => b !== site));
  const bounds = new Box3().setFromObject(model.group, true);
  expect(bounds.max.y).toBeCloseTo(322.65, 1);
  expect(bounds.min.x).toBeGreaterThan(280);
  expect(bounds.max.x).toBeLessThan(320);
  expect(model.yields).toHaveLength(1);
  expect(model.yields[0].floor(308.1, -4661)).toBeLessThan(300.675);
  model.setNight(1);
  expect((model.group.children[1] as Mesh).material).toHaveProperty('emissiveIntensity', 0.75);
  const shell = model.group.children[0] as Mesh;
  const wash = shell.geometry.getAttribute('aRhodesWash');
  const positions = shell.geometry.getAttribute('position');
  let towerPeak = 0;
  let porchEdgeVertices = 0;
  for (let i = 0; i < positions.count; i++) {
    if (positions.getX(i) < -1) towerPeak = Math.max(towerPeak, wash.getX(i));
    // The western porch beam overlaps the spatial tower mask; retain its old wash.
    if (Math.abs(positions.getX(i) + 0.3) < 0.001 && Math.abs(positions.getY(i) - 5.475) < 0.001) {
      expect(wash.getX(i)).toBeCloseTo(1 - 5.475 / 30, 5);
      porchEdgeVertices++;
    }
  }
  expect(porchEdgeVertices).toBeGreaterThan(0);
  // Fixture plinth extends 1 m below grade; original tower peak was 31/30.
  expect(towerPeak).toBeCloseTo(0.775, 5);
  // The roof ridge sits behind the tower: floodlighting must not light that roof.
  for (let i = 0; i < positions.count; i++)
    if (positions.getZ(i) < 0 && positions.getY(i) >= 15) expect(wash.getX(i)).toBe(0);
  model.setNight(0);
  expect((model.group.children[1] as Mesh).material).toHaveProperty('emissiveIntensity', 0);
});
it('leaves the generic building intact when the footprint or terrain cannot support the model', () => {
  expect(createRhodesHall(buildings, site, null, () => 300)).toBeNull();
  expect(createRhodesHall(buildings, site, 299, () => null)).toBeNull();
  expect(createRhodesHall(buildings, { ...site, id: 'other' }, 299, () => 300)).toBeNull();
  expect(
    createRhodesHall(
      buildings,
      {
        ...site,
        rings: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
          ],
        ],
      },
      299,
      () => 300,
    ),
  ).toBeNull();
});
