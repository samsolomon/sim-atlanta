import approaches from '../city/fixtures/midtown-connector/approaches.json';
import profiles from '../city/fixtures/midtown-connector/decks.json';
import type { TerrainCity, TransportRun } from './transport-data';
import type { P2 } from '../vignette/geom';

const endKey = (start: number[], end: number[]) => start.join(',') + '/' + end.join(',');
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
    const p = surveyed.get(endKey(run.pts[0], run.pts.at(-1)!));
    return p ? { ...run, sourceAxis: run.pts, pts: p.pts as P2[], deckNavd88M: p.heights } : run;
  });
  for (const road of city.roads) {
    if (road.tunnel || road.pts.length < 2) continue;
    for (const part of approachesByRoad.get(endKey(road.pts[0], road.pts.at(-1)!)) ?? []) {
      roads.unshift({ cls: road.cls, name: road.name, sub: road.sub ?? undefined, kind: 'bridge',
        sourceAxis: road.pts, pts: part.pts as P2[], deckNavd88M: part.heights, deckWeight: part.weights });
    }
  }
  return { ...city, terrainTransport: { ...transport, roads } };
}
