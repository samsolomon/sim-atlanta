import { connectorTrafficRoutes } from './connector-traffic-routes';
import { RoadTraffic, type RoadTrafficOptions } from './road-traffic';

export const CONNECTOR_TRAFFIC_CAP = { low: 48, high: 120 } as const;
export const CONNECTOR_AADT = 237_000; // GDOT station 121-5472, 2025 calculated, both directions.
export type ConnectorTrafficOptions = RoadTrafficOptions;

export class ConnectorTraffic extends RoadTraffic {
  constructor(opts: ConnectorTrafficOptions) {
    const courses = connectorTrafficRoutes(opts.city).map(lane => ({ ...lane,
      speedMps: 18, dailyFlow: CONNECTOR_AADT * .5 * lane.share, truckShare: .07 }));
    super(opts, courses, CONNECTOR_TRAFFIC_CAP[opts.quality], 80375, 'Illustrative Connector traffic');
  }
}
