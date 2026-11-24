import landings from '../city/fixtures/midtown-connector/landings.json';
import crossings from '../city/fixtures/midtown-connector/crossings.json';
import approaches from '../city/fixtures/midtown-connector/approaches.json';
import profiles from '../city/fixtures/midtown-connector/decks.json';
import landbridges from '../city/fixtures/midtown-connector/landbridges.json';
import type { TerrainCity, TransportRun } from './transport-data';
import { FIFTH_PARK, onFifthStreetPark } from './fifth-street-park';
import type { P2 } from '../vignette/geom';

const walkways = new Set(['footway', 'pedestrian', 'steps', 'path', 'cycleway']);
const endKey = (start: number[], end: number[]) => start.join(',') + '/' + end.join(',');
const landingByEnds = new Map(landings.map(p => [endKey(p.start,p.end),p]));
const surveyed = new Map(profiles.map(p => [endKey(p.start, p.end), p]));

const landbridgeByRoad = new Map(landbridges.map(p => [endKey(p.start, p.end), p]));
/** Fifth Street's park deck (Georgia Tech, 2007; ASPIRE Winter 2008): a 48 ft (14.6 m) roadway
 * between two 24 ft sidewalks. The landscaped decks beyond them are fifth-street-park.ts, which
 * paints the lanes (so the run carries one undivided lane here). */
const LAND_BRIDGE = { road: { width: 2 * FIFTH_PARK.roadHalf, lanes: 1, opposing: 0 },
  plazaOffset: (FIFTH_PARK.roadHalf + FIFTH_PARK.walkOuter) / 2, plazaWidth: FIFTH_PARK.walkOuter - FIFTH_PARK.roadHalf, blendM: FIFTH_PARK.blendM };

/** A polyline offset sideways (+ is left of travel). */
function offset(pts: P2[], by: number): P2[] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1], n = Math.hypot(dx, dz) || 1;
    return [p[0] - dz / n * by, p[1] + dx / n * by];
  });
}

const approachesByRoad = new Map<string, typeof approaches>();
for (const part of approaches) {
  const key = endKey(part.start, part.end);
  const parts = approachesByRoad.get(key) ?? [];
  parts.push(part);
  approachesByRoad.set(key, parts);
}

/** Use the measured carrying surface for pavement and the vehicles sampling it. */
export function midtownConnectorDecks(city: TerrainCity): TerrainCity {
  const transport = city.terrainTransport!;
  const roads: TransportRun[] = transport.roads.map(run => {
    if (run.kind !== 'bridge') return run;
    const key = endKey(run.pts[0], run.pts.at(-1)!);
    const landing = landingByEnds.get(key);
    if (landing) {
      // The mapped sidewalk on the east 17th approach follows the finished
      // bank. The two Peachtree walks sit on the depot model's 273 m deck.
      return { ...run, sourceAxis: run.pts, deckNavd88M: run.pts.map(() => 273),
        deckWeight: landing.bank ? run.pts.map(() => 0) : undefined };
    }
    const p = surveyed.get(key);
    return p ? { ...run, sourceAxis: run.pts, pts: p.pts as P2[], deckNavd88M: p.heights } : run;
  });
  for (const road of city.roads) {
    if (road.tunnel || road.pts.length < 2) continue;
    const land = landbridgeByRoad.get(endKey(road.pts[0], road.pts.at(-1)!));
    if (land) {
      // The deck meets the street at grade: blend the profile into bare earth over its last metres.
      const pts = land.pts as P2[];
      let total = 0;
      const cum = pts.map((p, i) => (total += i ? Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0));
      const weights = cum.map(s => Math.min(1, s / LAND_BRIDGE.blendM, (total - s) / LAND_BRIDGE.blendM));
      roads.unshift({ cls: road.cls, name: road.name, sub: road.sub ?? undefined, kind: 'bridge', sourceAxis: road.pts,
        pts, deckNavd88M: land.heights, deckWeight: weights, crossSection: { ...LAND_BRIDGE.road } });
      for (const side of [1, -1]) {
        const plaza = offset(pts, side * LAND_BRIDGE.plazaOffset);
        roads.unshift({ cls: 'footway', name: null, kind: 'bridge', sourceAxis: plaza, pts: plaza,
          deckNavd88M: land.heights, deckWeight: weights, crossSection: { width: LAND_BRIDGE.plazaWidth, lanes: 1, opposing: 0 } });
      }
    }
    for (const part of approachesByRoad.get(endKey(road.pts[0], road.pts.at(-1)!)) ?? []) {
      roads.unshift({ cls: road.cls, name: road.name, sub: road.sub ?? undefined, kind: 'bridge',
        sourceAxis: road.pts, pts: part.pts as P2[], deckNavd88M: part.heights, deckWeight: part.weights });
    }
  }
  for (const run of roads) {
    const name = run.name;
    // The inventory describes the carriageway, never a sidewalk sharing its name.
    if (run.sourceAxis && name && Object.hasOwn(crossings, name) && !walkways.has(run.cls)) {
      run.crossSection = crossings[name as keyof typeof crossings];
    }
  }
  return { ...city, terrainTransport: { ...transport, roads } };
}

/** A Midtown row's canopy without crowns on the Fifth Street park deck: the generic trees stand
 * on bare earth, which there is the freeway below. The park plants them on the deck instead. */
export function withoutLandBridgeTrees<C extends { trees: number[][]; treeLowCount?: number }>(context: C): C {
  const keep = context.trees.map(([x, z]) => !onFifthStreetPark(x, z));
  if (keep.every(Boolean)) return context;
  const low = context.treeLowCount === undefined ? undefined : keep.slice(0, context.treeLowCount).filter(Boolean).length;
  return { ...context, trees: context.trees.filter((_, i) => keep[i]), treeLowCount: low };
}
