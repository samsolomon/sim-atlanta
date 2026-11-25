// Offline clock selection. The live witness must also match the mounted matrix.
import { readFileSync } from 'node:fs';
import { ConnectorTraffic } from '../../../web/src/city/connector-traffic';
import { Line } from '../../../web/src/vignette/geom';
import { alongOn, stripePoint } from '../../../web/src/terrain/connector-corridor';
import { southbound } from './profile';
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
const owner = southbound[0].ribbon;
const centerLines = Array.from({length:owner.lanes},(_,lane)=>{
  const pts = owner.rows.map(row=>stripePoint(row,(lane+.5)/owner.lanes));
  return {pts,line:new Line(pts)};
});
const epoch = Date.parse('2026-11-20T08:08:00-05:00');
for (const quality of ['low','high'] as const) {
  const nr = board(homedir()+'/orca/artifacts/sim-atlanta-ground/r16/results/fixture/r16',quality);
  const boards = bounds.map(([minX,maxX,minZ,maxZ])=>({
    city:{bounds:{minX,maxX,minZ,maxZ}} as TerrainCity,
    roadHeight:minZ===-6500 ? nr.road : ()=>0,
  }));
  const traffic = new ConnectorTraffic({...boards[0],neighbors:boards.slice(1),quality,hourly});
  let found=false;
  for (let seconds=0; seconds<1200 && !found; seconds+=.5) {
    traffic.update(epoch+seconds*1000,0);
    for (const child of traffic.group.children) {
      const mesh = child as InstancedMesh;
      if (!mesh.isInstancedMesh || !mesh.instanceColor || !mesh.geometry.getAttribute('tripOpacity')) continue;
      for(let index=0;index<mesh.count;index++) {
        const mat=mesh.instanceMatrix.array.subarray(index*16,index*16+16);
        const [x,y,z]=mat.slice(12,15);
        if(Math.abs(z+5800)>5 || Math.abs(x-909)>18)continue;
        const near=centerLines.map(line=>alongOn(line,[x,z]).distance);
        if(Math.min(...near)>.05)continue;
        const rgb=Array.from(mesh.instanceColor.array.slice(index*3,index*3+3));
        console.log(JSON.stringify({quality,seconds,time:new Date(epoch+seconds*1000),index,x,y,z,rgb,
          lane:1+near.indexOf(Math.min(...near)),station:alongOn(owner,[x,z]).s,distance:Math.min(...near)}));
        found=true;
      }
    }
  }
  if (!found) throw Error('No stock crossing on '+quality);
  traffic.dispose();
}
