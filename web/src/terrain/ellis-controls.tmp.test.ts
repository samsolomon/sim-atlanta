import { existsSync, readFileSync } from 'node:fs';
import { cityRoadHeight } from '../city/road-height';
import { BufferAttribute } from 'three';
import { expect, it } from 'vitest';
import { brookwoodGrid } from '../city/brookwood';
import { seventeenthAccess, seventeenthPortals } from '../city/seventeenth-street';
import { auburnTransport } from '../city/sweet-auburn-transport';
import { northConnectorGround, northConnectorTransport } from '../square-board/connector-ground';
import { southConnectorTransport } from '../square-board/south-connector-decks';
import rowBounds from '../../../pipeline/prototypes/square-board/midtown-rows.json';
import { bridgeApproaches } from './bridge-approaches';
import { GroundGrid } from './grid';
import { junctionPortals } from './junction-decks';
import { midtownConnectorDecks } from './midtown-connector-decks';
import { midtownConnectorGround } from './midtown-connector-ground';
import { northAvenue } from './north-ave';
import { streetPortals } from './street-bridges';
import { GroundSurface } from './surface';
import { triangleHeight } from './tread-height';
import type { TerrainCity } from './transport-data';
import { underpassGround } from './underpass';
import { createSurfaceTransport, landingPortals } from './transport';
import { Line } from '../vignette/geom';
import { roadWidth } from './transport-data';

const root = new URL('../../../pipeline/prototypes/', import.meta.url);
const staged = new URL('../../public/data/scene/downtown/vignette.json', import.meta.url);
const read = (u: URL) => readFileSync(u);
function board(id: string) {
  if (id === 'downtown') {
    const d = new URL('downtown-ground/', root);
    return { grid: new GroundGrid(JSON.parse(read(new URL('ground.json', d)).toString()), Uint8Array.from(read(new URL('ground.i16', d))).buffer), city: JSON.parse(read(staged).toString()) as TerrainCity };
  }
  const d = new URL('square-board/' + id + '/', root);
  const manifest = JSON.parse(read(new URL('ground.json', d)).toString());
  const bytes = Uint8Array.from(read(new URL('ground.i16', d))).buffer;
  const terrain = midtownConnectorGround(manifest, bytes);
  const grid = id.startsWith('brookwood') ? brookwoodGrid(manifest, terrain)
    : id === 'north-band' ? northConnectorGround(manifest, bytes)
    : new GroundGrid(manifest, id === 'midtown-south' ? underpassGround(northAvenue, manifest, terrain) : terrain);
  const context = JSON.parse(read(new URL('context.json', d)).toString());
  const decks = id === 'north-band' ? northConnectorTransport(context) : id === 'south-band' ? southConnectorTransport(context)
    : id === 'brookwood-south' || id === 'midtown-upper' ? seventeenthAccess(auburnTransport(context)) : auburnTransport(context);
  return { grid, city: (id in rowBounds ? midtownConnectorDecks(decks) : decks) as TerrainCity };
}


it('inventories inferred landings and authored control',()=>{
  for(const id of ['downtown','north-band','south-band','north-corner','south-corner',...Object.keys(rowBounds)]){
    const {city,grid}=board(id),surface=new GroundSurface(grid,'high'),bare=surface.sampleScene.bind(surface),zero=grid.manifest.vertical.sceneZeroNavd88M;
    const land=landingPortals(city,bare,zero),streets=streetPortals(city);
    const approach=bridgeApproaches([...streets,...junctionPortals(city),...seventeenthPortals(city),...land],zero,bare,city.bounds,city.roads);
    const decks=createSurfaceTransport(city,grid,approach.groundAt);
    for(const portal of [...land,...(id==='downtown'?streets.slice(0,1):[])]){
      const a=portal.edge[0],b=portal.edge[1],x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
      const run=city.terrainTransport!.roads.find(r=>r.kind==='bridge' && [r.pts[0],r.pts.at(-1)!].some(p=>Math.hypot(p[0]-x,p[1]-z)<.2));
      const profile=[];
      for(let d=-20;d<=20;d+=.5){
        const px=x+portal.direction[0]*d,pz=z+portal.direction[1]*d;
        profile.push(d<0 && run?decks.deckAt(px,pz,run):approach.groundAt(px,pz));
      }
      console.log('SITE',JSON.stringify({id,x,z,profile,count:approach.geometry.getAttribute('position').count/3}));
    }
    surface.geometry.dispose();decks.dispose();approach.geometry.dispose();approach.walls.dispose();
  }
});
