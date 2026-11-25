// Project source-way travel order through the pinned Low City camera at 1200 × 720.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { PerspectiveCamera, Vector3 } from '../../../web/node_modules/three';
import { Line, type P2 } from '../../../web/src/vignette/geom';

import { board } from './fixture-board';
const root='pipeline/prototypes/north-row-transport';
const north=board(root),south=board('pipeline/prototypes/square-board/brookwood-station');
const target=new Vector3(799,south.ground(799,-5660)!,-5660);
const camera=new PerspectiveCamera(22,1200/720,20,40000);
const pinned=JSON.parse(readFileSync('pipeline/prototypes/i85-cohesion/camera.json','utf8'));
camera.projectionMatrix.fromArray(pinned.projectionMatrix);
camera.matrixWorldInverse.fromArray(pinned.matrixWorldInverse);
camera.position.fromArray(pinned.position);

const elements=JSON.parse(gunzipSync(readFileSync(root+'/osm.json.gz')).toString()).elements;
const scale=Math.PI/180*6371008.8;
const nodes=new Map<number,P2>(elements.filter(e=>e.type==='node').map(e=>[e.id,[(e.lon+84.3916)*scale*Math.cos(33.7539*Math.PI/180),-(e.lat-33.7539)*scale]]));
const ids=[38981789,38981788,9238427,38983384,1409808969,369529900,879130781,187141934,38983363];
const paths=[];
for(const id of ids) {
 const w=elements.find(e=>e.type==='way'&&e.id===id);const pts=w.nodes.map(n=>nodes.get(n));
 const axis=new Line(pts), road={cls:'motorway',sub:w.tags.highway==='motorway_link'?'link':null,name:w.tags.name??null,bridge:false,tunnel:false,pts};
 const samples=[];
 for(let k=0;k<=Math.ceil(axis.length/2);k++) {
  const s=Math.min(k*2,axis.length);
  const p=axis.at(Math.min(s,axis.length)), b=p.z< -5700?north:south;
  if(p.z> -4900||p.z< -6500||p.x>1800)continue;
  if(w.tags.tunnel==='yes')continue; // Covered floor has no measured height in this camera fixture.
  const h=b.road(p.x,p.z,road)??b.ground(p.x,p.z);
  if(h==null)continue;
  const ndc=new Vector3(p.x,h,p.z).project(camera);
  samples.push([s,p.x,p.z,h,(1+ndc.x)*600,(1-ndc.y)*360,ndc.z]);
 }
 paths.push({id,version:w.version,nodes:[w.nodes[0],w.nodes.at(-1)],tags:w.tags,axis:pts,samples});
}
console.log(JSON.stringify({target:target.toArray(),position:camera.position.toArray(),paths}));
