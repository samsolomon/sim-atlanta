import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { groundLiftedParts, MIN_LIFT_M, type Part } from './parts';

const south = JSON.parse(readFileSync(new URL('../../../pipeline/prototypes/square-board/midtown-south/context.json', import.meta.url), 'utf8'));
const find = (id: string) => south.buildings.find((b: { id: string }) => b.id === id) as { parts: Part[] };

it('stands Norfolk Southern headquarters’ floating roof slabs on grade', () => {
  const parts = find('osm:way:1344630139').parts;
  // OSM maps the 13- and 20-level towers only as roof slabs over small cores.
  expect(parts.filter((p) => (p.minH ?? 0) >= 44).length).toBe(6);
  const grounded = groundLiftedParts(parts);
  for (const [i, p] of grounded.entries()) {
    expect(p.h).toBe(parts[i].h);
    if ((parts[i].minH ?? 0) >= MIN_LIFT_M) expect(p.minH, String(parts[i].id)).toBe(0);
    else expect(p.minH).toBe(parts[i].minH);
  }
  // The input is not mutated.
  expect(parts.filter((p) => (p.minH ?? 0) >= 44).length).toBe(6);
});

it('keeps low canopies and marquees lifted, such as the Fox Theatre marquee', () => {
  const fox = find('osm:way:208355446').parts;
  expect(fox.some((p) => (p.minH ?? 0) > 0)).toBe(true);
  expect(groundLiftedParts(fox)).toEqual(fox);
});

it('leaves supported lifted parts and skybridges as mapped', () => {
  const sq = (x0: number, z0: number, x1: number, z1: number) => [[[x0, z0], [x1, z0], [x1, z1], [x0, z1]]] as Part['rings'];
  const towerA = { rings: sq(0, 0, 20, 20), h: 80 }, towerB = { rings: sq(60, 0, 80, 20), h: 80 };
  const bridge = { rings: sq(15, 8, 65, 12), h: 34, minH: 30 };
  const setback = { rings: sq(2, 2, 18, 18), h: 95, minH: 80 };
  const parts = [towerA, towerB, bridge, setback];
  expect(groundLiftedParts(parts)).toEqual(parts);
  // A slab with nothing beneath it settles on the tallest part it overlaps, or on grade.
  const roof: Part = { rings: sq(100, 0, 130, 20), h: 60.6, minH: 60 }, podium: Part = { rings: sq(95, -5, 140, 30), h: 18 };
  expect(groundLiftedParts([podium, roof])[1].minH).toBe(18);
  expect(groundLiftedParts([roof])[0].minH).toBe(0);
});
