import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type { TerrainCity } from '../terrain/transport-data';
import { arterialTrafficRoutes } from './arterial-traffic-routes';
import { midtownArterialCorridors, type MidtownTrafficBoard } from './midtown-arterial-traffic';
import rows from '../../../pipeline/prototypes/square-board/midtown-rows.json';

const board = (row: string): MidtownTrafficBoard => ({
  row,
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


it('builds signalised turns on the actual Midtown junction graph', async () => {
  const { arterialTurns } = await import('./arterial-turns');
  const { default: signals } = await import('./fixtures/midtown-signals.json');
  const { corridors, bounds } = midtownArterialCorridors(all);
  const routes = arterialTurns(arterialTrafficRoutes(corridors, bounds!), corridors, signals as [number,number][]);
  const turns = routes.filter(c => c.turnSignal);
  expect(turns).toHaveLength(20);
  for (const c of turns) {
    expect(c.roads).toHaveLength(c.line.pts.length-1);
    expect(c.roads.every(Boolean)).toBe(true);
    const source=routes.find(r=>!r.turnSignal && r.roads[0]===c.roads[0] && r.line.pts[0][0]===c.line.pts[0][0] && r.line.pts[0][1]===c.line.pts[0][1])!;
    const shared=source.signals!.find(s=>s.key===c.turnSignal!.key)!;
    expect(shared).toBeDefined();
    expect(c.turnSignal!.s).toBeLessThanOrEqual(shared.s);
    expect(c.signals!.filter(s=>s.key!==c.turnSignal!.key && Math.abs(s.s-c.turnSignal!.s)<30)).toEqual([]);
    expect(c.signals!.some(s => s.key === c.turnSignal!.key)).toBe(true);
  }
});

it('carries both directions of Peachtree through its name change and the R16 cut', () => {
  const station = board('brookwood-station');
  const r16: MidtownTrafficBoard = {
    row: 'r16', roadHeight: () => 0,
    city: {
      ...station.city, bounds: { ...station.city.bounds, minZ: -6500, maxZ: -5700 },
      roads: [{ cls: 'trunk', name: 'Peachtree Road Northeast', bridge: false, tunnel: false,
        pts: [[-197.1, -5700], [-204.32, -5723.07]] }],
    },
  };
  station.roadHeight = (_x,z) => z >= -5700 ? 11 : null;
  r16.roadHeight = (_x,z) => z < -5700 ? 12 : null;
  const { corridors, bounds, heights } = midtownArterialCorridors([station, r16]);
  const northRoad = r16.city.roads[0];
  expect(heights.get(northRoad)!(-197, -5699.8, northRoad)).toBe(11);
  expect(heights.get(northRoad)!(-197, -5700.2, northRoad)).toBe(12);
  const courses = arterialTrafficRoutes(corridors, bounds!);
  const crossing = courses.filter(c => c.roads.includes(r16.city.roads[0])
    && c.roads.some(r => r.name === 'Peachtree Street Northeast'));
  expect(crossing).toHaveLength(2);
  expect(crossing.map(c => Math.sign(c.line.pts.at(-1)![1] - c.line.pts[0][1])).sort()).toEqual([-1, 1]);
});
