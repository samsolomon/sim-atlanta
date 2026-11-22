/**
 * Downtown major arterials for City traffic (tier: inferred — typical, not live).
 * Baked by pipeline/scripts/arterials.py into scene/downtown/arterials.json; see docs/arterials.md.
 *
 * Each run names an ORIGINAL vignette.json `roads` index (the VRoad City draws and roadHeight
 * takes; street bridges included). The selector checks the run's baked endpoints against that
 * road, so a skewed or older bake drops only the affected runs, and a missing file yields none.
 */
import type { VData } from '../vignette/world';

type VRoad = VData['roads'][number];
export type TravelDir = 'forward' | 'reverse';

export interface ArterialRun {
  /** Index into vignette.json `roads`. */
  run: number;
  /** Overture GERS segment id the run was drawn from. */
  overture: string | null;
  /** The run's first and last drawn points (scene metres), as baked. */
  a: [number, number];
  b: [number, number];
  /** Shared endpoint ids (0.5 m snap) for joining runs into chains. */
  from: string;
  to: string;
  lenM: number;
  bridge: boolean;
  /** Permitted travel relative to the run's point order: forward = a → b. */
  allow: 'both' | TravelDir;
  /** Through lanes and AADT (vehicles/day) per permitted direction; already directional, count once. */
  lanes: Partial<Record<TravelDir, number>>;
  aadt: Partial<Record<TravelDir, number>>;
  /** two-way-split: HPMS two-way AADT halved; one-way: all of it; carriageway: one half of a divided road. */
  aadtBasis: 'two-way-split' | 'one-way' | 'carriageway';
  truckShare: number;
  speedMph: number | null;
  match: { hpmsDistM: number | null; name: true; by: 'route-name' | 'route-number'; coverage: number; hpmsYear: number | null; aadtDate: string | number | null; hpmsRoute: string | null };
}

export interface Corridor {
  id: string;
  name: string;
  /** HPMS functional system: 3 other principal arterial, 4 minor arterial. */
  fSystem: 3 | 4;
  class: string;
  runs: ArterialRun[];
}

export interface ArterialsFile {
  version: 1;
  tier: 'inferred';
  note: string;
  sources: Record<string, string>;
  board: { roads: number };
  nodes: Record<string, [number, number]>;
  corridors: Corridor[];
  coverage: { candidates: number; matched: number; rejected: { run: number; reason: string }[] };
}

export interface ResolvedRun extends ArterialRun {
  road: VRoad;
}
export interface ResolvedCorridor extends Omit<Corridor, 'runs'> {
  runs: ResolvedRun[];
}

/** Endpoint tolerance between the baked run and the drawn road (m). */
const MATCH_M = 0.5;

/**
 * Resolve arterial runs onto the drawn roads. Runs whose road is missing or whose endpoints
 * moved (a different bake) are skipped and counted; an absent or unknown-version file gives
 * no corridors. Never throws on data.
 */
export function loadArterials(json: unknown, vd: Pick<VData, 'roads'>): { corridors: ResolvedCorridor[]; skipped: number } {
  const file = json as Partial<ArterialsFile> | null | undefined;
  if (!file || file.version !== 1 || !Array.isArray(file.corridors)) return { corridors: [], skipped: 0 };
  let skipped = 0;
  const point = (q: unknown): q is [number, number] =>
    Array.isArray(q) && q.length >= 2 && Number.isFinite(q[0]) && Number.isFinite(q[1]);
  const near = (p: unknown, q: unknown) => point(p) && point(q) && Math.hypot(p[0] - q[0], p[1] - q[1]) <= MATCH_M;
  const roads = Array.isArray(vd?.roads) ? vd.roads : [];
  const corridors: ResolvedCorridor[] = [];
  for (const c of file.corridors) {
    if (!c || typeof c !== 'object' || !Array.isArray(c.runs)) {
      skipped++;
      continue;
    }
    const runs: ResolvedRun[] = [];
    for (const r of c.runs) {
      const road = r && Number.isInteger(r.run) ? roads[r.run] : undefined;
      const pts = road?.pts;
      if (!road || !Array.isArray(pts) || pts.length < 2 || !near(pts[0], r.a) || !near(pts[pts.length - 1], r.b) ||
          (r.allow !== 'both' && r.allow !== 'forward' && r.allow !== 'reverse') || !r.aadt || typeof r.aadt !== 'object') {
        skipped++;
        continue;
      }
      runs.push({ ...r, road });
    }
    if (runs.length) corridors.push({ ...c, runs });
  }
  return { corridors, skipped };
}
