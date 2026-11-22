import { arterialTrafficRoutes, type ArterialCorridor } from './arterial-traffic-routes';
import { RoadTraffic, type RoadTrafficOptions } from './road-traffic';

export const ARTERIAL_TRAFFIC_CAP = { low: 24, high: 60 } as const;
export interface ArterialTrafficOptions extends RoadTrafficOptions {
  /** Resolved corridors from the optional downtown arterial bake. */
  arterials?: readonly ArterialCorridor[];
}

export class ArterialTraffic extends RoadTraffic {
  constructor(opts: ArterialTrafficOptions) {
    super(opts, arterialTrafficRoutes(opts.arterials ?? [], opts.city.bounds),
      ARTERIAL_TRAFFIC_CAP[opts.quality], 31601, 'Illustrative downtown arterial traffic');
  }
}
