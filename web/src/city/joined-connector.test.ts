import junctionDecks from '../../../pipeline/prototypes/connector-footprint/junction-decks.json';
import streetDecks from '../../../pipeline/prototypes/connector-footprint/street-bridges.json';
import { follows, streetPortals } from '../terrain/street-bridges';
import { junctionPortals } from '../terrain/junction-decks';
import { bridgeApproaches } from '../terrain/bridge-approaches';
import { GroundGrid } from '../terrain/grid';
import { existsSync, readFileSync } from 'node:fs';
import type { InstancedMesh } from 'three';
import { expect, it } from 'vitest';
import { createSurfaceTransport } from '../terrain/transport';
import type { TerrainCity } from '../terrain/transport-data';
import { GroundSurface } from '../terrain/surface';
import { auburnGround, auburnTransport } from './sweet-auburn-transport';
import { cityRoadHeight } from './road-height';
import { ConnectorTraffic, CONNECTOR_TRAFFIC_CAP } from './connector-traffic';
import { northConnectorGround } from '../square-board/connector-ground';
import { connectorTrafficRoutes } from './connector-traffic-routes';
import { connectorSectionAtStation, laneKey, successors, ribbons, sectionAt, stripePoint } from '../terrain/connector-corridor';

const auburn = new URL('../../../pipeline/prototypes/sweet-auburn/', import.meta.url);
const context: TerrainCity = JSON.parse(readFileSync(new URL('context.json', auburn), 'utf8'));

it('carries cars above the Auburn, Edgewood and Leonard Tate streets, including ways tagged ground between decks', () => {
  const manifest = JSON.parse(readFileSync(new URL('ground/ground.json', auburn), 'utf8'));
  const bytes = Uint8Array.from(readFileSync(new URL('ground/ground.i16', auburn))).buffer;
  const grid = auburnGround(manifest, bytes);
  const ground = new GroundSurface(grid, 'low');
  const groundAt = ground.sampleScene.bind(ground);
  const city = auburnTransport(context);
  const decks = createSurfaceTransport(city, grid, groundAt);
  const roadAt = cityRoadHeight(city, groundAt, decks.deckAt);
  try {
    // Starts identify each directed source way. The third starts between the
    // two tagged crossings, but its class-17 returns continue across the block.
    for (const [startX,x,z,h] of [[1199.25,1199,-180,305.4], [1199.25,1191,-59,306.7],
      [1234.37,1230,-285,303.9], [1115.8,1108,160,307.4]]) {
      const owner = context.roads.find(r => r.cls === 'motorway' && !r.sub && r.pts[0][0] === startX)!;
      const road = roadAt(x,z,owner);
      expect(road).not.toBeNull();
      expect(Math.abs(road! + manifest.vertical.sceneZeroNavd88M - h)).toBeLessThan(.45);
      expect(road! - groundAt(x,z)!).toBeGreaterThan(5.5);
    }
    // The managed ramp creates a second section inside the older SB road way.
    // Every lane on both sides of that node must have a supporting deck.
    const parts = ribbons.filter(r => r.id === 38945231);
    expect(parts).toHaveLength(2);
    for (const r of parts) {
      const owner = { cls:'motorway', sub:null, name:'Downtown Connector', pts:r.pts, bridge:true, tunnel:false };
      for (const fraction of [.2,.5,.8]) {
        const row = sectionAt(r,r.line.length*fraction);
        for (let i=0; i<r.lanes; i++) {
          const [x,z] = stripePoint(row,(i+.5)/r.lanes);
          expect(roadAt(x,z,owner), String([x,z])).not.toBeNull();
        }
      }
    }
  } finally {
    decks.dispose();
    ground.geometry.dispose();
  }
});

const downtown = new URL('../../public/data/scene/downtown/vignette.json', import.meta.url);
it.skipIf(!existsSync(downtown))('uses a single car budget across the two eastern joins and clips the missing corner', () => {
  const west: TerrainCity = JSON.parse(readFileSync(downtown, 'utf8'));
  const king: TerrainCity = JSON.parse(readFileSync(new URL('../../../pipeline/prototypes/king-memorial/context.json', import.meta.url), 'utf8'));
  const north = auburnTransport(context);
  const layer = new ConnectorTraffic({ city: west, quality:'low', hourly:{
    weekday:Array(24).fill(1/24),weekend:Array(24).fill(1/24) }, roadHeight:()=>1,
    neighbors:[{city:king,roadHeight:()=>2},{city:north,roadHeight:()=>3}] });
  const seen = new Set<number>();
  try {
    for (let seconds=0; seconds<60; seconds+=3) {
      layer.update(Date.UTC(2026,10,20,17,0,seconds),0);
      expect(layer.visibleCars).toBeLessThanOrEqual(CONNECTOR_TRAFFIC_CAP.low);
      for (const mesh of layer.group.children as InstancedMesh[]) {
        const arr = mesh.instanceMatrix.array;
        for (let i=0; i<mesh.count; i++) {
          const [x,y,z] = [arr[16*i+12], arr[16*i+13], arr[16*i+14]];
          expect(x>1000 && (z < -520 || z > 640)).toBe(false);
          if (x<998 || x>1002 && Math.abs(z-280)>4) seen.add(Math.round(y));
        }
      }
    }
    expect(seen).toEqual(new Set([1,2,3]));
  } finally { layer.dispose(); }
});

