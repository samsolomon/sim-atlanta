// Source-directed road cross sections on the untouched and corrected City tread.
import {Line} from "../../../web/src/vignette/geom";
import { readFileSync } from 'node:fs';
import { brookwoodGrid } from '../../../web/src/city/brookwood';
import { midtownConnectorGround } from '../../../web/src/terrain/midtown-connector-ground';
import { auburnTransport } from '../../../web/src/city/sweet-auburn-transport';
import { midtownConnectorDecks } from '../../../web/src/terrain/midtown-connector-decks';
import { GroundSurface } from '../../../web/src/terrain/surface';
import { createSurfaceTransport } from '../../../web/src/terrain/transport';
import { matchRibbon, sectionAt, stripePoint, ribbons } from '../../../web/src/terrain/connector-corridor';
import { bridgeApproaches } from '../../../web/src/terrain/bridge-approaches';
import { seventeenthPortals } from '../../../web/src/city/seventeenth-street';
import { cityRoadHeight } from '../../../web/src/city/road-height';

import { northFreeway } from './carrier';

const north=process.argv.includes('--north');
const base=north?'pipeline/prototypes/north-row-transport/':'pipeline/prototypes/square-board/brookwood-station/';
const manifest = JSON.parse(readFileSync(base+'ground.json','utf8'));
const bytes = Uint8Array.from(readFileSync(base+'ground.i16')).buffer;
const grid = brookwoodGrid(manifest, midtownConnectorGround(manifest,bytes));
const original = midtownConnectorDecks(auburnTransport(JSON.parse(readFileSync(base+'context.json','utf8'))));
const city = process.argv.includes('--after') ? northFreeway(original) : original;
const surface = new GroundSurface(grid, process.argv.includes('--high')?'high':'low', undefined, [{z:-5700,minX:-1000,maxX:1800},{z:-4900,minX:-1000,maxX:1800}]);
const banks = bridgeApproaches(seventeenthPortals(city),323.8,surface.sampleScene.bind(surface),city.bounds,city.roads);
const transport = createSurfaceTransport(city,grid,banks.groundAt);
const height = cityRoadHeight(city,banks.groundAt,transport.deckAt);
const rows = [];
const wheelMode=process.argv.includes('--wheels');
for(const id of [484857196,484857197,1257642776,369529900,1409808969,38981789,1416312985,484857195]) {
 const r = ribbons.find(r=>r.id===id)!;
 const road=city.roads.find(w=>w.cls==='motorway' && w.pts.length>1 &&
   matchRibbon(w.pts[0],w.pts[1],w.sub==='link')===r);
 if(!road) { if(north)continue; throw Error('No source road '+id); }
 for(let s=1;s<r.line.length;s+=4){
  const row=sectionAt(r,s);
  const plane=[.01,.5,.99].map(f=>stripePoint(row,f));
  if(plane.some(p=>p[1]<=city.bounds.minZ+.05||p[1]>=city.bounds.maxZ-.05))continue;
  const heights=plane.map(([x,z])=>height(x,z,road));
  const width=Math.hypot(plane[2][0]-plane[0][0],plane[2][1]-plane[0][1]);
  if(wheelMode) {
    for(let lane=0;lane<r.lanes;lane++) {
      for(const dz of [-1.3575,1.4675]) for(const dx of [-.79,.79]) {
        const axle=sectionAt(r,s+dz);
        const [x,z]=stripePoint(axle,(lane+.5+dx/3.55)/r.lanes);
        const tread=height(x,z,{...road,pts:r.pts});
        const bare=banks.groundAt(x,z);
        rows.push({id,s,lane,dx,dz,x,z,tread,bare});
      }
    }
    continue;
  }
  const ground=plane.map(([x,z])=>banks.groundAt(x,z));
  rows.push({ground,id,s,xz:plane[1],height:heights,width,lanes:r.lanes,crossPct:100*(heights[2]!-heights[0]!)/width});
 }
}
console.log(JSON.stringify(rows));
if(north && process.argv.includes('--terminal')) {
 for (const link of [false,true]) {
  const road=city.roads.find(w=>(w.sub==='link')===link && Math.hypot(w.pts[0][0]-982.478,w.pts[0][1]+5830.414)<.02)!;
  const axis=new Line(road.pts);
  for(const s of [0,.02,5,15,25,39.98,40,40.02,50]){
   const p=axis.at(s), vals=[-1,0,1].map(f=>{
    const x=p.x+p.nx*f*(link?1.5:6),z=p.z+p.nz*f*(link?1.5:6);
    return [height(x,z,road),banks.groundAt(x,z)];
   });
   console.error(link?'exit':'through',s,JSON.stringify(vals));
  }
 }
}
