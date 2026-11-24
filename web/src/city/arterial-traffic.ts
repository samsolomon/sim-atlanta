import { arterialTrafficRoutes, type ArterialCorridor } from './arterial-traffic-routes';
import { RoadTraffic, type RoadTrafficOptions, type TrafficCourse } from './road-traffic';
import { arterialTurns } from './arterial-turns';
import type { P2 } from '../vignette/geom';

export const ARTERIAL_TRAFFIC_CAP = { low: 24, high: 60 } as const;
export interface ArterialTrafficOptions extends RoadTrafficOptions {
  /** Resolved corridors from the optional downtown arterial bake. */
  courses?: TrafficCourse[];
  arterials?: readonly ArterialCorridor[];
}

export class ArterialTraffic extends RoadTraffic {
  constructor(opts: ArterialTrafficOptions) {
    const signals = (opts.city as { points?: Record<string, P2[]> }).points?.traffic_signals ?? [];
    super(opts, opts.courses ?? arterialTurns(arterialTrafficRoutes(opts.arterials ?? [], opts.city.bounds), opts.arterials ?? [], signals),
      ARTERIAL_TRAFFIC_CAP[opts.quality], 31601, 'Illustrative downtown arterial traffic');
  }
}
