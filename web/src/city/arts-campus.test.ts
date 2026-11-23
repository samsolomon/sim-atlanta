import { expect, it } from 'vitest';
import { Box3, BufferGeometry, Mesh } from 'three';
import { readFileSync } from 'node:fs';
import type { VBuilding } from '../vignette/world';
import { Builder } from '../vignette/geom';
import { createArtsCampusLandmark } from './arts-campus';
import { entryRamp, type RampSpec } from './midtown-culture-high';
import sites from './fixtures/arts-campus.json';

const archive = new URL('../../../pipeline/prototypes/square-board/midtown-upper/context.json', import.meta.url);
const buildings: VBuilding[] = JSON.parse(readFileSync(archive, 'utf8')).buildings;
const museum = buildings.find((b) => b.id === sites.museum.id)!;

const spec: RampSpec = {
  foot: [40, 0],
  head: [0, 0],
  stairTop: [0, 2.2],
  stairFoot: [12, 2.2],
  width: 2.6,
};

function bounds(b: Builder) {
  return new Box3().setFromObject(new Mesh(b.geometry() as BufferGeometry));
}

it('climbs from the sidewalk to the entry terrace and steps back down to the lawn', () => {
  const body = new Builder();
  // The lawn sits 6 m below the terrace, like the 3DEP reading at Peachtree.
  expect(entryRamp(body, spec, 2.3, () => -3.7)).toBe(true);
  const box = bounds(body);
  // Parapets reach below the sidewalk; rails stand about 1.1 m over the terrace.
  expect(box.min.y).toBeLessThan(-3.7);
  expect(box.max.y).toBeGreaterThan(2.3 + 1);
  expect(box.max.y).toBeLessThan(2.3 + 1.3);
});

it('skips the ramp, not the museum, when its ground is missing', () => {
  expect(entryRamp(new Builder(), spec, 2.3, () => null)).toBe(false);
  // Ground exists at the piazza entrance but not out at the Peachtree foot.
  const model = createArtsCampusLandmark(buildings, museum, 290, (x) => (x > 620 ? null : 294.1));
  expect(model).not.toBeNull();
});

it('keeps the mapped ramp outside the museum footprint and on Peachtree', () => {
  const { foot, head } = sites.museum.ramp;
  // About 48 m from the Peachtree sidewalk to the entry landing.
  expect(Math.hypot(foot[0] - head[0], foot[1] - head[1])).toBeGreaterThan(45);
  expect(Math.hypot(foot[0] - head[0], foot[1] - head[1])).toBeLessThan(52);
});
