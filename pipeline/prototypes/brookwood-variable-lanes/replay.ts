// Offline clock selection. The live witness must also match the mounted matrix.
import { readFileSync } from 'node:fs';
import { ConnectorTraffic } from '../../../web/src/city/connector-traffic';
import { Line } from '../../../web/src/vignette/geom';
import { alongOn, stripePoint,ribbons } from '../../../web/src/terrain/connector-corridor';

import { board } from '../i85-cohesion/fixture-board';
import rows from '../square-board/midtown-rows.json';
import type { TerrainCity } from '../../../web/src/terrain/transport-data';
import type { InstancedMesh } from 'three';
import axes from './axes.json';
import { drop, gain } from './profile';
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
  for (const [movement, profile, tagged] of [
    ['drop',drop,axes['9238434'].pts],
    ['gain',gain,owner.pts],
  ] as const) {
    const slots=traffic['slots'].filter(slot=>slot.lane.roads.some(r=>r.pts===tagged));
    const line=new Line(profile.map(row=>stripePoint(row.ramp,.5)));
    const anchor=movement==='drop'?95:35;
    let found=false;
    for(let dt=0;dt<1800 && !found;dt+=.5){
      traffic.update(epoch+dt*1000,0);
      for(const child of traffic.group.children){
        const m=child as InstancedMesh;
        if(!m.isInstancedMesh || !m.instanceColor) continue;
        for(let i=0;i<m.count;i++){
          const buf=m.instanceMatrix.array;
          const pos:[number,number]=[buf[i*16+12],buf[i*16+14]];
          const c=m.instanceColor.array;
          const slot=slots.find(v=>Math.abs(v.color.r-c[3*i])<1e-6 && Math.abs(v.color.g-c[3*i+1])<1e-6);
          if(!slot)continue;
          const d=alongOn({pts:line.pts,line},pos);
          if(d.distance>.12 || Math.abs(d.s-anchor)>5)continue;
          console.log(JSON.stringify({quality,movement,slots:slots.length,dt,kind:slot.kind,color:slot.color.getHexString(),phase:slot.phase,pos,s:d.s}));
          found=true;break;
        }
        if(found)break;
      }
    }
    if(!found)console.log(JSON.stringify({quality,movement,slots:slots.length,found}));
  }
  traffic.dispose();
}