it('carries the seven Midtown approach lanes across the 249C split and the low-tier ground join', () => {
  const boards = ['north-band', 'midtown-south'].map(id => {
    const dir = new URL('../../../pipeline/prototypes/square-board/' + id + '/', import.meta.url);
    const read = (name: string) => readFileSync(new URL(name, dir));
    const manifest = JSON.parse(read('ground.json').toString());
    const grid = northConnectorGround(manifest, Uint8Array.from(read('ground.i16')).buffer);
    const surface = new GroundSurface(grid, 'low');
    const city = JSON.parse(read('context.json').toString()) as TerrainCity;
    return { city, surface, height: cityRoadHeight(city, surface.sampleScene.bind(surface)) };
  });
  try {
    const [north, midtown] = boards;
    const routes = connectorTrafficRoutes(north.city, [midtown.city]);
    const way = (id: number) => ribbons.find(r => r.id === id)!;
    const approach = way(337901411), through = way(1467386395), exit = way(9236635);
    expect(approach.station0).toBeTypeOf('number');
    expect(through.station0).toBeCloseTo(approach.station0! + approach.line.length, 8);
    for (const r of ribbons.filter(r => !r.link)) {
      expect(connectorSectionAtStation(r.direction, r.station0!)?.ribbon).toBe(r);
    }
    for (const ribbon of [approach, way(337901447)]) {
      const at = connectorSectionAtStation(ribbon.direction, ribbon.station0! + 80)!;
      expect(at.ribbon).toBe(ribbon);
      expect(at.section.s).toBeCloseTo(80);
      // Both directions use a common eight-metre station grid across source ways.
      const regular = ribbon.rows.filter(row => Math.abs((ribbon.station0! + row.s) / 8 -
        Math.round((ribbon.station0! + row.s) / 8)) < 1e-8);
      expect(regular.length).toBeGreaterThan(35);
    }

    expect(connectorSectionAtStation(through.direction, through.station0!)?.ribbon).toBe(through);
    for (let lane = 0; lane < 7; lane++) {
      const next = successors.get(laneKey({ ribbon: approach, lane }))!;
      const expected = [
        ...(lane < 6 ? [{ ribbon: through, lane }] : []),
        ...(lane >= 5 ? [{ ribbon: exit, lane: lane - 5 }] : []),
      ];
      expect(next.map(laneKey).sort()).toEqual(expected.map(laneKey).sort());
      const first = stripePoint(approach.rows[0], (lane + .5) / approach.lanes);
      for (const target of expected) {
        const end = stripePoint(approach.rows.at(-1)!, (lane + .5) / approach.lanes);
        const start = stripePoint(target.ribbon.rows[0], (target.lane + .5) / target.ribbon.lanes);
        expect(Math.hypot(end[0] - start[0], end[1] - start[1])).toBeLessThan(.001);
        const route = routes.find(r => r.roads.some(road => road.pts === target.ribbon.pts) &&
          r.line.pts.some(p => Math.hypot(p[0] - first[0], p[1] - first[1]) < .001));
        expect(route).toBeDefined();
        const i = route!.line.pts.findIndex(p => Math.abs(p[1] + 1700) < 1e-6);
        expect(i).toBeGreaterThan(0);
        const [x,z] = route!.line.pts[i], road = route!.roads[i-1];
        const y = north.height(x,z,road);
        expect(y).not.toBeNull();
        expect(midtown.height(x,z,road)).toBeCloseTo(y!, 5);
      }
    }
  } finally { for (const b of boards) b.surface.geometry.dispose(); }
});

it.skipIf(!existsSync(downtown))('carries both illustrative mainline routes below Baker, Courtland and Peachtree', () => {
  const city: TerrainCity = JSON.parse(readFileSync(downtown, 'utf8'));
  const dir = new URL('../../../pipeline/prototypes/downtown-ground/', import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL('ground.json', dir), 'utf8'));
  const grid = new GroundGrid(manifest, Uint8Array.from(readFileSync(new URL('ground.i16', dir))).buffer);
  const ground = new GroundSurface(grid, 'low');
  const bare = ground.sampleScene.bind(ground);
  const portals = [...streetPortals(city), ...junctionPortals(city)];
  const approach = bridgeApproaches(portals, manifest.vertical.sceneZeroNavd88M, bare, city.bounds, city.roads);
  const decks = createSurfaceTransport(city, grid, approach.groundAt);
  const roadAt = cityRoadHeight(city, approach.groundAt, decks.deckAt);
  try {
    const routes = connectorTrafficRoutes(city);
    const peachtree = streetDecks.find(d => d.name === 'Peachtree Street Northeast')!;
    const courtland = junctionDecks.find(d => d.outlineId === 875253220)!;
    for (const site of [junctionDecks.find(d => d.outlineId === 953207661)!, courtland, peachtree]) {
      const streets = city.terrainTransport!.roads.filter(r => r.kind === 'bridge' &&
        ['secondary', 'tertiary'].includes(r.cls) && follows(r.pts, site.roads));
      const directions = new Set<string>();
      let min = Infinity;
      for (const route of routes) {
        for (let s = 5; s < route.line.length - 5; s += 5) {
          const { x, z } = route.line.at(s);
          const owner = route.roads[Math.floor(route.line.vertexAt(s))];
          if (owner.sub === 'link') continue;
          const tread = streets.map(r => decks.deckAt(x, z, r)).find(h => h !== null);
          if (tread == null) continue;
          const y = roadAt(x,z,owner);
          expect(y, String([x,z])).not.toBeNull();
          min = Math.min(min, tread - y!);
          directions.add(route.direction);
        }
      }
      expect(directions).toEqual(new Set(['northbound', 'southbound']));
      expect(min).toBeGreaterThan(4);
    }
  } finally {
    decks.dispose();
    approach.geometry.dispose();
    approach.walls.dispose();
    ground.geometry.dispose();
  }
});
