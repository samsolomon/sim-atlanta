import { Line, type P2 } from '../vignette/geom';
import type { VRoad } from '../vignette/world';
import type { TerrainCity } from '../terrain/transport-data';
import type { TrafficCourse } from './road-traffic';

/** Structural subset of the output of loadArterials(json, city). Road indices and
 * endpoint fingerprints have already been checked by the data selector. */
export interface ArterialCorridor {
  id: string;
  runs: readonly {
    road: VRoad;
    from: string;
    to: string;
    allow: 'both' | 'forward' | 'reverse';
    aadt: { forward: number; reverse: number };
    lanes: { forward: number; reverse: number };
    speedMph: number | null;
    truckShare: number | null;
  }[];
}

interface ArterialTraversal {
  from: string;
  to: string;
  road: VRoad;
  reverse: boolean;
  twoWay: boolean;
  dailyFlow: number;
  speedMps: number;
  truckShare: number;
}

interface Edge {
  traversal: ArterialTraversal;
  pts: P2[];
  next?: Edge;
  prev?: Edge;
}

const same = (a: P2, b: P2) => a[0] === b[0] && a[1] === b[1];

function heading(a: P2, b: P2): P2 {
  const dx = b[0]-a[0], dz = b[1]-a[1], size = Math.hypot(dx,dz);
  return size ? [dx/size, dz/size] : [0,0];
}

function makeCourse(edges: Edge[], bounds: TerrainCity['bounds']): TrafficCourse | undefined {
  const axis: P2[] = [edges[0].pts[0]], roads: VRoad[] = [], offsets: number[] = [];
  let seconds = 0, vehicles = 0, trucks = 0;
  for (const { traversal, pts } of edges) {
    // Node snapping may leave the original endpoints a few centimetres apart.
    // Assign the midpoint to both sides of the join without introducing a tiny sideways segment.
    const prev = axis.at(-1)!;
    axis[axis.length-1] = [(prev[0]+pts[0][0])/2, (prev[1]+pts[0][1])/2];
    for (let i = 1; i < pts.length; i++) {
      const delta = Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]) / traversal.speedMps;
      seconds += delta;
      vehicles += delta * traversal.dailyFlow;
      trucks += delta * traversal.dailyFlow * traversal.truckShare;
      roads.push(traversal.road);
      offsets.push(traversal.twoWay ? 2 : 0);
      axis.push(pts[i]);
    }
  }
  const closed = edges.at(-1)!.next === edges[0];
  const end = axis.length-1;
  if (closed) axis[0] = axis[end] = [(axis[0][0]+axis[end][0])/2,(axis[0][1]+axis[end][1])/2];
  // One shared offset vertex maintains continuity where the original road owner changes.
  const lane = axis.map((p, i): P2 => {
    const before = i ? axis[i-1] : closed ? axis[end-1] : p;
    const after = i < end ? axis[i+1] : closed ? axis[1] : p;
    const [ax,az] = heading(before,p), [bx,bz] = heading(p,after);
    const [dx,dz] = heading([0,0],[ax+bx,az+bz]);
    const width = ((offsets[i-1] ?? (closed ? offsets[end-1] : offsets[0])) +
      (offsets[i] ?? (closed ? offsets[0] : offsets[end-1]))) / 2;
    return [p[0]-dz*width, p[1]+dx*width];
  });
  const line = new Line(lane);
  if (line.length < 20 || !vehicles) return;
  const atEdge = ([x,z]: P2) => x <= bounds.minX+2 || x >= bounds.maxX-2 || z <= bounds.minZ+2 || z >= bounds.maxZ-2;
  const speedMps = line.length / seconds;
  return { line, roads, speedMps, dailyFlow: vehicles / seconds, truckShare: trucks / vehicles, closed,
    offstageM: closed ? 0 : 3 * speedMps,
    fadeStartM: closed || atEdge(axis[0]) ? 0 : Math.min(12,line.length/4),
    fadeEndM: closed || atEdge(axis[end]) ? 0 : Math.min(12,line.length/4) };
}

