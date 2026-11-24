import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { pointInRing } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

const boards = ['north-band', 'north-corner', 'south-band', 'south-corner', 'midtown-south', 'midtown-central',
  'midtown-upper', 'brookwood-south', 'brookwood-station'];
const context = (board: string): VBuilding[] => JSON.parse(readFileSync(new URL(
  `../../../pipeline/prototypes/square-board/${board}/context.json`, import.meta.url), 'utf8')).buildings;
const top = (b: VBuilding) => b.parts?.length ? Math.max(...b.parts.map(p => p.h)) : b.h ?? (b.floors ?? 0) * 3.6;

it('gives every mapped building part a valid mass and truth tier', () => {
  let parts = 0;
  for (const board of boards) for (const b of context(board)) for (const part of b.parts ?? []) {
    parts++;
    expect(part.h, `${board} ${b.id} ${part.id}`).toBeGreaterThan(part.minH ?? 0);
    expect(['reported', 'inferred', 'illustrative']).toContain(part.tier);
    expect(part.rings[0].length).toBeGreaterThanOrEqual(3);
  }
  expect(parts).toBeGreaterThan(500);
});

it.each([
  ['osm:way:505414293', 'ICON Midtown over Whole Foods', 160],
  ['osm:way:1442889896', 'Mayfair Renaissance over its garage', 110],
  ['osm:way:536719882', '1280 West', 110],
  ['osm:way:1300600863', 'The Juniper', 110],
  ['osm:way:536739486', 'The Starling', 90],
  ['osm:way:536720728', 'Arts Center Tower', 70],
  ['osm:way:269843449', 'Parc Vue', 40],
])('raises %s (%s) from its mapped parts', (id, _name, metres) => {
  const b = context('midtown-upper').find(b => b.id === id)!;
  expect(top(b)).toBeGreaterThan(metres);
});

it('draws parts outside every outline as buildings that overlap no other footprint', () => {
  for (const board of boards) {
    const all = context(board);
    // An orphan part is a building whose only part is itself.
    for (const orphan of all.filter(b => b.parts?.length === 1 && b.parts[0].id === b.id.split('/')[0])) {
      const ring = orphan.rings[0], xs = ring.map(p => p[0]), zs = ring.map(p => p[1]);
      let inside = 0, shared = 0;
      for (let x = Math.min(...xs); x <= Math.max(...xs); x += 2) for (let z = Math.min(...zs); z <= Math.max(...zs); z += 2) {
        if (!pointInRing(x, z, ring)) continue;
        inside++;
        if (all.some(b => b !== orphan && pointInRing(x, z, b.rings[0]))) shared++;
      }
      expect(shared / inside, `${board} ${orphan.id}`).toBeLessThan(.1);
    }
  }
}, 30000);
