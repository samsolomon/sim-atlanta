import type { P2 } from '../vignette/geom';
import { Line } from '../vignette/geom';
import { roadWidth } from './transport-data';

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

/** Split ordinary ground-road paint only where its source line shares an actual
 * junction vertex with a transverse ground road. Coplanar-looking plan overlaps
 * at bridges never participate. Traffic and pavement retain their full paths. */
export function junctionMarkings(roads: Road[], crossings: Road[]) {
  const owners = new Map<string, { road: Road; i: number }[]>();
  for (const road of roads) road.pts.forEach((p, i) => {
    const k = key(p), list = owners.get(k);
    if (list) list.push({ road, i }); else owners.set(k, [{ road, i }]);
  });
  const crossingNodes = new Set(crossings.flatMap(r => r.pts.map(key)));
  const result = new Map<Road, P2[][]>();
  const tangent = (road: Road, i: number) => {
    const a = road.pts[Math.max(0, i - 1)], b = road.pts[Math.min(road.pts.length - 1, i + 1)];
    return [b[0] - a[0], b[1] - a[1]];
  };
  for (const road of roads) {
    const gaps: [number, number][] = [];
    let line: Line | undefined;
    for (const [i, p] of road.pts.entries()) {
      const shared = owners.get(key(p))!;
      if (shared.length < 2) continue;
      const [dx, dz] = tangent(road, i);
      let reach = 0;
      for (const other of shared) {
        if (other.road === road || (road.name && road.name === other.road.name)) continue;
        const [ux, uz] = tangent(other.road, other.i);
        const sine = Math.abs(dx * uz - dz * ux) / (Math.hypot(dx, dz) * Math.hypot(ux, uz));
        if (sine > .5) reach = Math.max(reach, roadWidth(other.road) / (2 * sine));
      }
      if (!reach) continue;
      line ??= new Line(road.pts);
      const at = line.cum[i];
      const limit = (step: number) => {
        for (let j = i + step; j >= 0 && j < road.pts.length; j += step) {
          const distance = Math.abs(line!.cum[j] - at);
          if (distance > reach + 12) break;
          if (crossingNodes.has(key(road.pts[j]))) return Math.max(reach, distance + 1.4);
        }
        return reach;
      };
      gaps.push([at - limit(-1), at + limit(1)]);
    }
    if (!line) continue;
    const axis: Line = line;
    const paths: P2[][] = [];
    const add = (a: number, b: number) => {
      if (b <= a) return;
      const start = axis.at(a), end = axis.at(b);
      const pts = road.pts.slice(Math.floor(axis.vertexAt(a)) + 1, Math.ceil(axis.vertexAt(b)));
      paths.push([[start.x, start.z], ...pts, [end.x, end.z]]);
    };
    let s = 0;
    for (const [a, b] of gaps.sort((a, b) => a[0] - b[0])) {
      add(s, a);
      s = Math.max(s, b);
    }
    add(s, axis.length);
    result.set(road, paths);
  }
  return result;
}
