import type { P2 } from '../vignette/geom';
import { Line } from '../vignette/geom';
import { streetProfile } from './street-profile';

type Road = { cls: string; sub?: string | null; name?: string | null; pts: P2[] };
const key = ([x, z]: P2) => x + ',' + z;

// The Midtown archive calls these ways footway=crossing. Their OSM crossing:markings
// tags support marked crossings. Other rows can contain unmarked crossing ways.
const marked = new Set([
  '218.13,-3056.44/237.16,-3056.3',   // 1001561467
  '228.11,-3085.32/212.57,-3081.29',  // 1050091583
  '212.57,-3081.29/212.26,-3082.09',  // 1431380385
  '237.16,-3056.3/234.34,-3080.01',   // 1431380390
  '212.57,-3081.29/215.8,-3058.38',   // 1431380392
]);
export function markedCrossing(r: Road) {
  if (r.sub === 'crosswalk') return true;
  if (r.sub !== 'crossing' || r.pts.length < 2) return false;
  const a = key(r.pts[0]), b = key(r.pts.at(-1)!);
  return marked.has(a + '/' + b) || marked.has(b + '/' + a);
}

// The motor signal is OSM node 69616397. Each arm's crossing point lies on its
// directed source way. Stop-bar paint, arrow paint and pedestrian-head positions
// are unknown. The simulation stops a front bumper upstream of the crossing.
export const springTenth = {
  center: [224.37, -3069.7] as P2,
  arms: new Map<number, P2>([
    [48663359, [221.73,-3083.73]], [306157879, [226.87,-3056.37]],
    [311764287, [214.1,-3069.77]], [629238141, [235.57,-3069.71]],
  ]),
};

export function junctionMarkings(roads: Road[]) {
  const paths = new Map<Road, P2[][]>();
  for (const road of roads) {
    const profile = streetProfile(road);
    const crossing = profile && springTenth.arms.get(profile.way);
    if (!crossing) continue;
    const center = road.pts.findIndex(p => key(p) === key(springTenth.center));
    const index = road.pts.findIndex(p => key(p) === key(crossing));
    if (index < 0 || (center !== 0 && center !== road.pts.length - 1)) continue;
    const line = new Line(road.pts);
    // The zebra stripes span 2.8 m along the carriageway.
    const station = Math.max(0, Math.min(line.length, line.cum[index] + (center === 0 ? 1.4 : -1.4)));
    const end = line.at(station), cut: P2 = [end.x,end.z];
    const v = line.vertexAt(station);
    paths.set(road, [center === 0 ? [cut, ...road.pts.slice(Math.floor(v)+1)] :
      [...road.pts.slice(0,Math.ceil(v)), cut]]);
  }
  return paths;
}

/** Where the front bumper waits on an incoming lane. The station is inferred from
 * its mapped crossing. Only a carrier belonging to this junction can claim it. */
export function junctionStop(line: Line, roads: readonly Road[] | undefined, at: number, center: P2) {
  if (!roads || Math.hypot(center[0]-springTenth.center[0],center[1]-springTenth.center[1]) > 3) return;
  const near = Math.min(line.pts.length-2, Math.floor(line.vertexAt(at)));
  for (let i=near; i>=0 && line.cum[i+1] >= at-32; i--) {
    const profile = streetProfile(roads[i]);
    const point = profile && springTenth.arms.get(profile.way);
    if (!point) continue;
    const a=line.pts[i], b=line.pts[i+1], dx=b[0]-a[0], dz=b[1]-a[1];
    const length=Math.hypot(dx,dz);
    if (!length) continue;
    const along=((point[0]-a[0])*dx+(point[1]-a[1])*dz)/length;
    if (along < -.5 || along > length+.5) continue;
    const station=line.cum[i]+along;
    if (station < at && station > at-32) return station-2.4;
  }
}

export function junctionConnection(incoming: Road, outgoing: Road, center: P2) {
  const [x,z] = springTenth.center;
  if (Math.hypot(x-center[0],z-center[1]) > .5) return true;
  const a=streetProfile(incoming), b=streetProfile(outgoing);
  return !!a && !!b && springTenth.arms.has(a.way) && springTenth.arms.has(b.way) && a.way !== b.way;
}
