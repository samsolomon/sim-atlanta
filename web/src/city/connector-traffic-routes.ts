import { Line, type P2 } from '../vignette/geom';
import type { VRoad } from '../vignette/world';
import { connectorLanes, type ConnectorDirection } from '../terrain/connector-lanes';
import footprint from '../../../pipeline/prototypes/connector-footprint/sections.json';
import type { TerrainCity } from '../terrain/transport-data';

type Box = TerrainCity['bounds'];
interface Chain {
  roads: VRoad[];
  direction: ConnectorDirection;
  crossing: boolean;
  feeder: boolean;
  exit: boolean;
}
export interface TrafficLane {
  line: Line;
  /** Source run for each segment; the owner resolves its actual road surface. */
  roads: VRoad[];
  direction: ConnectorDirection;
  crossing: boolean;
  lane: number;
  share: number;
}

const [a, b] = footprint.sections;
const nodeKey = (point: P2) => point.join(',');
const atBorder = ([x,z]: P2, box: Box) => x <= box.minX + 5 || x >= box.maxX - 5 ||
  z <= box.minZ + 5 || z >= box.maxZ - 5;

// Directed Overture endpoints, from the same downtown extract that draws the roads.
// Only join runs at a shared endpoint. The two Connector board crossings are
// separated by an off-board section east of the board.
function continuousChains(city: TerrainCity): Chain[] {
  const motorways = city.roads.filter(r => r.cls === 'motorway' && r.pts.length >= 2).map(road => {
    // The coarse crop retains only vertices inside a 40 m buffer. The scoped
    // transport bake has the true board-edge intersection for the northern NB run.
    if (atBorder(road.pts[0], city.bounds) || (!road.bridge && !road.tunnel)) return road;
    const approach = city.terrainTransport?.roads.find(part => part.cls === road.cls &&
      (part.sub ?? null) === (road.sub ?? null) && atBorder(part.pts[0], city.bounds) &&
      nodeKey(part.pts[part.pts.length-1]) === nodeKey(road.pts[0]));
    return approach ? { ...road, pts: [...approach.pts.slice(0,-1), ...road.pts] } : road;
  });
  const outgoing = new Map<string, VRoad[]>();
  for (const r of motorways) {
    const key = nodeKey(r.pts[0]);
    if (!outgoing.has(key)) outgoing.set(key, []);
    outgoing.get(key)!.push(r);
  }
  const chains: Chain[] = [];
  function visit(roads: VRoad[]) {
    const last = roads[roads.length - 1];
    const end = last.pts[last.pts.length - 1];
    if (atBorder(end, city.bounds)) {
      const junctions = new Set(roads.slice(1).map(r => nodeKey(r.pts[0])));
      const southNB = junctions.has('741.07,570.95'), southSB = junctions.has('692.96,562.76');
      const northNB = junctions.has('799.81,-1042.64'), northSB = junctions.has('743.94,-1057.54');
      if (!(southNB || southSB || northNB || northSB)) return;
      // Include the two-lane southern feeder and I-20 option/exit. Other branches
      // need independent flow and endpoint evidence before we populate them.
      if (southSB && roads[0].sub === 'link') return;
      if ((northNB || northSB) && (roads[0].sub === 'link' || last.sub === 'link')) return;
      chains.push({ roads, direction: southNB || northNB ? 'northbound' : 'southbound',
        crossing: southNB || southSB, feeder: southNB && roads[0].sub === 'link',
        exit: southSB && last.sub === 'link' });
      return;
    }
    for (const next of outgoing.get(nodeKey(end)) ?? []) {
      if (!roads.includes(next)) visit([...roads, next]);
    }
  }
  for (const road of motorways) if (atBorder(road.pts[0], city.bounds)) visit([road]);
  return chains;
}

function station([x,z]: P2) {
  return (x - footprint.originXZ[0]) * footprint.alongXZ[0] + (z - footprint.originXZ[1]) * footprint.alongXZ[1];
}