function joinArterialRuns(traversals: ArterialTraversal[], bounds: TerrainCity['bounds']) {
  const edges: Edge[] = [];
  const outgoing = new Map<string, Edge[]>();
  for (const traversal of traversals) {
    const source = traversal.road.pts;
    if (!source.every(p=>p.length===2 && p.every(Number.isFinite))) continue;
    const pts = source.filter((p,i)=>!i || !same(p,source[i-1]));
    if (pts.length < 2) continue;
    if (traversal.reverse) pts.reverse();
    const edge = {traversal,pts};
    const node = traversal.from;
    if (!outgoing.has(node)) outgoing.set(node,[]);
    outgoing.get(node)!.push(edge);
    edges.push(edge);
  }
  const incoming = new Map<Edge, Edge[]>();
  const uniqueExit = new Map<Edge, Edge>();
  for (const edge of edges) {
    const p = edge.pts, end = p.at(-1)!;
    const [dx,dz] = heading(p[p.length-2],end);
    const candidates = (outgoing.get(edge.traversal.to) ?? []).filter(next => {
      if (next !== edge && next.traversal.road === edge.traversal.road) return false;
      if (Math.hypot(end[0]-next.pts[0][0],end[1]-next.pts[0][1]) > .5) return false;
      const [ux,uz] = heading(next.pts[0],next.pts[1]);
      return dx*ux + dz*uz > .65;
    });
    if (candidates.length === 1) uniqueExit.set(edge,candidates[0]);
    for (const next of candidates) {
      if (!incoming.has(next)) incoming.set(next,[]);
      incoming.get(next)!.push(edge);
    }
  }
  // Mutual uniqueness prevents two traffic streams from claiming a single outgoing lane.
  for (const [next, entries] of incoming) if (entries.length === 1 && uniqueExit.get(entries[0]) === next) {
    entries[0].next = next;
    next.prev = entries[0];
  }
  const visited = new Set<Edge>(), routes: TrafficCourse[] = [];
  // Start open corridors at their directed entrance and visit closed circuits once afterwards.
  for (const start of [...edges.filter(e=>!e.prev), ...edges]) {
    if (visited.has(start)) continue;
    const chain: Edge[] = [];
    for (let e: Edge | undefined = start; e && !visited.has(e); e = e.next) {
      visited.add(e);
      chain.push(e);
    }
    const route = makeCourse(chain,bounds);
    if (route) routes.push(route);
  }
  return routes;
}

/** Each corridor is an independent evidence boundary. Follow only one unambiguous
 * forward continuation; a fork, missing join or sharp turn ends a trip. */
export function arterialTrafficRoutes(corridors: readonly ArterialCorridor[], bounds: TerrainCity['bounds']) {
  return corridors.flatMap(corridor => {
    const traversals: ArterialTraversal[] = [];
    for (const run of corridor.runs) {
      for (const direction of ['forward','reverse'] as const) {
        if (run.allow !== 'both' && run.allow !== direction) continue;
        const dailyFlow = run.aadt[direction];
        if (!(Number.isFinite(dailyFlow) && dailyFlow > 0 && run.lanes[direction] > 0)) continue;
        const reverse = direction === 'reverse';
        // A representative moving speed, bounded below prevailing signed speeds at busy junctions.
        const speedMps = run.speedMph && Number.isFinite(run.speedMph) && run.speedMph > 0
          ? Math.min(12, run.speedMph * .44704) : 9;
        const truckShare = run.truckShare !== null && Number.isFinite(run.truckShare)
          ? Math.max(0,Math.min(1,run.truckShare)) : .04;
        traversals.push({road:run.road, from:reverse ? run.to : run.from, to:reverse ? run.from : run.to,
          reverse, twoWay:run.allow==='both', dailyFlow, speedMps, truckShare});
      }
    }
    return joinArterialRuns(traversals,bounds);
  });
}
