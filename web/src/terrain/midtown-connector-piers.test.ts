import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { midtownConnectorDecks } from './midtown-connector-decks';
import { midtownConnectorGround } from './midtown-connector-ground';
import { midtownConnectorPiers } from './midtown-connector-piers';
import { seventeenthAccess, seventeenthPortals } from '../city/seventeenth-street';
import { auburnTransport } from '../city/sweet-auburn-transport';
import { brookwoodGrid } from '../city/brookwood';
import { GroundGrid } from './grid';
import { GroundSurface } from './surface';
import { bridgeApproaches } from './bridge-approaches';
import { createSurfaceTransport } from './transport';
import { joins } from '../square-board/sections';
import rail from '../city/fixtures/midtown-rail.json';
import rows from '../../../pipeline/prototypes/square-board/midtown-rows.json';
it('sets bents in the medians of every Midtown deck that spans the Connector', () => {
  const counts: Record<string, number> = {}, named = new Set<string>();
  for (const row of Object.keys(rows)) {
    const read = (f: string) => readFileSync(new URL(`../../../pipeline/prototypes/square-board/${row}/${f}`, import.meta.url));
    const m = JSON.parse(read('ground.json').toString()), bytes = Uint8Array.from(read('ground.i16')).buffer;
    const grid = row.startsWith('brookwood') ? brookwoodGrid(m, midtownConnectorGround(m, bytes)) : new GroundGrid(m, midtownConnectorGround(m, bytes));
    const c = JSON.parse(read('context.json').toString()); c.terrainTransport = { version: 1, roads: [], rail: (rail as any)[row] };
    const city = midtownConnectorDecks(row === 'brookwood-south' || row === 'midtown-upper' ? seventeenthAccess(auburnTransport(c)) : auburnTransport(c));
    const surface = new GroundSurface(grid, 'high', undefined, joins(row as any));
    const banks = bridgeApproaches(seventeenthPortals(city), m.vertical.sceneZeroNavd88M, surface.sampleScene.bind(surface), city.bounds, city.roads);
    const decks = createSurfaceTransport(city, grid, banks.groundAt);
    const p = midtownConnectorPiers(city, banks.groundAt, decks.deckAt);
    counts[row] = p?.columns ?? 0;
    for (const b of p?.bents ?? []) if (b.name) named.add(b.name);
    p?.mesh.geometry.dispose();
    decks.dispose(); surface.geometry.dispose();
  }
  for (const row of Object.keys(rows)) expect(counts[row], row).toBeGreaterThan(0);
  // North Avenue and 10th Street cross the Connector on a single median pier.
  for (const name of ['North Avenue Northwest', '10th Street Northwest', '14th Street Northwest']) expect(named, name).toContain(name);
});
