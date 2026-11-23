import type { P2 } from '../vignette/geom';
import type { VData } from '../vignette/world';

export interface TransportRun {
  kind: 'bridge' | 'ground';
  cls: string;
  name?: string | null;
  sub?: string;
  pts: P2[];
  /** Road pavement NAVD88 metres at each vertex of a lidar-profiled structural run. */
  deckNavd88M?: number[];
  /** Distances at these endpoints on the illustrative westbound freight route. */
  freightS?: [number, number];
}

export type TerrainCity = VData & {
  terrainTransport?: { version: 1; roads: TransportRun[]; rail: TransportRun[] };
};

const widths: Record<string, number> = { motorway: 14, trunk: 14, primary: 13, secondary: 11,
  tertiary: 9, residential: 7, service: 4, pedestrian: 4, footway: 2, steps: 2, path: 2 };

type RoadDimensions = { cls: string; sub?: string | null; name?: string | null; pts?: P2[] };

// These two separately mapped carriageways merge at the west end of the
// railway span. Each carries two through lanes beside the Mangum sidewalk.
export function dividedIvanAllen(road: RoadDimensions) {
  return road.cls === 'secondary' && road.name === 'Ivan Allen Junior Boulevard' &&
    !!road.pts?.length && road.pts.every(([x]) => x <= -648.5);
}

export function roadWidth(road: RoadDimensions) {
  if (dividedIvanAllen(road)) return 7.2;
  if (road.cls === 'motorway' && road.sub === 'link') return 6.5;
  return widths[road.cls] ?? 4;
}
