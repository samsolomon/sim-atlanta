import survey from '../../../pipeline/prototypes/connector-footprint/ramp-decks.json';
import type { P2 } from '../vignette/geom';
import type { TerrainCity, TransportRun } from './transport-data';

/**
 * Stacked Connector ramps drawn on their own measured surface
 * (docs/connector-stacked-ramps.md). ramp-decks.py turns each way's tracked
 * 2019 lidar profile into deck spans, in metres along the full OSM way. A board
 * clips ways at its seams, so runs are matched to a way by geometry, then
 * sliced into ground and profiled deck pieces. Runs that already carry a
 * surveyed profile keep it.
 */
type Way = (typeof survey.ways)[number];

function along(pts: number[][], p: P2) {
  let best = Infinity, station = 0, run = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i-1], [bx, bz] = pts[i], dx = bx-ax, dz = bz-az, l2 = dx*dx+dz*dz, l = Math.sqrt(l2);
    if (!l2) continue;
    const t = Math.max(0, Math.min(1, ((p[0]-ax)*dx + (p[1]-az)*dz)/l2));
    const d = Math.hypot(p[0]-ax-t*dx, p[1]-az-t*dz);
    if (d < best) { best = d; station = run + t*l; }
    run += l;
  }
  return { distance: best, station };
}

function profileAt(span: number[][], s: number) {
  let k = 1;
  while (k < span.length-1 && span[k][0] < s) k++;
  const [a, b] = [span[k-1], span[k]];
  return a[1] + (b[1]-a[1]) * (s-a[0]) / ((b[0]-a[0]) || 1);
}

/** Share of the measured deck at a station: 0 on a tie row, where the deck meets the drawn terrain. */
export const deckWeightAt = (span: number[][], s: number) => span.some(r => r[2] && Math.abs(r[0] - s) < .05) ? 0 : 1;

/** Slice one run against one way's spans; null when the run is not on the way. */
function slice(run: TransportRun, way: Way): TransportRun[] | null {
  const stations = run.pts.map(p => along(way.pts, p));
  if (stations.some(s => s.distance > .05)) return null;
  const s0 = stations[0].station, s1 = stations.at(-1)!.station;
  const forward = s1 >= s0;
  const at = (k: number) => stations[k].station;
  // Station breaks: run vertices plus span ends inside the run.
  const cuts = new Set<number>([s0, s1]);
  for (const sp of way.spans) for (const s of [sp[0][0], sp.at(-1)![0], ...sp.map(r => r[0])])
    // Survey stations are rounded to the centimetre: a span end that close to a
    // run vertex is that vertex, or a sliver piece would open the joint.
    if (s > Math.min(s0, s1) && s < Math.max(s0, s1) && run.pts.every((_, k) => Math.abs(s - at(k)) > .05)) cuts.add(s);
  run.pts.forEach((_, k) => cuts.add(at(k)));
  const ordered = [...cuts].sort((a, b) => forward ? a-b : b-a);
  const point = (s: number): P2 => {
    for (let k = 1; k < run.pts.length; k++) {
      const [a, b] = [at(k-1), at(k)];
      if ((s - a) * (s - b) <= 0 && a !== b) {
        const t = (s - a) / (b - a), p = run.pts[k-1], q = run.pts[k];
        return [p[0] + t*(q[0]-p[0]), p[1] + t*(q[1]-p[1])];
      }
    }
    return Math.abs(s - s0) < Math.abs(s - s1) ? run.pts[0] : run.pts.at(-1)!;
  };
  const spanOf = (s: number) => way.spans.find(sp => s >= sp[0][0] - .05 && s <= sp.at(-1)![0] + .05);
  const pieces: TransportRun[] = [];
  let current: { deck: number[][] | undefined; stations: number[] } | null = null;
  const flush = () => {
    if (!current || current.stations.length < 2) return;
    const pts = current.stations.map(point);
    // Keep the run's own end vertices exactly, so neighbouring runs still join.
    if (current.stations[0] === s0) pts[0] = run.pts[0];
    if (current.stations.at(-1) === s1) pts[pts.length-1] = run.pts.at(-1)!;
    const deck = current.deck;
    pieces.push(deck
      ? { ...run, kind: 'bridge', pts, deckNavd88M: current.stations.map(s => profileAt(deck, s)),
        ...(deck.some(r => r[2]) && { deckWeight: current.stations.map(s => deckWeightAt(deck, s)) }) }
      : { ...run, pts });
  };
  for (let k = 0; k + 1 < ordered.length; k++) {
    const [a, b] = [ordered[k], ordered[k+1]];
    const deck = spanOf((a + b) / 2);
    if (!current || current.deck !== deck) {
      flush();
      current = { deck, stations: [a] };
    }
    current.stations.push(b);
  }
  flush();
  return pieces.some(p => p.deckNavd88M) ? pieces : null;
}

/** Deck spans for one board road in its own stations, or null when it is not a
 * registered ramp. A board road is a clipped piece of the OSM way. */
export function rampSpans(pts: P2[]): number[][][] | null {
  if (pts.length < 2) return null;
  for (const way of survey.ways) {
    const stations = pts.map(p => along(way.pts, p));
    if (stations.some(s => s.distance > .05)) continue;
    const offset = stations[0].station;
    if (stations.at(-1)!.station <= offset) continue;
    // The road's own length, so its end stations land on its end vertices.
    const length = pts.slice(1).reduce((sum, p, k) => sum + Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]), 0);
    const snap = (s: number) => Math.abs(s) < .05 ? 0 : Math.abs(s - length) < .05 ? length : s;
    const spans: number[][][] = [];
    for (const span of way.spans) {
      const local = span.map(([s, ...rest]) => [snap(s - offset), ...rest]);
      const lo = Math.max(0, local[0][0]), hi = Math.min(length, local.at(-1)![0]);
      if (hi - lo < .001) continue;
      const end = (at: number) => local.find(r => r[0] === at) ?? [at, profileAt(local, at)];
      spans.push([end(lo), ...local.filter(([s]) => s > lo && s < hi), end(hi)]);
    }
    return spans.length ? spans : null;
  }
  return null;
}

/** Replace the board's matching motorway runs with their sliced, profiled pieces (in place). */
export function applyRampDecks<T extends TerrainCity>(city: T): T {
  const data = city.terrainTransport;
  if (!data) return city;
  const roads: TransportRun[] = [];
  for (const run of data.roads) {
    if (run.cls !== 'motorway' || run.deckNavd88M || run.pts.length < 2) { roads.push(run); continue; }
    let pieces: TransportRun[] | null = null;
    for (const way of survey.ways) if ((pieces = slice(run, way))) break;
    roads.push(...(pieces ?? [run]));
  }
  data.roads = roads;
  return city;
}
