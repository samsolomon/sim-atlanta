import type { P2 } from '../vignette/geom';
import type { TransportRun } from '../terrain/transport-data';
import survey from './fixtures/brookwood.json';
import grade from './fixtures/brookwood-corridor.json';
import railRows from './fixtures/midtown-rail.json';

/** The Brookwood survey covers x −575…410. Beyond it the mapped Norcross mains and
 * the siding continue at grade to the west board edge and out through the north edge.
 * These OSM continuations join the surveyed lines end to end. */
type Row = 'brookwood-south' | 'brookwood-station';
const same = (a: number[], b: number[]) => a[0] === b[0] && a[1] === b[1];

function continuation(row: Row, from: number[]) {
  const runs = railRows[row] as TransportRun[];
  const run = runs.find(r => r.cls === 'standard_gauge' && (same(r.pts[0], from) || same(r.pts.at(-1)!, from)));
  if (!run) throw Error(`No mapped continuation of the Brookwood track at ${from}`);
  // Orient away from the survey so the joined line reads from the survey end outward.
  return { run, pts: (same(run.pts[0], from) ? run.pts : [...run.pts].reverse()) as P2[] };
}

function join(pts: P2[]) {
  const west = continuation('brookwood-south', pts[0]);
  const east = continuation('brookwood-station', pts.at(-1)!);
  return {
    pts: [...[...west.pts].reverse(), ...pts.slice(1, -1), ...east.pts] as P2[],
    west: [...west.pts].reverse() as P2[],
    east: east.pts,
    runs: [west.run, east.run],
  };
}

function joinEast(pts: P2[]) {
  const east = continuation('brookwood-station', pts.at(-1)!);
  return { pts: [...pts.slice(0, -1), ...east.pts] as P2[], east: east.pts, runs: [east.run] };
}

export const corridor = {
  main1: join(survey.main1 as P2[]),
  main2: join(survey.main2 as P2[]),
  siding: joinEast(survey.siding as P2[]),
};

/** Open-track 3DEP anchors (City x, NAVD88 m) beyond the survey clip. */
export const corridorGrade = { west: grade.west as [number, number][], east: grade.east as [number, number][] };

const replaced = new Set<TransportRun>(Object.values(corridor).flatMap(track => track.runs));

/** The Brookwood model draws the joined continuations. Keep them in the row data for
 * placement clearance and road crossings, but do not draw them a second time. */
export function brookwoodCorridorRail(rail: TransportRun[]) {
  return rail.map(run => (replaced.has(run) ? { ...run, replaced: true } : run));
}
