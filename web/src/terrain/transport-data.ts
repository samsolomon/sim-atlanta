import type { P2 } from '../vignette/geom';
import type { VData } from '../vignette/world';

export interface TransportRun {
  kind: 'bridge' | 'ground';
  cls: string;
  sub?: string;
  pts: P2[];
}

export type TerrainCity = VData & {
  terrainTransport?: { version: 1; roads: TransportRun[]; rail: TransportRun[] };
};

const widths: Record<string, number> = { motorway: 14, trunk: 14, primary: 13, secondary: 11,
  tertiary: 9, residential: 7, service: 4, pedestrian: 4, footway: 2, steps: 2, path: 2 };

export function roadWidth(road: { cls: string; sub?: string | null }) {
  if (road.cls === 'motorway' && road.sub === 'link') return 6.5;
  return widths[road.cls] ?? 4;
}
