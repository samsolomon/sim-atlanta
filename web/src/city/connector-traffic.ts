import { capitolTunnelFloorAt } from '../terrain/capitol-tunnel';
import { onStudyTread, usesExit250 } from '../../../pipeline/prototypes/highway-four/contact';
import { connectorTrafficRoutes, type TrafficLane } from './connector-traffic-routes';
import { RoadTraffic, type RoadTrafficOptions } from './road-traffic';

export const CONNECTOR_TRAFFIC_CAP = { low: 48, high: 120 } as const;
export const CONNECTOR_AADT = 237_000; // GDOT station 121-5472, 2025 calculated, both directions.
/** A loaded board and the ground/deck sampler used to render its roads. */
export type ConnectorBoard = Pick<RoadTrafficOptions, 'city' | 'roadHeight'>;
export type ConnectorTrafficOptions = RoadTrafficOptions & { neighbors?: ConnectorBoard[] };

// Illustrative weekday bottleneck at the Fifth Street crossing. Find its chainage on
// each through lane so reversing direction also reverses approach and departure.
function fifthStreetPeak(lane: TrafficLane) {
  for (let i = 1; i < lane.line.pts.length; i++) {
    const [x, z] = lane.line.pts[i - 1], [xx, zz] = lane.line.pts[i];
    if (zz === z) continue;
    const f = (-2555 - z) / (zz - z);
    if (f < 0 || f > 1 || Math.abs(x + f * (xx - x) - 66) > 55) continue;
    const center = lane.line.cum[i - 1] + f * (lane.line.cum[i] - lane.line.cum[i - 1]);
    const radius = Math.min(1400, center, lane.line.length - center);
    if (radius > 90) return { center, radius, hour: lane.direction === 'northbound' ? 17 : 8 };
  }
}

export class ConnectorTraffic extends RoadTraffic {
  constructor(opts: ConnectorTrafficOptions) {
    const neighbors = opts.neighbors ?? [];
    const courses = connectorTrafficRoutes(opts.city, neighbors.map(board => board.city)).map(lane => ({ ...lane,
      rush: fifthStreetPeak(lane), speedMps: 18, dailyFlow: CONNECTOR_AADT * .5 * lane.share, truckShare: .07, semiShare: .7 }));
    const boards = [opts, ...neighbors];
    const bounds = { ...opts.city.bounds };
    for (const { city } of neighbors) {
      bounds.minX = Math.min(bounds.minX, city.bounds.minX);
      bounds.maxX = Math.max(bounds.maxX, city.bounds.maxX);
      bounds.minZ = Math.min(bounds.minZ, city.bounds.minZ);
      bounds.maxZ = Math.max(bounds.maxZ, city.bounds.maxZ);
    }
    // A joined board can be L-shaped. Resolve each axle against the board under it;
    // the bounding rectangle alone includes empty space outside the diorama.
    const roadHeight: ConnectorBoard['roadHeight'] = (x, z, run) => {
      // At a Capitol Gateway mouth the board is cut away from the apron in: cars drive on the
      // tube's floor there, stay in view a few lengths in, then vanish (covered).
      const mouth = capitolTunnelFloorAt(x, z);
      if (mouth !== null) return mouth;
      if (run.tunnel) return null;
      for (const board of boards) {
        const b = board.city.bounds;
        if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ)
          return board.roadHeight(x, z, run);
      }
      return null;
    };
    const northRowMounted = neighbors.some(board => board.city.bounds.minZ === -6500);
    super({ ...opts, reserveMovement: northRowMounted && opts.quality === 'low' ? usesExit250 : undefined,
      fitWheelPlane: northRowMounted ? (road, x, z) => onStudyTread(road.pts, x, z) : undefined, city: { ...opts.city, bounds }, roadHeight }, courses,
      CONNECTOR_TRAFFIC_CAP[opts.quality], 80375, 'Illustrative Connector traffic');
  }
}
