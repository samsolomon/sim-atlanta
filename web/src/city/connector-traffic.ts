import { connectorTrafficRoutes, connectorTrafficRouteSteps, type TrafficLane } from './connector-traffic-routes';
import type { Build } from '../core/slice';
import { RoadTraffic, type RoadTrafficOptions } from './road-traffic';

export const CONNECTOR_TRAFFIC_CAP = { low: 48, high: 120 } as const;
export const CONNECTOR_AADT = 237_000; // GDOT station 121-5472, 2025 calculated, both directions.
/** A loaded board and the ground/deck sampler used to render its roads. */
export type ConnectorBoard = Pick<RoadTrafficOptions, 'city' | 'roadHeight'>;
export type ConnectorTrafficOptions = RoadTrafficOptions & { neighbors?: ConnectorBoard[] };

export class ConnectorTraffic extends RoadTraffic {
  /** `lanes`: routes already computed (connectorTrafficSteps); otherwise computed here. */
  constructor(opts: ConnectorTrafficOptions, lanes?: TrafficLane[]) {
    const neighbors = opts.neighbors ?? [];
    const courses = (lanes ?? connectorTrafficRoutes(opts.city, neighbors.map(board => board.city))).map(lane => ({ ...lane,
      speedMps: 18, dailyFlow: CONNECTOR_AADT * .5 * lane.share, truckShare: .07 }));
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
      if (run.tunnel) return null; // the complete directed interval is covered
      for (const board of boards) {
        const b = board.city.bounds;
        if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ)
          return board.roadHeight(x, z, run);
      }
      return null;
    };
    super({ ...opts, city: { ...opts.city, bounds }, roadHeight }, courses,
      CONNECTOR_TRAFFIC_CAP[opts.quality], 80375, 'Illustrative Connector traffic');
  }
}

/** A ConnectorTraffic layer built in steps: routes over several yields, then the layer in the
 * final step. Nothing is allocated for the GPU until that step, so abandoning it frees nothing. */
export function* connectorTrafficSteps(opts: ConnectorTrafficOptions): Build<ConnectorTraffic> {
  const lanes = yield* connectorTrafficRouteSteps(opts.city, (opts.neighbors ?? []).map(board => board.city));
  yield 'connector:routes';
  return new ConnectorTraffic(opts, lanes);
}
