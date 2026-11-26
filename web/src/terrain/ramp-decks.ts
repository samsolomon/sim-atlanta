import survey from '../../../pipeline/prototypes/connector-footprint/ramp-decks.json';
import osmWays from '../../../pipeline/prototypes/connector-footprint/ways.json';
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

type OsmWay = { lanes: number; link: boolean; pts: number[][] };
const allWays = Object.values(osmWays as unknown as Record<string, OsmWay>);

/** Where a deck piece ends at the end of its way and the one way leaving there
 * carries more lanes (1450884836 into 38974038), a point 1 m into that way. The
 * deck widens to it (transport.ts) instead of leaving the added lane's slab end
 * standing over open air. */
export function laneGain(pts: P2[]): P2 | undefined {
  if (pts.length < 2) return;
  const end = pts.at(-1)!, prev = pts.at(-2)!;
  const same = (a: number[], b: number[]) => Math.abs(a[0]-b[0]) < .01 && Math.abs(a[1]-b[1]) < .01;
  const mine = allWays.find(w => same(w.pts.at(-1)!, end) && along(w.pts.slice(-2), prev).distance < .05);
  const next = allWays.filter(w => same(w.pts[0], end));
  if (!mine || next.length !== 1 || next[0].link !== mine.link || next[0].lanes <= mine.lanes) return;
  const [a, b] = next[0].pts, l = Math.hypot(b[0]-a[0], b[1]-a[1]);
  return [a[0] + (b[0]-a[0]) / l, a[1] + (b[1]-a[1]) / l];
}

/** Cut a run into ground pieces and profiled deck pieces at its span ends. */
function sliceRun(run: TransportRun, spans: number[][][]): TransportRun[] {
  const cum = [0];
  for (let k = 1; k < run.pts.length; k++) cum.push(cum[k-1] + Math.hypot(run.pts[k][0]-run.pts[k-1][0], run.pts[k][1]-run.pts[k-1][1]));
  const length = cum.at(-1)!;
  // Station breaks: run vertices plus span rows inside the run. Survey stations
  // are rounded to the centimetre: a row that close to a run vertex is that
  // vertex, or a sliver piece would open the joint.
  const cuts = new Set<number>(cum);
  for (const sp of spans) for (const [s] of sp)
    if (s > 0 && s < length && cum.every(c => Math.abs(s - c) > .05)) cuts.add(s);
  const ordered = [...cuts].sort((a, b) => a - b);
  const point = (s: number): P2 => {
    const k = cum.indexOf(s);
    if (k >= 0) return run.pts[k];
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const t = (s - cum[i-1]) / (cum[i] - cum[i-1]), p = run.pts[i-1], q = run.pts[i];
    return [p[0] + t*(q[0]-p[0]), p[1] + t*(q[1]-p[1])];
  };
  const spanOf = (s: number) => spans.find(sp => s >= sp[0][0] - .05 && s <= sp.at(-1)![0] + .05);
  const pieces: TransportRun[] = [];
  let current: { deck: number[][] | undefined; stations: number[] } | null = null;
  const flush = () => {
    if (!current || current.stations.length < 2) return;
    const pts = current.stations.map(point), deck = current.deck;
    const gain = deck && laneGain(pts);
    pieces.push(deck
      ? { ...run, kind: 'bridge', pts, deckNavd88M: current.stations.map(s => profileAt(deck, s)),
        ...(deck.some(r => r[2]) && { deckWeight: current.stations.map(s => deckWeightAt(deck, s)) }),
        ...(gain && { widenInto: gain }) }
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
  return pieces;
}

/** Deck spans for a board polyline in its own stations, or null when no part of
 * it is a registered ramp. A board road may be a clipped piece of one OSM way or
 * several ways merged end to end; spans of consecutive ways that meet at a shared
 * vertex become one span, so the deck does not break there. */
export function rampSpans(pts: P2[]): number[][][] | null {
  if (pts.length < 2) return null;
  const cum = [0];
  for (let k = 1; k < pts.length; k++) cum.push(cum[k-1] + Math.hypot(pts[k][0]-pts[k-1][0], pts[k][1]-pts[k-1][1]));
  const spans: number[][][] = [];
  for (const way of survey.ways) {
    const stations = pts.map(p => along(way.pts, p));
    for (let k = 0; k < pts.length;) {
      if (stations[k].distance > .05) { k++; continue; }
      let j = k;
      while (j + 1 < pts.length && stations[j+1].distance <= .05) j++;
      // The vertices k..j run along this way, in its direction.
      if (j > k && stations[j].station > stations[k].station) {
        const lo0 = cum[k], hi0 = cum[j], offset = stations[k].station - lo0;
        const snap = (s: number) => Math.abs(s - lo0) < .05 ? lo0 : Math.abs(s - hi0) < .05 ? hi0 : s;
        for (const span of way.spans) {
          const local = span.map(([s, ...rest]) => [snap(s - offset), ...rest]);
          const lo = Math.max(lo0, local[0][0]), hi = Math.min(hi0, local.at(-1)![0]);
          if (hi - lo < .001) continue;
          const end = (at: number) => local.find(r => r[0] === at) ?? [at, profileAt(local, at)];
          spans.push([end(lo), ...local.filter(([s]) => s > lo && s < hi), end(hi)]);
        }
      }
      k = j + 1;
    }
  }
  if (!spans.length) return null;
  spans.sort((a, b) => a[0][0] - b[0][0]);
  const merged = [spans[0]];
  for (const span of spans.slice(1)) {
    const last = merged.at(-1)!;
    if (Math.abs(span[0][0] - last.at(-1)![0]) < .05) last.push(...span.slice(1));
    else merged.push(span);
  }
  return merged;
}

/** Replace the board's matching motorway runs with their sliced, profiled pieces
 * (in place). Downtown ground roads that carry a ramp span (the MLK SB ramps)
 * have no baked run: they get pieces of their own and are marked as structure,
 * as auburnTransport does, so the board stops drawing them as plain ground. */
export function applyRampDecks<T extends TerrainCity>(city: T): T {
  const data = city.terrainTransport;
  if (!data) return city;
  const roads: TransportRun[] = [];
  for (const run of data.roads) {
    const spans = run.cls === 'motorway' && !run.deckNavd88M && run.pts.length > 1 ? rampSpans(run.pts) : null;
    roads.push(...(spans ? sliceRun(run, spans) : [run]));
  }
  city.roads = city.roads.flatMap(road => {
    if (road.cls !== 'motorway' || road.bridge || road.tunnel || road.pts.length < 2) return [road];
    const spans = rampSpans(road.pts);
    if (!spans) return [road];
    // Only the spanned pieces become structure. The rest of the road stays a board road,
    // drawn on the board as before: as a transport run of its own it was drawn on bare
    // ground above the cut (39169033 below the Baker flyovers, release 18's ellis-high).
    const pieces = sliceRun({ cls: road.cls, name: road.name, sub: road.sub ?? undefined, pts: road.pts, kind: 'ground' }, spans);
    roads.push(...pieces.filter(p => p.kind === 'bridge'));
    return pieces.map(p => ({ ...road, pts: p.pts, bridge: p.kind === 'bridge' }));
  });
  data.roads = roads;
  return city;
}
