import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { lonLatToScene } from '../core/places';
import type { RoutesFile } from '../model/types';
import { roadWidth } from '../terrain/transport-data';
import { pointInRing, segDist, type P2 } from '../vignette/geom';
import { buildStreetcarTrack, poleBlocked, roadSurface, STREETCAR_ROUTE, streetcarLines, withoutTram } from './streetcar';

const origin = { lon: -84.3916, lat: 33.7539 };
const data = (p: string) => new URL('../../public/data/' + p, import.meta.url);
const ready = existsSync(data('ga/routes.json')) && existsSync(data('scene/downtown/vignette.json'));

it.skipIf(!ready)('lays one track network over every GTFS streetcar shape', () => {
  const rf: RoutesFile = JSON.parse(readFileSync(data('ga/routes.json')).toString());
  const lines = streetcarLines(rf, origin);
  expect(lines.length).toBeGreaterThan(0);
  for (const path of rf.paths.filter((p) => p.routeId === STREETCAR_ROUTE))
    for (let i = 0; i + 1 < path.coords.length; i += 2) {
      const [x, z] = lonLatToScene(origin, path.coords[i], path.coords[i + 1]);
      const d = Math.min(...lines.flatMap((l) => l.pts.slice(1).map((b, k) => segDist(x, z, l.pts[k], b))));
      expect(d).toBeLessThan(2.6);
    }
});

it.skipIf(!ready)('stands every downtown pole off the drawn roads, out of buildings and away from junctions', { timeout: 30000 }, () => {
  const rf: RoutesFile = JSON.parse(readFileSync(data('ga/routes.json')).toString());
  const vd = JSON.parse(readFileSync(data('scene/downtown/vignette.json')).toString());
  const track = buildStreetcarTrack(streetcarLines(rf, origin), vd.bounds, () => 0, poleBlocked(vd.roads, vd.buildings));
  expect(track.poles.length).toBeGreaterThan(40);
  const drivable = vd.roads.filter((r: { cls: string }) => !['footway', 'path', 'steps', 'pedestrian', 'cycleway'].includes(r.cls));
  for (const [x, z] of track.poles) {
    for (const road of drivable)
      for (let k = 1; k < road.pts.length; k++)
        expect(segDist(x, z, road.pts[k - 1], road.pts[k])).toBeGreaterThan(roadWidth(road) / 2 + 0.29);
    for (const b of vd.buildings) if (b.rings[0]?.length > 2) expect(pointInRing(x, z, b.rings[0] as P2[])).toBe(false);
  }
  track.dispose();
});

it('keeps the track on the street under the Connector viaduct, not on the motorway deck', () => {
  const street = { cls: 'secondary', pts: [[1100, -180], [1300, -180]] as P2[] };
  const viaduct = { cls: 'motorway', bridge: true, pts: [[1200, -300], [1200, -60]] as P2[] };
  const height = roadSurface([street, viaduct], ((_x: number, _z: number, road: { cls: string }) => (road.cls === 'motorway' ? 9 : 0.1)) as never, () => 0);
  expect(height(1200, -180)).toBeCloseTo(0.1, 6);
});

it('keeps tram runs in the data but marks them for the streetcar to draw', () => {
  const city = { terrainTransport: { version: 1, roads: [], rail: [{ cls: 'tram' }, { cls: 'standard_gauge' }] } };
  const out = withoutTram(city);
  expect(out.terrainTransport.rail).toHaveLength(2);
  expect(out.terrainTransport.rail.map((r) => (r as { replaced?: boolean }).replaced ?? false)).toEqual([true, false]);
  expect(city.terrainTransport.rail[0]).not.toHaveProperty('replaced');
});
