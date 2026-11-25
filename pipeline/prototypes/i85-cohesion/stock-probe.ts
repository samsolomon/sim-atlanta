// Resolve these imports against the pinned private mount, as described in README.
import fs from 'node:fs';
import {board} from './fixture-board';
import { rampStudy } from '../../../web/src/city/i85-ramp-study';
import { ConnectorTraffic } from '../../../web/src/city/connector-traffic';
import { connectorTrafficRoutes } from '../../../web/src/city/connector-traffic-routes';
import { alongOn,ribbons } from '../../../web/src/terrain/connector-corridor';
import { east,west,lowerAxis,lowerPoint } from './lower';
import { brookwoodGrid } from '../../../web/src/city/brookwood';
import { midtownConnectorGround } from '../../../web/src/terrain/midtown-connector-ground';
import { GroundSurface } from '../../../web/src/terrain/surface';
import { auburnTransport } from '../../../web/src/city/sweet-auburn-transport';
import { northFreeway } from '../north-freeway/carrier';
import { midtownConnectorDecks } from '../../../web/src/terrain/midtown-connector-decks';
import { createSurfaceTransport } from '../../../web/src/terrain/transport';
import { cityRoadHeight } from '../../../web/src/city/road-height';
import { Matrix4,Vector3 } from '../../../web/node_modules/three';
const get=(f:string)=>JSON.parse(fs.readFileSync(f,'utf8'));
const dir='pipeline/prototypes/north-row-transport/';
const meta=get(dir+'ground.json'),grid=brookwoodGrid(meta,midtownConnectorGround(meta,Uint8Array.from(fs.readFileSync(dir+'ground.i16')).buffer));
const city=northFreeway(midtownConnectorDecks(auburnTransport(get(dir+'context.json'))));
const row={z:-5700,minX:-1000,maxX:1800};
const owner=ribbons.find(r=>r.id===38981789)!;
const bounds=[[-1000,1000,-1300,700],[1000,1800,280,640],[1000,1800,-520,280],[-1000,1800,-1700,-1300],[1000,1800,-1300,-520],[1000,1800,640,700],[-1000,1800,700,1100],...Object.values(get('pipeline/prototypes/square-board/midtown-rows.json')).map(r=>[-1000,1800,r.minZ,r.maxZ])];
const contexts=bounds.map(([minX,maxX,minZ,maxZ])=>({bounds:{minX,maxX,minZ,maxZ}}));
const courses=connectorTrafficRoutes(contexts[0],[...contexts.slice(1),city]);
for(const tier of ['low','high'] as const){
 const ramp=rampStudy(grid,tier,row);
 const before=new GroundSurface(grid,tier,[],row),exposed=before.sampleScene.bind(before);
 const ground=new GroundSurface(grid,tier,ramp.slots,row),sample=ground.sampleScene.bind(ground);
 const decks=createSurfaceTransport(city,grid,sample),stock=cityRoadHeight(city,sample,decks.deckAt);
 for(const road of city.roads)if(road.cls==='motorway'&&road.sub==='link')ramp.register(road.pts);
 const stockOwner={cls:'motorway',sub:'link',bridge:false,tunnel:false,name:null,pts:owner.pts};
 const realAxis={line:lowerAxis,pts:lowerAxis.pts};
 const interval=[0,1,2,4,5,8,10,15,20,25,30,40].map(s=>{
   const p=lowerAxis.at(west+s);return {s,registered:ramp.roadHeight(p.x,p.z,owner.pts),fallback:stock(p.x,p.z,stockOwner),floor:lowerPoint(west+s,0,exposed)?.[1]};
 });
 const hourly=get('web/public/data/scene/downtown/traffic.json').hourly;
 const south=board('pipeline/prototypes/square-board/brookwood-station',tier);
 const opts=contexts.map(c=>({city:c,roadHeight:c.bounds.minZ===-5700?south.road:()=>0})); // Other boards only supply their true extents for slot allocation.
 const layer=new ConnectorTraffic({...opts[0],hourly,quality:tier,neighbors:[...opts.slice(1),{city,roadHeight:(x,z,r)=>ramp.roadHeight(x,z,r.pts)??stock(x,z,r)}]});
 const carries=c=>c.roads.some(r=>r.pts===owner.pts);
 const slots=layer.slots.filter(sl=>carries(sl.lane));
 const m=new Matrix4(),observed=[];
 const wheelPoints=new Map();
 for(const [kind,mesh] of layer.meshes){
   const attr=mesh.geometry.getAttribute('position');
   let low=Infinity;
   for(let j=0;j<attr.count;j++)low=Math.min(low,attr.getY(j));
   const vs=new Map();
   for(let j=0;j<attr.count;j++)if(attr.getY(j)<low+.0001){
     const p=new Vector3().fromBufferAttribute(attr,j);vs.set(p.toArray().map(v=>v.toFixed(5)).join(','),p);
   }
   wheelPoints.set(mesh,{kind,points:[...vs.values()]});
 }
 const start=Date.parse('2026-11-20T08:01:12-05:00');
 for(let step=0;step<1800;step++){
   layer.update(start+step*500,0);
   for(const mesh of layer.group.children){
     if(!mesh.isInstancedMesh||!mesh.geometry.getAttribute('tripOpacity'))continue;
     for(let i=0;i<mesh.count;i++){
       mesh.getMatrixAt(i,m);const p=new Vector3().setFromMatrixPosition(m),u=alongOn(owner,[p.x,p.z]);
       if(u.distance>2 || u.s<.01 || u.s>owner.line.length-2 || Math.abs(p.y+66)>15)continue;
       const at=alongOn(realAxis,[p.x,p.z]),q=lowerAxis.at(at.s);
       const off=-(p.x-q.x)*q.nx-(p.z-q.z)*q.nz;
       const floor=lowerPoint(at.s,off,exposed);
       const tire=wheelPoints.get(mesh),gaps=[];
       for(const v of tire.points){
         const pos=v.clone().applyMatrix4(m),t=alongOn(realAxis,[pos.x,pos.z]),q=lowerAxis.at(t.s);
         const offset=-(pos.x-q.x)*q.nx-(pos.z-q.z)*q.nz;
         const h=lowerPoint(t.s,offset,exposed)?.[1]??(pos.z> -5700?south.road:stock)(pos.x,pos.z,stockOwner);
         if(h!==null)gaps.push(pos.y-h);
       }
       observed.push({kind:tire.kind,contacts:gaps.length,minGap:Math.min(...gaps),maxGap:Math.max(...gaps),seconds:step*.5,s:u.s,offset:off,carY:p.y,drawn:floor?.[1]??null,opacity:mesh.geometry.getAttribute('tripOpacity').getX(i)});
     }
   }
 }
 console.log(JSON.stringify({tier,courses:courses.length,westCourses:courses.filter(carries).length,westSlots:slots.length,
 totalSlots:layer.slots.length,activeWest:ribbons.filter(r=>[9238427,38981788,38981789].includes(r.id)).map(r=>r.id),interval,observed}));
}
