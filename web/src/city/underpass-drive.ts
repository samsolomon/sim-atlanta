import { type P2 } from '../vignette/geom';
import { alongOn, ribbons, sectionAt, stripePoint } from '../terrain/connector-corridor';
import { connectorTrafficRoutes, type TrafficLane } from './connector-traffic-routes';
import type { TerrainCity } from '../terrain/transport-data';

// Inspection cameras follow the same lane polylines as illustrative traffic.
// Capitol's in-board crossing carries two northbound interchange ramps.
const crossings: Record<string, [P2, P2]> = {
  baker: [
    [905, -938],
    [879, -923],
  ],
  courtland: [
    [691, -1172],
    [677, -1145],
  ],
  peachtree: [
    [570, -1293],
    [563, -1261],
  ],
  turner: [
    [326, -1459],
    [315, -1433],
  ],
  decatur: [
    [882, 453],
    [838, 452],
  ],
  mlk: [
    [613, 629],
    [581, 617],
  ],
  capitol: [
    [354, 1045],
    [354, 1029],
  ],
};

export function underpassDrive(query: URLSearchParams, city: TerrainCity) {
  const name = query.get('underpass') ?? '';
  if (!Object.hasOwn(crossings, name)) return;
  const second = query.get('dir') === 'sb' || query.get('dir') === 'outer';
  const [x, z] = crossings[name][+second];
  const span = name === 'baker' || name === 'courtland' ? 95 : 42;
  const fixed = Number(query.get('offset') ?? -12);
  const offset = (elapsed: number) =>
    query.get('drive') === '1' ? ((elapsed * 13) % (2 * span)) - span : Number.isFinite(fixed) ? fixed : -12;
  if (name === 'capitol') {
    // These ramps enter from beyond the south cut and have no complete
    // through-route on this square. Follow their actual striped geometry.
    const ribbon = ribbons.find((r) => r.id === (second ? 305894125 : 28684853))!;
    const station = alongOn(ribbon, [x, z]).s;
    const road = { cls: 'motorway', sub: 'link', name: null, pts: ribbon.pts, bridge: false, tunnel: false };
    const point = (s: number) => {
      const [x, z] = stripePoint(sectionAt(ribbon, s), 0.5 / ribbon.lanes);
      return { x, z, road };
    };
    return (elapsed: number) => ({
      eye: point(station + offset(elapsed)),
      ahead: point(station + offset(elapsed) + 16),
    });
  }
  const direction = second ? 'southbound' : 'northbound';
  const bounds = { minX: -1100, maxX: 1900, minZ: -1700, maxZ: 1100 };
  let best: { route: TrafficLane; station: number; distance: number } | undefined;
  for (const route of connectorTrafficRoutes({ ...city, bounds })) {
    if (route.direction !== direction) continue;
    for (let i = 0; i < route.roads.length; i++) {
      if (route.roads[i].sub) continue;
      const p = route.line.at(route.line.cum[i]);
      const advance = Math.max(
        0,
        Math.min(route.line.cum[i + 1] - route.line.cum[i], (x - p.x) * p.dx + (z - p.z) * p.dz),
      );
      const station = route.line.cum[i] + advance;
      const distance = Math.hypot(p.x + advance * p.dx - x, p.z + advance * p.dz - z);
      if (!best || distance < best.distance) best = { route, station, distance };
    }
  }
  if (!best || best.distance > 8) return;
  const { route, station } = best;
  const line = route.line;
  const point = (s: number) => ({
    ...line.at(s),
    road: route.roads[Math.min(route.roads.length - 1, Math.floor(line.vertexAt(s)))],
  });
  return (elapsed: number) => {
    const at = station + offset(elapsed);
    return { eye: point(at), ahead: point(at + 16) };
  };
}
