import {ribbons,sectionAt,stripePoint} from './connector-corridor';
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


it('profiles Williams links either side of the cut',()=>{
  const boards=['downtown','north-band'].map(id=>{
    const {city,grid}=board(id),surface=new GroundSurface(grid,'high'),bare=surface.sampleScene.bind(surface);
    const bank=bridgeApproaches([...streetPortals(city),...junctionPortals(city),...seventeenthPortals(city),...landingPortals(city,bare,grid.manifest.vertical.sceneZeroNavd88M)],grid.manifest.vertical.sceneZeroNavd88M,bare,city.bounds,city.roads);
    const decks=createSurfaceTransport(city,grid,bank.groundAt);
    return {city,bare,decks,wheel:cityRoadHeight(city,bank.groundAt,decks.deckAt)};
  });
  const ways=JSON.parse(read(new URL('connector-footprint/ways.json',root)).toString());
  const northRoads=JSON.parse(read(new URL('square-board/north-band/context.json',root)).toString()).roads;
  for(const [id,di,ni] of [[1450813223,2392,987],[1450813225,2394,988],[1450813220,2399,986]]){
    const way=ways[id];
    for(const z of Array.from({length:1841},(_,i)=>-1320+i*.025)){
      const i=way.pts.findIndex((b:number[],j:number)=>j && (way.pts[j-1][1]-z)*(b[1]-z)<=0);
      if(i<1)continue;
      const [a,b]=way.pts.slice(i-1,i+1);
      const x=a[0]+(z-a[1])*(b[0]-a[0])/(b[1]-a[1]);
      const which=z< -1300?1:0,board=boards[which];
      const raw=which ? northRoads[ni]:board.city.roads[di];
      const road=board.city.roads.find(r=>r.cls===raw.cls && String(r.pts)===String(raw.pts))!;
      const ribbon=ribbons.find(r=>r.id===id && r.pts.some((p,i)=>i && (p[1]-z)*(r.pts[i-1][1]-z)<=0))!;
      for(const off of [0,-.8,.8,-way.lanes*3.55/2,way.lanes*3.55/2]){
        const f=.5+off/(way.lanes*3.55);
        let lo=0,hi=ribbon.line.length;
        const sign=Math.sign(ribbon.pts.at(-1)![1]-ribbon.pts[0][1]);
        for(let k=0;k<35;k++){const mid=(lo+hi)/2;if((stripePoint(sectionAt(ribbon,mid),f)[1]-z)*sign<0)lo=mid;else hi=mid;}
        const [px,pz]=stripePoint(sectionAt(ribbon,(lo+hi)/2),f);
        const ground=board.bare(px,pz);
        const treads=board.city.terrainTransport!.roads.flatMap((r,i)=>{
          if(r.kind!=='bridge'||r.cls!=='motorway')return [];
          const h=board.decks.deckAt(px,pz,r);
          return h===null?[]:[[i,h]];
        });
        console.log('WILLIAMS',JSON.stringify({id,z,pz,x:px,off,ground,treads,wheel:road?board.wheel(px,pz,road):null}));
      }
    }
  }
});
