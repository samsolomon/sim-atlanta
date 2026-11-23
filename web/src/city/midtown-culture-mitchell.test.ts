import { expect, it } from 'vitest';
import { Box3 } from 'three';
import { readFileSync } from 'node:fs';
import type { VBuilding } from '../vignette/world';
import { createMitchellHouse, mitchellId } from './midtown-culture-mitchell';

const archive = new URL('../../../pipeline/prototypes/square-board/midtown-central/context.json', import.meta.url);
const buildings: VBuilding[] = JSON.parse(readFileSync(archive, 'utf8')).buildings;
const site = buildings.find(b => b.id === mitchellId)!;
// A west-to-east rise like the 3DEP lawn: Crescent sits about 3 m below Peachtree.
const slope = (x: number) => 300 + (x - 637) * 0.12;
// foundation() in terrain/model.ts passes the floored minimum perimeter ground.
const datum = Math.floor(Math.min(...site.rings[0].map(([x]) => slope(x))));

it('replaces only the archived Crescent Apartments footprint, grounded below grade', () => {
  expect(site).toBeDefined();
  const model = createMitchellHouse(buildings, site, datum, x => slope(x))!;
  expect(model.buildings).toHaveLength(buildings.length - 1);
  expect(model.buildings).not.toContain(site);
  const box = new Box3().setFromObject(model.group);
  // The plinth reaches below the lowest perimeter ground; ridge and chimney sit ~15 m up.
  expect(box.min.y).toBeLessThan(datum + 0.01);
  expect(box.max.y - slope(637)).toBeGreaterThan(14);
  expect(box.max.y - slope(637)).toBeLessThan(20);
});

it('stands the east garden lamp on the rising lawn instead of a porch datum', () => {
  const flat = new Box3().setFromObject(createMitchellHouse(buildings, site, 299, () => 300)!.group);
  const steep = new Box3().setFromObject(createMitchellHouse(buildings, site, 299, x => (x > 658 && x < 661 ? 330 : 300))!.group);
  // Only the east lamp (x 659.35) samples this mound, so it alone lifts the top above the chimney.
  expect(steep.max.y - 300).toBeGreaterThan(32);
  expect(flat.max.y - 300).toBeLessThan(20);
});

it('declines without a datum, ground, or a single ring', () => {
  expect(createMitchellHouse(buildings, site, null, () => 0)).toBeNull();
  expect(createMitchellHouse(buildings, site, 0, () => null)).toBeNull();
  // West threshold is on the board, but the lawn stair sample is not.
  expect(createMitchellHouse(buildings, site, 0, x => (x < 660 ? 0 : null))).toBeNull();
  expect(createMitchellHouse(buildings, { ...site, rings: [...site.rings, site.rings[0]] }, 0, () => 0)).toBeNull();
  const other = buildings.find(b => b.id !== mitchellId)!;
  expect(createMitchellHouse(buildings, other, 0, () => 0)).toBeNull();
});
