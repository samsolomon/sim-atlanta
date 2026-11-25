import type { VRoad } from '../vignette/world';
import type { TerrainCity } from '../terrain/transport-data';
import { arterialTrafficRoutes, type ArterialCorridor } from './arterial-traffic-routes';
import { ARTERIAL_TRAFFIC_CAP } from './arterial-traffic';
import { RoadTraffic, type RoadTrafficOptions } from './road-traffic';
import bake from './fixtures/midtown-arterials.json';
import northBake from '../../../pipeline/prototypes/north-arterials/runs.json';
import signalPoints from './fixtures/midtown-signals.json';
import { arterialTurns } from './arterial-turns';

/** A mounted Midtown row: its drawn roads and the sampler that seats a car on them. */
export interface MidtownTrafficBoard {
  row: string;
  city: TerrainCity;
  roadHeight: RoadTrafficOptions['roadHeight'];
}
type Run = (typeof bake.runs)[number];
type Bounds = TerrainCity['bounds'];

const near = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= 0.5;
const corridorId = (name: string) => name.replace(/ (Northeast|Northwest)$/, '');

/** Resolve the HPMS-matched Midtown runs onto the mounted rows' drawn roads. A run whose
 * row is not mounted, or whose endpoints moved, is skipped, so the layer degrades by run. */
export function midtownArterialCorridors(boards: readonly MidtownTrafficBoard[], northStudy = false) {
  const heights = new Map<VRoad, MidtownTrafficBoard['roadHeight']>();
  const corridors = new Map<string, ArterialCorridor & { runs: ArterialCorridor['runs'][number][] }>();
  let skipped = 0;
  let drifted = 0;
  const runs = northStudy
    ? [...bake.runs.filter(run => run.row !== 'brookwood-station'), ...northBake.runs]
    : bake.runs;
  for (const run of runs as Run[]) {
    const board = boards.find(b => b.row === run.row);
    if (!board) { skipped++; continue; }
    const road = board.city.roads.find(r => r.name === run.name && near(r.pts[0], run.a) && near(r.pts.at(-1)!, run.b));
    // A mounted row whose drawn roads moved since the bake.
    if (!road) { skipped++; drifted++; continue; }
    heights.set(road, board.roadHeight);
    // US 19 changes its street suffix at Brookwood. Both names belong to the
    // same directed corridor and share a mapped endpoint in the northern bake.
    const id = northStudy && run.name === 'Peachtree Road Northeast' ? 'Peachtree Street' : corridorId(run.name);
    if (!corridors.has(id)) corridors.set(id, { id, runs: [] });
    corridors.get(id)!.runs.push({
      road, from: run.from, to: run.to, allow: run.allow as 'both' | 'forward' | 'reverse',
      aadt: run.aadt, lanes: {}, speedMph: run.speedMph, truckShare: run.truckShare,
    });
  }
  const bounds = boards.reduce<Bounds | null>((u, { city: { bounds: b } }) => u ? {
    minX: Math.min(u.minX, b.minX), maxX: Math.max(u.maxX, b.maxX),
    minZ: Math.min(u.minZ, b.minZ), maxZ: Math.max(u.maxZ, b.maxZ) } : { ...b }, null);
  if (drifted) console.warn(`Midtown arterial traffic: ${drifted} baked runs no longer match their drawn roads`);
  return { corridors: [...corridors.values()], heights, bounds, skipped, drifted };
}

/** Illustrative car positions on Midtown's arterials. Volumes are HPMS AADT (inferred),
 * shaped by the hourly profile, exactly as downtown's ArterialTraffic; trips follow one
 * corridor or a signalised turn and fade at unresolved endpoints. Buses are never drawn here. */
export class MidtownArterialTraffic extends RoadTraffic {
  constructor(opts: Omit<RoadTrafficOptions, 'city' | 'roadHeight'>, boards: readonly MidtownTrafficBoard[], northStudy = false) {
    const { corridors, heights, bounds } = midtownArterialCorridors(boards, northStudy);
    const city = { ...(boards[0]?.city ?? {}), bounds: bounds ?? { minX: 0, maxX: 0, minZ: 0, maxZ: 0 } } as TerrainCity;
    const signals = northStudy ? [...signalPoints, ...northBake.signals] : signalPoints;
    super({ ...opts, city,
      fitWheelPlane: northStudy ? (_road, _x, z) => z <= -4900 : undefined,
      roadHeight: (x, z, road) => heights.get(road)?.(x, z, road) ?? null },
      bounds ? arterialTurns(arterialTrafficRoutes(corridors, bounds), corridors, signals as [number, number][]) : [], ARTERIAL_TRAFFIC_CAP[opts.quality], 31607,
      'Illustrative Midtown arterial traffic');
  }
}
