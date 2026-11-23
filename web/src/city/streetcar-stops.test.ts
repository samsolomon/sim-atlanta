import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type { RoutesFile } from '../model/types';
import { pointInRing, segDist, type P2 } from '../vignette/geom';
import { streetcarLines } from './streetcar';
import { buildStreetcarStops, PLATFORM_GAP, platformSites, SIDE, streetcarStops } from './streetcar-stops';

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

it.skipIf(!ready)('keeps every platform edge clear of the track and every platform out of buildings', () => {
  const { rf, stops } = load();
  expect(stops).toHaveLength(12);
  // Every served stop has a surveyed side, so a renamed stop cannot fall back silently.
  for (const s of stops) expect(SIDE[s.name], s.name).toBeDefined();
  const lines = streetcarLines(rf, origin);
  const vd = JSON.parse(readFileSync(data('scene/downtown/vignette.json')).toString());
  const east = existsSync(data('scene/sweet-auburn/context.json'))
    ? JSON.parse(readFileSync(data('scene/sweet-auburn/context.json')).toString()).buildings
    : [];
  const sites = platformSites(stops, lines, vd.roads);
  for (const site of sites) {
    const nx = -site.dz * site.side,
      nz = site.dx * site.side;
    // The boarding edge, every metre along the platform and its ramps, clears the track.
    for (let u = -15; u <= 15; u += 1) {
      const v = site.off - 1.5;
      const x = site.track.x + site.dx * u + nx * v,
        z = site.track.z + site.dz * u + nz * v;
      const d = Math.min(...lines.flatMap((l) => l.pts.slice(1).map((b, k) => segDist(x, z, l.pts[k], b))));
      expect(d, `${site.name} at u=${u}`).toBeGreaterThan(PLATFORM_GAP - 0.01);
    }
    // On its surveyed side of the track.
    const want = SIDE[site.name];
    expect((site.x - site.track.x) * want[0] + (site.z - site.track.z) * want[1]).toBeGreaterThan(1.5);
    // Not inside a building on whichever board holds it.
    for (const b of site.x < 1000 ? vd.buildings : east)
      if (b.rings[0]?.length > 2) expect(pointInRing(site.x, site.z, b.rings[0] as P2[]), site.name).toBe(false);
  }
});

it.skipIf(!ready)('splits the stops between boards at x = 1000 with none lost or doubled, and pylons only where seen', () => {
  const { rf, stops } = load();
  const sites = platformSites(stops, streetcarLines(rf, origin), []);
  const west = buildStreetcarStops(sites, { minX: -1000, maxX: 1000, minZ: -1300, maxZ: 700 }, () => 0);
  const east = buildStreetcarStops(sites, { minX: 1000, maxX: 1800, minZ: -1300, maxZ: 700 }, () => 0);
  expect([...west.drawn, ...east.drawn].sort()).toEqual(stops.map((s) => s.name).sort());
  expect(east.drawn.sort()).toEqual(['DOBBS PLAZA', 'EDGEWOOD AVE @ HILLIARD ST', 'KING HISTORIC DISTRICT', 'SWEET AUBURN MARKET'].sort());
  // Navy pylons only where Street View showed one.
  expect([...west.pylons, ...east.pylons].sort()).toEqual(['PARK PLACE', 'SWEET AUBURN MARKET']);
  west.dispose();
  east.dispose();
});
