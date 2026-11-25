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

it('records Ellis tread through the east deck joint', () => {
  const {city,grid}=board('north-corner'),zero=grid.manifest.vertical.sceneZeroNavd88M;
  const surface=new GroundSurface(grid,'high'),bare=surface.sampleScene.bind(surface);
  const approach=bridgeApproaches([...streetPortals(city),...junctionPortals(city),...seventeenthPortals(city),...landingPortals(city,bare,zero)],zero,bare,city.bounds,city.roads);
  const transport=createSurfaceTransport(city,grid,approach.groundAt);
  const run=city.terrainTransport!.roads.find(r=>r.kind==='bridge' && r.cls==='secondary' && r.pts.at(-1)?.[0]===1205.41)!;
  const before=new Line(run.pts),after=new Line(city.roads[40].pts);
  const roadHeight=cityRoadHeight(city,approach.groundAt,transport.deckAt);
  const pos=approach.geometry.getAttribute('position') as BufferAttribute;
  function approachTop(x:number,z:number){
    let height:number|null=null;
    for(let i=0;i<pos.count;i+=3){
      const y=triangleHeight(pos,i,x,z);
      if(y!==null) height=Math.max(height??-Infinity,y);
    }
    return height;
  }
  { const x=1199.288403892929,z=-593.527851986527;
    console.log('CLEARANCE',transport.deckAt(x,z,run),roadHeight(x,z,city.roads[221]),bare(x,z));
  }
  for(const offset of [-0.8,0,0.8]){
    let prev:number|null=null,prevS=0;
    for(const s of [-12,-8,-4,-2,-1,-.25,-.02,0,.02,.25,1,2,4,8,12,16,20]){
      const p=s<=0?before.at(before.length+s):after.at(s),edge=before.at(before.length),x=p.x+edge.nx*offset,z=p.z+edge.nz*offset;
      const h=s<0?transport.deckAt(x,z,run):approach.groundAt(x,z);

      const top=approachTop(x,z),deck=transport.deckAt(x,z,run);
      const wheel=roadHeight(x,z,city.roads[s<0?57:40]);
      console.log('ELLIS',JSON.stringify({offset,s,x,z,deck,approach:top,terrain:bare(x,z),
        wheel,delta:wheel===null||h===null?null:wheel-h,grade:prev===null||h===null?null:(h-prev)/(s-prevS)}));
      prev=h;prevS=s;
    }
  }
  transport.dispose();surface.geometry.dispose();approach.geometry.dispose();approach.walls.dispose();
});
