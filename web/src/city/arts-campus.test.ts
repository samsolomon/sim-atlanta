import { expect, it } from 'vitest';
import { Box3, BufferGeometry, Mesh } from 'three';
import { readFileSync } from 'node:fs';
import type { VBuilding } from '../vignette/world';
import { Builder, pointInRing } from '../vignette/geom';
import { createArtsCampusLandmark } from './arts-campus';
import { entryRamp, siflyPiazza, type RampSpec } from './midtown-culture-high';
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
  const full = createArtsCampusLandmark(buildings, museum, 290, () => 294.1)!;
  // Ground exists at the piazza entrance but not out at the Peachtree foot (x 625).
  const clipped = createArtsCampusLandmark(buildings, museum, 290, (x) => (x > 620 ? null : 294.1))!;
  expect(clipped).not.toBeNull();
  // The ramp is the only geometry east of the 588 m footprint edge.
  expect(new Box3().setFromObject(full.group, true).max.x).toBeGreaterThan(620);
  expect(new Box3().setFromObject(clipped.group, true).max.x).toBeLessThan(600);
});

it('keeps the mapped ramp outside the museum footprint, rising toward it from Peachtree', () => {
  const { foot, head } = sites.museum.ramp;
  const ring = museum.rings[0];
  for (let t = 0; t <= 1; t += 0.05)
    expect(pointInRing(foot[0] + (head[0] - foot[0]) * t, foot[1] + (head[1] - foot[1]) * t, ring)).toBe(false);
  // The foot is nearer Peachtree (east) than the head, and the run is about 48 m.
  expect(foot[0]).toBeGreaterThan(head[0]);
  expect(Math.hypot(foot[0] - head[0], foot[1] - head[1])).toBeCloseTo(48.4, 0);
});

const piazza = (lawn: [number, number][]) => ({
  plan: sites.museum.piazza.plan as [number, number][],
  lawn,
  stair: sites.museum.piazza.stair as [[number, number], [number, number]],
  tables: [],
  benches: [],
});
const count = (b: Builder) => (b.geometry() as BufferGeometry).getAttribute('position').count;

it('leaves the mapped lawn unpaved and draws the north stair only where the ground falls', () => {
  const flat = new Builder(),
    noLawn = new Builder(),
    falling = new Builder();
  siflyPiazza(flat, piazza(sites.museum.piazza.lawn as [number, number][]), () => 0);
  siflyPiazza(noLawn, piazza([]), () => 0);
  // The mapped lawn is about 330 m², so paving it would add about 70 slabs.
  expect(count(noLawn) - count(flat)).toBeGreaterThan(60 * 8);
  // 3DEP falls about 3 m down the passage north of the piazza (v < -9).
  siflyPiazza(falling, piazza(sites.museum.piazza.lawn as [number, number][]), (_u, v) => (v < -15 ? -3 : 0));
  expect(count(falling)).toBeGreaterThan(count(flat));
});
