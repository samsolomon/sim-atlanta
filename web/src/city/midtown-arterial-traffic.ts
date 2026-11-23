import type { VRoad } from '../vignette/world';
import type { TerrainCity } from '../terrain/transport-data';
import { arterialTrafficRoutes, type ArterialCorridor } from './arterial-traffic-routes';
import { ARTERIAL_TRAFFIC_CAP } from './arterial-traffic';
import { RoadTraffic, type RoadTrafficOptions } from './road-traffic';
import bake from './fixtures/midtown-arterials.json';

/** A mounted Midtown row: its drawn roads and the sampler that seats a car on them. */
export interface MidtownTrafficBoard {
  city: TerrainCity;
  roadHeight: RoadTrafficOptions['roadHeight'];
}
type Run = (typeof bake.runs)[number];
type Bounds = TerrainCity['bounds'];

const near = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= 0.5;
const inside = (b: Bounds, [x, z]: number[]) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
const corridorId = (name: string) => name.replace(/ (Northeast|Northwest)$/, '');

/** Resolve the HPMS-matched Midtown runs onto the mounted rows' drawn roads. A run whose
 * row is not mounted, or whose endpoints moved, is skipped, so the layer degrades by run. */
export function midtownArterialCorridors(boards: readonly MidtownTrafficBoard[]) {
  const heights = new Map<VRoad, MidtownTrafficBoard['roadHeight']>();
  const corridors = new Map<string, ArterialCorridor & { runs: ArterialCorridor['runs'][number][] }>();
  let skipped = 0;
  for (const run of bake.runs as Run[]) {
    const mid = [(run.a[0] + run.b[0]) / 2, (run.a[1] + run.b[1]) / 2];
    const board = boards.find(b => inside(b.city.bounds, mid));
    const road = board?.city.roads.find(r => r.name === run.name && near(r.pts[0], run.a) && near(r.pts.at(-1)!, run.b));
    if (!board || !road) { skipped++; continue; }
    heights.set(road, board.roadHeight);
    const id = corridorId(run.name);
    if (!corridors.has(id)) corridors.set(id, { id, runs: [] });
    corridors.get(id)!.runs.push({
      road, from: run.from, to: run.to, allow: run.allow as 'both' | 'forward' | 'reverse',
      aadt: run.aadt, lanes: run.lanes, speedMph: run.speedMph, truckShare: run.truckShare,
    });
  }
  const bounds = boards.reduce<Bounds | null>((u, { city: { bounds: b } }) => u ? {
    minX: Math.min(u.minX, b.minX), maxX: Math.max(u.maxX, b.maxX),
    minZ: Math.min(u.minZ, b.minZ), maxZ: Math.max(u.maxZ, b.maxZ) } : { ...b }, null);
  return { corridors: [...corridors.values()], heights, bounds, skipped };
}

/** Illustrative car positions on Midtown's arterials. Volumes are HPMS AADT (inferred),
 * shaped by the hourly profile, exactly as downtown's ArterialTraffic; trips follow one
 * corridor and fade at forks, with no turns or signals. Buses are never drawn here. */
export class MidtownArterialTraffic extends RoadTraffic {
  constructor(opts: Omit<RoadTrafficOptions, 'city' | 'roadHeight'>, boards: readonly MidtownTrafficBoard[]) {
    const { corridors, heights, bounds } = midtownArterialCorridors(boards);
    const city = { ...(boards[0]?.city ?? {}), bounds: bounds ?? { minX: 0, maxX: 0, minZ: 0, maxZ: 0 } } as TerrainCity;
    super({ ...opts, city, roadHeight: (x, z, road) => heights.get(road)?.(x, z, road) ?? null },
      bounds ? arterialTrafficRoutes(corridors, bounds) : [], ARTERIAL_TRAFFIC_CAP[opts.quality], 31607,
      'Illustrative Midtown arterial traffic');
  }
}
