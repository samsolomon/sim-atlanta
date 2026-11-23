import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type { TerrainCity } from '../terrain/transport-data';
import { arterialTrafficRoutes } from './arterial-traffic-routes';
import { midtownArterialCorridors, type MidtownTrafficBoard } from './midtown-arterial-traffic';
import rows from '../../../pipeline/prototypes/square-board/midtown-rows.json';

const board = (row: string): MidtownTrafficBoard => ({
  city: JSON.parse(readFileSync(new URL(`../../../pipeline/prototypes/square-board/${row}/context.json`, import.meta.url)).toString()) as TerrainCity,
  roadHeight: () => 0,
});
const all = Object.keys(rows).map(board);

it('resolves every HPMS-matched Midtown run onto the drawn roads of the nine arterials', () => {
  const { corridors, skipped, bounds } = midtownArterialCorridors(all);
  expect(skipped).toBe(0);
  expect(corridors.map(c => c.id).sort()).toEqual(['10th Street', '14th Street', '17th Street', 'Juniper Street',
    'North Avenue', 'Peachtree Street', 'Piedmont Avenue', 'Spring Street', 'West Peachtree Street']);
  expect(bounds).toEqual({ minX: -1000, maxX: 1800, minZ: -5700, maxZ: -1700 });
  const routes = arterialTrafficRoutes(corridors, bounds!);
  expect(routes.length).toBeGreaterThan(20);
  // The one-way pairs follow OSM: Spring and Juniper south, West Peachtree and Piedmont north.
  const heading = (name: string) => {
    const corridor = corridors.find(c => c.id === name)!;
    const courses = arterialTrafficRoutes([corridor], bounds!);
    return Math.sign(courses.reduce((sum, c) => sum + c.line.pts.at(-1)![1] - c.line.pts[0][1], 0));
  };
  expect(heading('Spring Street')).toBe(1);
  expect(heading('Juniper Street')).toBe(1);
  expect(heading('West Peachtree Street')).toBe(-1);
  expect(heading('Piedmont Avenue')).toBe(-1);
});

it('uses only the rows that are mounted', () => {
  const { corridors, skipped } = midtownArterialCorridors([board('midtown-south')]);
  expect(skipped).toBeGreaterThan(100);
  for (const c of corridors) for (const r of c.runs) expect(r.road.pts.every(([, z]) => z >= -2500)).toBe(true);
  expect(midtownArterialCorridors([]).corridors).toEqual([]);
});
