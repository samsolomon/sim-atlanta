import { streetProfile } from './street-profile';
import type { P2 } from '../vignette/geom';
import type { VData } from '../vignette/world';

export interface TransportRun {
  /** Optional source-fitted pavement. Returns top triangles in the shared structural mesh. */
  drawTread?: (builder: import('../vignette/geom').Builder, sceneZero: number) => number[];
  kind: 'bridge' | 'ground';
  cls: string;
  name?: string | null;
  sub?: string;
  pts: P2[];
  /** Road pavement NAVD88 metres at each vertex of a lidar-profiled structural run. */
  deckNavd88M?: number[];
  /** Share of the deck profile at each approach vertex. Zero meets local terrain. */
  deckWeight?: number[];
  /** Original directed centerline before resampling a measured deck or its approach. */
  sourceAxis?: P2[];
  crossSection?: { width: number; lanes: number; opposing: number };
  /** Drawn by a landmark model. Kept for placement clearance and road crossings. */
  replaced?: boolean;
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

/** Ansley Park, roughly Peachtree Street to Piedmont Park and 15th Street to I-85, in scene metres. */
export const inAnsley = (x: number, z: number) => x > 800 && x < 1750 && z > -4750 && z < -3700;

// Peachtree Circle runs just west of the house-style box (x 770–835), so the street table reaches further west.
export const inAnsleyStreets = (x: number, z: number) => x > 740 && x < 1750 && z > -4750 && z < -3700;

/**
 * Ansley Park's wide streets (Sam, 2026-11-23). OSM carries no width here, so these are inferred
 * curb-to-curb widths measured on aerial imagery against its scale bar (about ±1 m), including
 * curbside parking; see docs/ansley-street-widths.md. Narrower Ansley drives keep the 7 m default.
 */
export const ANSLEY_WIDTHS: Record<string, number> = {
  'Peachtree Circle Northeast': 12, 'The Prado Northeast': 12, 'South Prado Northeast': 12,
  '15th Street Northeast': 10, '17th Street Northeast': 10,
};

export function roadWidth(road: RoadDimensions) {
  const profile = streetProfile(road);
  if (profile) return profile.width;
  if (dividedIvanAllen(road)) return 7.2;
  const ansley = road.cls === 'residential' && road.name ? ANSLEY_WIDTHS[road.name] : undefined;
  if (ansley && road.pts?.some(([x, z]) => inAnsleyStreets(x, z))) return ansley;
  if (road.cls === 'motorway' && road.sub === 'link') return 6.5;
  return widths[road.cls] ?? 4;
}