function lanePath(chain: Chain, lane: number): Omit<TrafficLane, 'share'> {
  const points: P2[] = [], segments: VRoad[] = [];
  const { direction, crossing } = chain;
  const inner = crossing ? connectorLanes(direction, a.alongM)!.centres[lane] : null;
  const outer = crossing ? connectorLanes(direction, b.alongM)!.centres[lane] : null;
  function position(p: P2, s: number): P2 {
    if (!inner || !outer || s <= a.alongM - 60 || s >= b.alongM + 60) return p;
    const t = Math.max(0, Math.min(1, (s - a.alongM) / (b.alongM - a.alongM)));
    const clamped = Math.max(a.alongM, Math.min(b.alongM, s));
    const blend = 1 - Math.abs(s - clamped) / 60;
    return [0,1].map(i => p[i] + blend * (inner[i] + t * (outer[i] - inner[i]) +
      (s - clamped) * footprint.alongXZ[i] - p[i])) as P2;
  }

  // Share each offset vertex across both adjoining segments. This prevents a car
  // briefly facing sideways at a sharp corner or at the end of a ramp.
  const genericLane = crossing ? Math.min(2, Math.floor(lane * 3 / 7)) : lane;
  const axis: P2[] = [], widths: number[] = [], owners: VRoad[] = [];
  for (const road of chain.roads) {
    const offset = road.sub !== 'link' ? (genericLane - 1) * 3.6 :
      (chain.feeder || chain.exit) ? (lane === 5 ? -1.4 : 1.4) : 0;
    for (const point of road.pts) {
      const last = axis.at(-1);
      if (last && last[0] === point[0] && last[1] === point[1]) continue;
      if (last) { widths.push(offset); owners.push(road); }
      axis.push(point);
    }
  }
  const shifted = axis.map(([x,z], i): P2 => {
    const prev = axis[Math.max(i-1,0)], next = axis[Math.min(i+1,axis.length-1)];
    const heading = (a: P2, b: P2): P2 => {
      const dx = b[0]-a[0], dz = b[1]-a[1], length = Math.hypot(dx,dz) || 1;
      return [dx/length,dz/length];
    };
    const into = heading(prev,axis[i]), out = heading(axis[i],next);
    const dx = into[0]+out[0], dz = into[1]+out[1], length = Math.hypot(dx,dz) || 1;
    const offset = ((widths[i-1] ?? widths[i]) + (widths[i] ?? widths[i-1])) / 2;
    return [x - dz/length*offset, z + dx/length*offset];
  });
  for (let i = 1; i < shifted.length; i++) {
    const road = owners[i-1], start = shifted[i-1], finish = shifted[i];
    const dx = finish[0]-start[0], dz = finish[1]-start[1], length = Math.hypot(dx,dz);
    const s0 = station(start), s1 = station(finish);
    const fractions = [0, 1];
    if (crossing) for (const s of [a.alongM-60, a.alongM, b.alongM, b.alongM+60]) {
      const f = (s - s0)/(s1-s0);
      if (f > 0 && f < 1) fractions.push(f);
    }
    for (let at = 5; at < length; at += 5) fractions.push(at/length);
    for (const f of fractions.sort((x,y) => x-y)) {
      const point = position([start[0]+f*dx, start[1]+f*dz], s0 + f*(s1-s0));
      const prev = points[points.length-1];
      if (prev && Math.hypot(point[0]-prev[0], point[1]-prev[1]) < .01) continue;
      if (prev) segments.push(road);
      points.push(point);
    }
  }
  return { line: new Line(points), roads: segments, direction, crossing, lane };
}

export function connectorTrafficRoutes(city: TerrainCity): TrafficLane[] {
  const result: TrafficLane[] = [];
  for (const chain of continuousChains(city)) {
    const count = chain.crossing ? 7 : 3;
    for (let i = 0; i < count; i++) {
      if (chain.crossing && chain.direction === 'northbound' && chain.feeder !== (i >= 5)) continue;
      if (chain.crossing && chain.direction === 'southbound' && (chain.exit ? i < 5 : i === 6)) continue;
      const choice = chain.crossing && chain.direction === 'southbound' && i === 5;
      result.push({ ...lanePath(chain, i), share: (choice ? .5 : 1) / count });
    }
  }
  return result;
}
