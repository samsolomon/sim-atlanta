import { existsSync, readFileSync } from 'node:fs';
import type { InstancedMesh } from 'three';
import { expect, it } from 'vitest';
import { createSurfaceTransport } from '../terrain/transport';
import type { TerrainCity } from '../terrain/transport-data';
import { GroundSurface } from '../terrain/surface';
import { auburnGround, auburnTransport } from './sweet-auburn-transport';
import { cityRoadHeight } from './road-height';
import { ConnectorTraffic, CONNECTOR_TRAFFIC_CAP } from './connector-traffic';
import { ribbons, sectionAt, stripePoint } from '../terrain/connector-corridor';

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
