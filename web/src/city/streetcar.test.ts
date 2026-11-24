import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { lonLatToScene } from '../core/places';
import type { RoutesFile } from '../model/types';
import { roadWidth } from '../terrain/transport-data';
import { pointInRing, segDist, type P2 } from '../vignette/geom';
import { streetcarShapes } from './streetcar-shape';
import { buildStreetcarTrack, poleBlocked, roadSurface, STREETCAR_ROUTE, streetcarLines, withoutTram } from './streetcar';

const origin = { lon: -84.3916, lat: 33.7539 };
const data = (p: string) => new URL('../../public/data/' + p, import.meta.url);
const ready = existsSync(data('ga/routes.json')) && existsSync(data('scene/downtown/vignette.json'));

it.skipIf(!ready)('lays one track network over every filleted streetcar shape the cars run on', () => {
  const rf: RoutesFile = JSON.parse(readFileSync(data('ga/routes.json')).toString());
  const lines = streetcarLines(rf, origin);
  expect(lines.length).toBeGreaterThan(0);
  const near = (x: number, z: number) => Math.min(...lines.flatMap((l) => l.pts.slice(1).map((b, k) => segDist(x, z, l.pts[k], b))));
  // Every point a car can stand on has a drawn rail under it, including the shared corners.
  for (const shape of streetcarShapes(rf, origin, STREETCAR_ROUTE)) for (const [x, z] of shape.pts) expect(near(x, z), `${shape.id} at ${x.toFixed(0)},${z.toFixed(0)}`).toBeLessThan(2.6);
  // Raw GTFS vertices stay under the track, except at a filleted corner, which the arc cuts by its shift.
  const corners = streetcarShapes(rf, origin, STREETCAR_ROUTE).flatMap((s) => s.corners);
  for (const path of rf.paths.filter((p) => p.routeId === STREETCAR_ROUTE))
    for (let i = 0; i + 1 < path.coords.length; i += 2) {
      const [x, z] = lonLatToScene(origin, path.coords[i], path.coords[i + 1]);
      const cut = corners.find((c) => Math.hypot(c.at[0] - x, c.at[1] - z) < c.shift + 25);
      expect(near(x, z), `raw ${path.id} at ${x.toFixed(0)},${z.toFixed(0)}`).toBeLessThan(cut ? cut.shift + 2.6 : 2.6);
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

it.skipIf(!ready)('draws the seam between two boards exactly once, with no gap', () => {
  const rf: RoutesFile = JSON.parse(readFileSync(data('ga/routes.json')).toString());
  const lines = streetcarLines(rf, origin);
  const open = () => false;
  const whole = buildStreetcarTrack(lines, { minX: -1000, maxX: 1800, minZ: -1300, maxZ: 700 }, () => 0, open);
  const west = buildStreetcarTrack(lines, { minX: -1000, maxX: 1000, minZ: -1300, maxZ: 700 }, () => 0, open);
  const east = buildStreetcarTrack(lines, { minX: 1000, maxX: 1800, minZ: -1300, maxZ: 700 }, () => 0, open);
  const count = (t: typeof whole, i: number) => (t.group.children[i] as import('three').Mesh).geometry.getAttribute('position').count;
  // Wires: the halves add up exactly to the whole.
  expect(count(west, 1) + count(east, 1)).toBe(count(whole, 1));
  // Track and poles too: no segment or pole is lost or drawn twice at x = 1000.
  expect(count(west, 0) + count(east, 0)).toBe(count(whole, 0));
  expect(west.poles.length + east.poles.length).toBe(whole.poles.length);
  for (const t of [whole, west, east]) t.dispose();
});
