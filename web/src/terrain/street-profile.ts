import type { P2 } from '../vignette/geom';

type Direction = 'forward' | 'reverse';
type SegmentRoad = { name?: string | null; pts?: P2[]; bridge?: boolean; tunnel?: boolean; kind?: string };
type Movement = 'through' | 'left' | 'right';
export interface StreetLane {
  direction: Direction;
  /** Empty means the mapped lane count supplied no maneuver information. */
  movements: readonly Movement[];
  /** Metres to the right of the original source-way axis. */
  offset: number;
}
export interface StreetProfile {
  way: number;
  lanes: StreetLane[];
  width: number;
  widthTier: 'inferred';
  directionalSplit: 'reported' | 'inferred';
  parking: 'unknown';
}
const laneM = 3.1; // Illustrative motor lane width; the archive contains no stripe survey.
function segment(way: number, forward: number, reverse = 0, movements: Movement[][] = []): StreetProfile {
  const count = forward + reverse;
  return { way, width: count * laneM, widthTier: 'inferred', parking: 'unknown',
    directionalSplit: reverse ? 'inferred' : 'reported',
    lanes: Array.from({ length: count }, (_, i) => ({
      direction: i < reverse ? 'reverse' : 'forward', movements: movements[i] ?? [],
      offset: (i + .5 - count / 2) * laneM,
    })) };
}

// Original directed OSM ways and row-clipped endpoint fingerprints. Motor counts and
// turn tags come from the archived Midtown extracts. 10th's 3/3 split is inferred
// from its six reported lanes and HPMS; its shared cycle lane adds no motor slot.
const profiles = new Map<string, StreetProfile>();
function add(profile: StreetProfile, street: string, ...cuts: P2[]) {
  for (let i = 1; i < cuts.length; i++)
    profiles.set(street + '/' + cuts[i-1] + '/' + cuts[i], profile);
}
const spring = 'Spring Street Northwest', tenth = '10th Street Northwest';
add(segment(48663359, 4), spring, [220.33,-3464.65], [221.33,-3300], [224.37,-3069.7]);
add(segment(306157879, 3), spring, [224.37,-3069.7], [240.37,-2965.46]);
add(segment(234013260, 4, 0, [['left','through'],['through'],['through'],['right']]), spring,
  [240.37,-2965.46], [259.51,-2551.04]);
add(segment(1103152009, 4), spring, [259.51,-2551.04], [258.92,-2500], [258.12,-2444.72]);
add(segment(311764287, 3, 3), tenth, [224.37,-3069.7], [181.38,-3070.09]);
add(segment(629238141, 3, 3), tenth, [288.94,-3069.78], [224.37,-3069.7]);

export function streetProfile(road?: SegmentRoad) {
  if (!road || (road.name !== spring && road.name !== tenth)) return;
  if (!road.pts?.length || road.bridge || road.tunnel || (road.kind && road.kind !== 'ground')) return;
  return profiles.get(road.name + '/' + road.pts[0] + '/' + road.pts.at(-1));
}
/** Choose the through-eligible slot nearest the axis for the existing representative trip. */
export function throughLane(profile: StreetProfile, direction: Direction) {
  return profile.lanes.filter(lane => lane.direction === direction &&
    (!lane.movements.length || lane.movements.includes('through')))
    .sort((a,b) => Math.abs(a.offset) - Math.abs(b.offset))[0];
}

export function parallelPath(pts: P2[], offset: number): P2[] {
  return pts.map(([x,z], i) => {
    const a = pts[Math.max(0,i-1)], b = pts[Math.min(pts.length-1,i+1)];
    const dx = b[0]-a[0], dz = b[1]-a[1], length = Math.hypot(dx,dz) || 1;
    return [x - dz / length * offset, z + dx / length * offset];
  });
}
