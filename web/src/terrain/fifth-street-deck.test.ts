import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ribbons } from './connector-corridor';
import { midtownConnectorDecks } from './midtown-connector-decks';
import { cityRoadHeight } from '../city/road-height';
import { connectorTrafficRoutes } from '../city/connector-traffic-routes';
import landbridges from '../city/fixtures/midtown-connector/landbridges.json';
import type { TerrainCity } from './transport-data';

const row = resolve(__dirname, '../../../pipeline/prototypes/square-board/midtown-central');
const staged = existsSync(resolve(row, 'context.json'));

describe.skipIf(!staged)('the Fifth Street park deck over the Connector', () => {
  const city = { ...JSON.parse(readFileSync(resolve(row, 'context.json'), 'utf8')), terrainTransport: { version: 1, rail: [], roads: [] } } as TerrainCity;
  const manifest = JSON.parse(readFileSync(resolve(row, 'ground.json'), 'utf8'));
  const grid = new Int16Array(readFileSync(resolve(row, 'ground.i16')).buffer.slice(0));
  const ground = (x: number, z: number) => grid[Math.round((z - manifest.bounds.minZ) / 5) * manifest.cols + Math.round((x - manifest.bounds.minX) / 5)] / 10;

  it('draws and drives the freeway under the deck (OSM tags it as a tunnel)', () => {
    for (const id of [560940890, 560940891]) expect(ribbons.find(r => r.id === id)?.kind).toBe('ground');
    const fifth = connectorTrafficRoutes(city).filter(l => l.line.pts.some(([, z]) => z < -2560) && l.line.pts.some(([, z]) => z > -2550));
    expect(fifth.length).toBeGreaterThan(5);
    for (const lane of fifth) expect(lane.roads.every(r => !r.tunnel)).toBe(true);
  });

  it('carries Fifth Street on the measured deck, at least 17 ft over the freeway', () => {
    const deck = landbridges[0];
    expect(deck.name).toBe('Fifth Street Northwest');
    // Freeway grade under the deck, from the bare-earth board (the deck is not in it).
    for (const x of [55, 62, 70, 78]) expect(ground(x, -2556)).toBeLessThan(285.5);
    const span = deck.pts.map((p, i) => [p[0], deck.heights[i]]).filter(([x]) => x > 50 && x < 82);
    expect(span.length).toBeGreaterThan(6);
    for (const [x, h] of span) expect(h - ground(x, -2556)).toBeGreaterThan(5.2);
    // A car on Fifth Street reads the deck, not the freeway valley.
    const decked = midtownConnectorDecks(city);
    const height = cityRoadHeight(decked, (x, z) => ground(x, z), (x, z, part) => {
      const pts = part.pts, h = part.deckNavd88M!;
      let best = 0, d = Infinity;
      pts.forEach((p, i) => { const e = Math.hypot(p[0] - x, p[1] - z); if (e < d) { d = e; best = i; } });
      return h[best];
    });
    const road = city.roads.find(r => r.name === 'Fifth Street Northwest' && r.pts.some(([x]) => x > 100) && r.pts.some(([x]) => x < 0))!;
    const onDeck = height(66, -2555.8, road)!;
    expect(onDeck).toBeGreaterThan(291.5);
    expect(onDeck - ground(66, -2556)).toBeGreaterThan(5.2);
  });

  it('flags no other short tunnel-tagged Connector way except the covered Capitol Gateway cut', () => {
    const short = ribbons.filter(r => r.kind === 'tunnel' && r.line.length < 200).map(r => r.id);
    // Lidar over these shows continuous ground-class returns, no bridge deck: a real covered cut.
    const capitolGateway = new Set([39160886, 39160888, 39160889, 39160890, 435734520, 435734523, 580328711, 580328712]);
    expect(short.filter(id => !capitolGateway.has(id))).toEqual([]);
  });
});
