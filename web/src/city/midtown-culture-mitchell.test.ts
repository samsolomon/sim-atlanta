import { expect, it } from 'vitest';
import { Box3 } from 'three';
import { readFileSync } from 'node:fs';
import type { VBuilding } from '../vignette/world';
import { createMitchellHouse, mitchellId } from './midtown-culture-mitchell';

const archive = new URL('../../../pipeline/prototypes/square-board/midtown-central/context.json', import.meta.url);
const buildings: VBuilding[] = JSON.parse(readFileSync(archive, 'utf8')).buildings;
const site = buildings.find(b => b.id === mitchellId)!;

it('replaces only the archived Crescent Apartments footprint', () => {
  expect(site).toBeDefined();
  // A west-to-east rise like the 3DEP lawn: Crescent sits lower than Peachtree.
  const slope = (x: number) => (x - 648) * 0.1;
  const model = createMitchellHouse(buildings, site, slope(637) + 1, x => slope(x))!;
  expect(model.buildings).toHaveLength(buildings.length - 1);
  expect(model.buildings).not.toContain(site);
  const box = new Box3().setFromObject(model.group);
  // Ridge and chimney sit ~15 m above the Crescent threshold; the plinth reaches below grade.
  expect(box.max.y - box.min.y).toBeGreaterThan(14);
  expect(box.max.y - box.min.y).toBeLessThan(20);
});

it('declines without a datum, ground, or a single ring', () => {
  expect(createMitchellHouse(buildings, site, null, () => 0)).toBeNull();
  expect(createMitchellHouse(buildings, site, 0, () => null)).toBeNull();
  expect(createMitchellHouse(buildings, { ...site, rings: [...site.rings, site.rings[0]] }, 0, () => 0)).toBeNull();
  const other = buildings.find(b => b.id !== mitchellId)!;
  expect(createMitchellHouse(buildings, other, 0, () => 0)).toBeNull();
});
