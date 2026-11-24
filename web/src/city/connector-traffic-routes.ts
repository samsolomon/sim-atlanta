import { Line, type P2 } from '../vignette/geom';
import type { VRoad } from '../vignette/world';
import {
  laneKey,
  mix,
  ribbons,
  stripePoint,
  successors,
  type LaneEnd,
} from '../terrain/connector-corridor';
import { midtownThroughLane, trafficLaneFraction } from '../terrain/midtown-connector-lanes';
import type { ConnectorDirection } from '../terrain/connector-lanes';
import type { TerrainCity } from '../terrain/transport-data';

type Box = TerrainCity['bounds'];
export interface TrafficLane {
  line: Line;
  roads: VRoad[];
  direction: ConnectorDirection;
  crossing: boolean;
  lane: number;
  share: number;
  fadeStartM: number;
  fadeEndM: number;
}

interface Piece extends LaneEnd {
  pts: P2[];
  owner: VRoad;
  next: Piece[];
  incoming: number;
  startsWay: boolean;
  endsWay: boolean;
  exitLane: number;
}
const distance = (a: P2, b: P2) => Math.hypot(b[0] - a[0], b[1] - a[1]);
function inside(p: P2, b: Box) {
  return p[0] >= b.minX && p[0] <= b.maxX && p[1] >= b.minZ && p[1] <= b.maxZ;
}

/** Cut each lane, including its outside offsets, at the union of mounted boards.
 * Splitting at *all* boundaries also handles a lane leaving and re-entering an L.
 * Runs on every area mount, so the loop allocates only the output points. */
const cutBuffer = new Float64Array(2 + 4 * 64);
export function clipped(points: P2[], boxes: Box[]) {
  const pieces: P2[][] = [];
  let part: P2[] | undefined;
  const cuts = boxes.length * 4 + 2 <= cutBuffer.length ? cutBuffer : new Float64Array(boxes.length * 4 + 2);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const ax = a[0], az = a[1], dx = b[0] - ax, dz = b[1] - az;
    let n = 0;
    cuts[n++] = 0; cuts[n++] = 1;
    for (const box of boxes) {
      let t = (box.minX - ax) / dx; if (t > 0 && t < 1) cuts[n++] = t;
      t = (box.maxX - ax) / dx; if (t > 0 && t < 1) cuts[n++] = t;
      t = (box.minZ - az) / dz; if (t > 0 && t < 1) cuts[n++] = t;
      t = (box.maxZ - az) / dz; if (t > 0 && t < 1) cuts[n++] = t;
    }
    const sorted = cuts.subarray(0, n).sort();
    for (let j = 1; j < n; j++) {
      const t = sorted[j - 1], u = sorted[j];
      if (u - t < 1e-9) continue;
      const m = (t + u) / 2, mx = ax + dx * m, mz = az + dz * m;
      let within = false;
      for (const box of boxes) if (mx >= box.minX && mx <= box.maxX && mz >= box.minZ && mz <= box.maxZ) { within = true; break; }
      if (!within) {
        part = undefined;
        continue;
      }
      if (!part) {
        part = [mix(a, b, t)];
        pieces.push(part);
      }
      const end = mix(a, b, u);
      if (distance(part.at(-1)!, end) > 0.00001) part.push(end);
    }
  }
  return pieces.filter((p) => p.length > 1);
}

export function connectorTrafficRoutes(city: TerrainCity, neighbors: TerrainCity[] = []): TrafficLane[] {
  const boxes = [city, ...neighbors].map((c) => c.bounds);
  const pieces: Piece[] = [],
    starts = new Map<string, Piece>();
  for (const ribbon of ribbons) {
    // The static OSM way supplies one unambiguous surface classification per
    // owner. A mixed Overture centreline can cover both a tunnel and an open cut.
    const owner: VRoad = {
      cls: 'motorway',
      name: ribbon.link ? null : 'Downtown Connector',
      sub: ribbon.link ? 'link' : null,
      bridge: ribbon.kind === 'bridge',
      tunnel: ribbon.kind === 'tunnel',
      pts: ribbon.pts,
    };
    for (let lane = 0; lane < ribbon.lanes; lane++) {
      const exitLane = midtownThroughLane(ribbon, lane);
      const points = ribbon.rows.map(row =>
        stripePoint(row, trafficLaneFraction(lane, exitLane, ribbon.lanes, row.s)));
      for (const pts of clipped(points, boxes)) {
        const p: Piece = {
          ribbon,
          lane,
          pts,
          owner,
          exitLane,
          next: [],
          incoming: 0,
          startsWay: distance(pts[0], points[0]) < 0.001,
          endsWay: distance(pts.at(-1)!, points.at(-1)!) < 0.001,
        };
        pieces.push(p);
        if (p.startsWay) starts.set(laneKey(p), p);
      }
    }
  }
  for (const p of pieces) {
    if (!p.endsWay) continue;
    for (const next of successors.get(laneKey({ ribbon: p.ribbon, lane: p.exitLane })) ?? []) {
      const q = starts.get(laneKey(next));
      if (!q || distance(q.pts[0], p.pts.at(-1)!) > 0.05) continue;
      p.next.push(q);
      q.incoming++;
    }
  }

  const result: TrafficLane[] = [];
  function finish(chain: Piece[], share: number) {
    const points = [chain[0].pts[0]],
      roads: VRoad[] = [];
    for (const p of chain)
      for (const pt of p.pts.slice(1)) {
        if (distance(points.at(-1)!, pt) < 0.00001) continue;
        roads.push(p.owner);
        points.push(pt);
      }
    const line = new Line(points);
    if (line.length < 12) return;
    const crossing = chain.find((p) => p.ribbon.id === 119686423 || p.ribbon.id === 316454382);
    const main = crossing ?? chain.find((p) => !p.ribbon.link) ?? chain[0];
    // Wheelbase samples stop before an exposed board edge, including at the
    // concave corner. Dissolve over the final car lengths before that cutoff.
    result.push({
      line,
      roads,
      crossing: !!crossing,
      direction: main.ribbon.direction,
      lane: main.lane,
      share,
      fadeStartM: 18,
      fadeEndM: 18,
    });
  }
  function travel(chain: Piece[], share: number) {
    const next = chain.at(-1)!.next.filter((p) => !chain.includes(p));
    if (!next.length) {
      finish(chain, share);
      return;
    }
    for (const p of next) travel([...chain, p], share / next.length);
  }
  for (const p of pieces) if (!p.incoming) travel([p], 1 / Math.max(6, p.ribbon.lanes));
  for (const dir of ['northbound', 'southbound'] as const) {
    const crossing = result.filter((r) => r.crossing && r.direction === dir);
    const total = crossing.reduce((sum, r) => sum + r.share, 0);
    for (const r of crossing) r.share /= total;
  }
  return result;
}
