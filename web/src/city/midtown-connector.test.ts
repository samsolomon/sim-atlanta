import { expect, it } from 'vitest';
import type { TerrainCity } from '../terrain/transport-data';
import { connectorTrafficRoutes } from './connector-traffic-routes';

import { readFileSync } from 'node:fs';
import { midtownConnectorGround } from '../terrain/midtown-connector-ground';
import { GroundGrid } from '../terrain/grid';
import { GroundSurface } from '../terrain/surface';
import { createSurfaceTransport } from '../terrain/transport';
import { midtownConnectorDecks } from '../terrain/midtown-connector-decks';
import { joins, midtownRows } from '../square-board/sections';
import { auburnTransport } from './sweet-auburn-transport';
import { seventeenthAccess, seventeenthPortals } from './seventeenth-street';
import { bridgeApproaches } from '../terrain/bridge-approaches';
import { brookwoodGrid } from './brookwood';
import { cityRoadHeight } from './road-height';

it('carries traffic in both directions between the downtown mainline and both Brookwood branches', () => {
  const city = { bounds: { minX: -1000, maxX: 1800, minZ: -5700, maxZ: 1100 } } as TerrainCity;
  const routes = connectorTrafficRoutes(city).filter(r => r.crossing);
  for (const dir of ['northbound', 'southbound']) {
    const ends = routes.filter(r => r.direction === dir).map(r =>
      dir === 'northbound' ? r.line.pts.at(-1)! : r.line.pts[0]);
    expect(ends.some(([x,z]) => x === -1000 && z < -4900)).toBe(true);
    expect(ends.some(([x,z]) => x > 500 && z === -5700)).toBe(true);
  }
});

it.each(['high', 'low'] as const)('samples the mounted Midtown surfaces at %s detail', quality => {
  const scene = midtownRows.map(row => {
    const read = (file: string) => readFileSync(new URL('../../../pipeline/prototypes/square-board/'+row+'/'+file, import.meta.url));
    const manifest = JSON.parse(read('ground.json').toString()), bytes = Uint8Array.from(read('ground.i16')).buffer;
    const grid = row.startsWith('brookwood') ? brookwoodGrid(manifest, midtownConnectorGround(manifest, bytes)) : new GroundGrid(manifest,bytes);
    const city = midtownConnectorDecks(seventeenthAccess(auburnTransport(JSON.parse(read('context.json').toString()))));
    const surface = new GroundSurface(grid, quality, undefined, joins(row));
    const banks = bridgeApproaches(seventeenthPortals(city), 323.8, surface.sampleScene.bind(surface), city.bounds, city.roads);
    const decks = createSurfaceTransport(city, grid, banks.groundAt);
    return {city,decks,banks,surface,height:cityRoadHeight(city,banks.groundAt,decks.deckAt)};
  });
  try {
    const brookwood = scene[midtownRows.indexOf('brookwood-south')];
    const crossing = brookwood.city.roads.find(r => r.name === 'Northeast Expressway' && r.pts[0][0] === -193.55)!;
    const lower = brookwood.city.roads.find(r => r.pts[0][0] === -386.94)!;
    const freeway = brookwood.height(-193.42,-4685.54,crossing)!;
    expect(freeway + 323.8).toBeCloseTo(265.83, 0);
    expect(freeway - brookwood.height(-193.42,-4685.54,lower)!).toBeGreaterThan(8);

    const station = scene[midtownRows.indexOf('brookwood-station')];
    const ramp = station.city.roads.find(r => r.sub === 'link' && r.pts[0][0] === 79.17)!;
    expect(station.height(-47.77,-5066.48,ramp)! + 323.8).toBeCloseTo(260.5, 0);

    // 10th Street carries its 25.6 m inventory width at the abutment and
    // narrows to the mapped street where the approach meets bare earth.
    const central = scene[midtownRows.indexOf('midtown-central')];
    const approach = (x: number) => central.city.terrainTransport!.roads.find(r =>
      r.name === '10th Street Northwest' && r.deckWeight && r.sourceAxis?.[0][0] === x)!;
    expect(central.decks.deckAt(17,-3064.1,approach(19.17))).not.toBeNull();
    expect(central.decks.deckAt(-17,-3065.7,approach(-0.83))).toBeNull();
    expect(central.decks.deckAt(-17,-3072.7,approach(-0.83))).not.toBeNull();

    const routes = connectorTrafficRoutes(scene[0].city, scene.slice(1).map(board => board.city));
    let openSamples = 0;
    for (const route of routes) {
      for (let s=3; s<route.line.length; s+=3) {
        const p = route.line.at(s);
        const owner = route.roads[Math.floor(route.line.vertexAt(s))];
        if (owner.tunnel) continue;
        const board = scene.find(b => p.z >= b.city.bounds.minZ && p.z <= b.city.bounds.maxZ)!;
        if (board.height(p.x,p.z,owner) === null) {
          throw Error('No supporting pavement at ' + [p.x,p.z] + ' on ' + owner.pts[0]);
        }
        openSamples++;
      }
    }
    expect(openSamples).toBeGreaterThan(10000);
  } finally {
    for (const board of scene) {
      board.decks.dispose();
      board.surface.geometry.dispose();
      board.banks.geometry.dispose();
      board.banks.walls.dispose();
    }
  }
});
