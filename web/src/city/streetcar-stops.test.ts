import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type { RoutesFile } from '../model/types';
import { pointInRing, type P2 } from '../vignette/geom';
import { streetcarLines } from './streetcar';
import { buildStreetcarStops, platformSites, streetcarStops } from './streetcar-stops';

const origin = { lon: -84.3916, lat: 33.7539 };
const data = (p: string) => new URL('../../public/data/' + p, import.meta.url);
const ready = existsSync(data('ga/routes.json')) && existsSync(data('ga/timetable.json')) && existsSync(data('scene/downtown/vignette.json'));
const load = () => {
  const rf: RoutesFile = JSON.parse(readFileSync(data('ga/routes.json')).toString());
  const tt = JSON.parse(readFileSync(data('ga/timetable.json')).toString()).timetables[0];
  const served = (pathId: string, stopId: string) =>
    tt.patterns.some((p: { pathId?: string; stops: string[] }) => p.pathId === pathId && p.stops.includes(stopId));
  return { rf, stops: streetcarStops(rf, origin, served) };
};

it.skipIf(!ready)('places all 12 platforms beside the track on their surveyed side, clear of buildings', () => {
  const { rf, stops } = load();
  expect(stops).toHaveLength(12);
  const vd = JSON.parse(readFileSync(data('scene/downtown/vignette.json')).toString());
  const sites = platformSites(stops, streetcarLines(rf, origin), vd.roads);
  const compass: Record<string, [number, number]> = {
    'DOBBS PLAZA': [0, -1], 'HURT PARK': [0, 1], 'PARK PLACE': [-1, 0], 'PEACHTREE CENTER STATION': [1, 0],
  };
  for (const site of sites) {
    // The platform centre stands 2.95 m off the track centreline (1.45 m gap + half its width).
    expect(Math.hypot(site.x - site.track.x, site.z - site.track.z)).toBeCloseTo(2.95, 3);
    const want = compass[site.name];
    if (want) expect((site.x - site.track.x) * want[0] + (site.z - site.track.z) * want[1]).toBeGreaterThan(2);
    for (const b of vd.buildings) if (b.rings[0]?.length > 2) expect(pointInRing(site.x, site.z, b.rings[0] as P2[])).toBe(false);
  }
});

it.skipIf(!ready)('splits the stops between boards at x = 1000 with none lost or doubled, and pylons only where seen', () => {
  const { rf, stops } = load();
  const sites = platformSites(stops, streetcarLines(rf, origin), []);
  const west = buildStreetcarStops(sites, { minX: -1000, maxX: 1000, minZ: -1300, maxZ: 700 }, () => 0);
  const east = buildStreetcarStops(sites, { minX: 1000, maxX: 1800, minZ: -1300, maxZ: 700 }, () => 0);
  expect([...west.drawn, ...east.drawn].sort()).toEqual(stops.map((s) => s.name).sort());
  expect(east.drawn.sort()).toEqual(['DOBBS PLAZA', 'EDGEWOOD AVE @ HILLIARD ST', 'KING HISTORIC DISTRICT', 'SWEET AUBURN MARKET'].sort());
  west.dispose();
  east.dispose();
});
