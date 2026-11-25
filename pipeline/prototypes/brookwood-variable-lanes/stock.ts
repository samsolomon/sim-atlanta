// Offline clock selection. The live witness must also match the mounted matrix.
import { readFileSync } from 'node:fs';
import { ConnectorTraffic } from '../../../web/src/city/connector-traffic';
import { Line } from '../../../web/src/vignette/geom';
import { alongOn, stripePoint,ribbons } from '../../../web/src/terrain/connector-corridor';

import { board } from '../i85-cohesion/fixture-board';
import rows from '../square-board/midtown-rows.json';
import type { TerrainCity } from '../../../web/src/terrain/transport-data';
import type { InstancedMesh } from 'three';
import { homedir } from 'node:os';

const bounds = [
  [-1000,1000,-1300,700],[1000,1800,280,640],[1000,1800,-520,280],
  [-1000,1800,-1700,-1300],[1000,1800,-1300,-520],[1000,1800,640,700],
  [-1000,1800,700,1100], ...Object.values(rows).map(r=>[-1000,1800,r.minZ,r.maxZ]),
  [-1000,1800,-6500,-5700],
];
const hourly = JSON.parse(readFileSync('web/public/data/scene/downtown/traffic.json','utf8')).hourly;
const owner = ribbons.find(r=>r.id===1257642775)!;
const centerLines = Array.from({length:owner.lanes},(_,lane)=>{
  const pts = owner.rows.map(row=>stripePoint(row,(lane+.5)/owner.lanes));
  return {pts,line:new Line(pts)};
});
const epoch = Date.parse('2026-11-20T08:08:00-05:00');
for (const quality of ['low','high'] as const) {
  const nr = board(homedir()+'/orca/artifacts/sim-atlanta-ground/r16/results/fixture/r16',quality);
  const sw = board('pipeline/prototypes/square-board/brookwood-station',quality);
  const boards = bounds.map(([minX,maxX,minZ,maxZ])=>({
    city:{bounds:{minX,maxX,minZ,maxZ}} as TerrainCity,
    roadHeight:minZ===-6500 ? nr.road : minZ===-5700 ? sw.road : ()=>0,
  }));
  const traffic = new ConnectorTraffic({...boards[0],neighbors:boards.slice(1),quality,hourly});
  const ids=[1257642775,369529900,9238434,369529886,484857195,369529905];
  for(const id of ids) {
    const r=ribbons.find(r=>r.id===id);
    const slots=traffic['slots'].filter(slot=>r && slot.lane.roads.includes(slot.lane.roads.find(road=>road.pts===r.pts)!));
    console.log(JSON.stringify({quality,id,count:slots.length,slots:slots.map(slot=>[slot.kind,slot.phase,slot.threshold,slot.color.getHexString(),slot.lane.line.length])}));
  }
  let found=false;
  for(let sec=0;sec<900&&!found;sec+=.5){
    traffic.update(epoch+sec*1000,0);
    for(const child of traffic.group.children){
      const mesh=child as InstancedMesh;
      if(!mesh.isInstancedMesh||!mesh.instanceColor)continue;
      for(let i=0;i<mesh.count;i++){
        const mat=mesh.instanceMatrix.array.slice(16*i,16*i+16);
        const [x,y,z]=mat.slice(12,15);
        if(Math.hypot(x-565,z+5500)>45)continue;
        const d=alongOn(owner,[x,z]);if(d.s>20 && d.s<owner.line.length-10 && d.distance<8) {
          const known=traffic['slots'].find(sl=>sl.lane.roads.some(rd=>rd.pts===owner.pts)&&
            Math.abs(sl.color.r-mesh.instanceColor!.array[i*3])<1e-6 && alongOn({pts:sl.lane.line.pts,line:sl.lane.line},[x,z]).distance<.1);
          if(!known)continue;
          console.log(JSON.stringify({quality,sec,x,y,z,s:d.s,color:known.color.getHexString(),phase:known.phase}));found=true;
        }
      }
    }
  }
  traffic.dispose();
}
