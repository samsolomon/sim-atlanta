// Source-directed road cross sections on the untouched and corrected City tread.
import { readFileSync } from 'node:fs';
import { brookwoodGrid } from '../../../web/src/city/brookwood';
import { midtownConnectorGround } from '../../../web/src/terrain/midtown-connector-ground';
import { auburnTransport } from '../../../web/src/city/sweet-auburn-transport';
import { midtownConnectorDecks } from '../../../web/src/terrain/midtown-connector-decks';
import { GroundSurface } from '../../../web/src/terrain/surface';
import { createSurfaceTransport } from '../../../web/src/terrain/transport';
import { sectionAt, stripePoint, ribbons } from '../../../web/src/terrain/connector-corridor';
import { bridgeApproaches } from '../../../web/src/terrain/bridge-approaches';
import { seventeenthPortals } from '../../../web/src/city/seventeenth-street';
import { cityRoadHeight } from '../../../web/src/city/road-height';

import { northFreeway } from './carrier';

const base = 'pipeline/prototypes/square-board/brookwood-station/';
const manifest = JSON.parse(readFileSync(base+'ground.json','utf8'));
const bytes = Uint8Array.from(readFileSync(base+'ground.i16')).buffer;
const grid = brookwoodGrid(manifest, midtownConnectorGround(manifest,bytes));
const original = midtownConnectorDecks(auburnTransport(JSON.parse(readFileSync(base+'context.json','utf8'))));
const city = process.argv.includes('--after') ? northFreeway(original) : original;
const surface = new GroundSurface(grid, 'low', undefined, [{z:-5700,minX:-1000,maxX:1800},{z:-4900,minX:-1000,maxX:1800}]);
const banks = bridgeApproaches(seventeenthPortals(city),323.8,surface.sampleScene.bind(surface),city.bounds,city.roads);
const transport = createSurfaceTransport(city,grid,banks.groundAt);
const height = cityRoadHeight(city,banks.groundAt,transport.deckAt);
const rows = [];
for(const id of [484857196,484857197,1257642776,369529900,1409808969,38981789,1416312985,484857195]) {
 const r = ribbons.find(r=>r.id===id)!;
 const road=city.roads.find(w=>w.pts.some(a=>r.pts.some(b=>Math.hypot(a[0]-b[0],a[1]-b[1])<.025)) &&
   w.pts.slice(1).some((b,i)=>r.pts.slice(1).some((d,j)=>Math.hypot(d[0]-b[0],d[1]-b[1])<.025 && Math.hypot(r.pts[j][0]-w.pts[i][0],r.pts[j][1]-w.pts[i][1])<.025)));
 if(!road) throw Error('No source road '+id);
 for(let s=1;s<r.line.length;s+=4){
  const row=sectionAt(r,s);
  const plane=[.01,.5,.99].map(f=>stripePoint(row,f));
  if(plane.some(p=>p[1]<-5699))continue;
  const heights=plane.map(([x,z])=>height(x,z,road));
  const width=Math.hypot(plane[2][0]-plane[0][0],plane[2][1]-plane[0][1]);
  rows.push({id,s,xz:plane[1],height:heights,width,lanes:r.lanes,crossPct:100*(heights[2]!-heights[0]!)/width});
 }
}
console.log(JSON.stringify(rows));
