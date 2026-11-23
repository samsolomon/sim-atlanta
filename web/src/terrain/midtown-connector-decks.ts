import landings from '../city/fixtures/midtown-connector/landings.json';
import crossings from '../city/fixtures/midtown-connector/crossings.json';
import approaches from '../city/fixtures/midtown-connector/approaches.json';
import profiles from '../city/fixtures/midtown-connector/decks.json';
import type { TerrainCity, TransportRun } from './transport-data';
import type { P2 } from '../vignette/geom';

const walkways = new Set(['footway', 'pedestrian', 'steps', 'path', 'cycleway']);
const endKey = (start: number[], end: number[]) => start.join(',') + '/' + end.join(',');
const landingByEnds = new Map(landings.map(p => [endKey(p.start,p.end),p]));
const surveyed = new Map(profiles.map(p => [endKey(p.start, p.end), p]));

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
