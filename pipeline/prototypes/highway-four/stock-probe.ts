// Offline clock selection for the mounted instance-matrix replay. A constant
// height isolates horizontal timing. Mounted road ownership must be checked separately.
import { readFileSync } from 'node:fs';
import { ConnectorTraffic } from '../../../web/src/city/connector-traffic';
import { ribbons } from '../../../web/src/terrain/connector-corridor';
import rows from '../square-board/midtown-rows.json';
import type { TerrainCity } from '../../../web/src/terrain/transport-data';
import type { InstancedMesh } from 'three';

const bounds = [
  [-1000,1000,-1300,700],[1000,1800,280,640],[1000,1800,-520,280],
  [-1000,1800,-1700,-1300],[1000,1800,-1300,-520],[1000,1800,640,700],
  [-1000,1800,700,1100], ...Object.values(rows).map(r=>[-1000,1800,r.minZ,r.maxZ]),
  [-1000,1800,-6500,-5700],
];
const hourly = JSON.parse(readFileSync(process.argv[2],'utf8')).hourly;
const epoch = Date.parse('2026-11-20T08:08:00-05:00');
const targets = [[29013401,30],[9238120,30],[38983384,270],[38982156,1145],
  [38983378,215],[369529892,25],[187141934,-10],[38981774,-10],[1020867018,20]];
for (const quality of ['low','high'] as const) {
  const boards=bounds.map(([minX,maxX,minZ,maxZ])=>({city:{bounds:{minX,maxX,minZ,maxZ}} as TerrainCity,roadHeight:()=>0}));
  const traffic=new ConnectorTraffic({...boards[0],neighbors:boards.slice(1),quality,hourly});
  const remaining=new Map(targets.map(([id,s])=>{
    const r=ribbons.find(w=>w.id===id)!;
    return [id,{r,p:r.line.at(s<0?r.line.length+s:s)}] as const;
  }));
  for (let seconds=0; seconds<1800 && remaining.size; seconds+=.5) {
    traffic.update(epoch+seconds*1000,0);
    for(const child of traffic.group.children) {
      const mesh=child as InstancedMesh;
      if(!mesh.isInstancedMesh || !mesh.instanceColor)continue;
      for(let index=0;index<mesh.count;index++) {
        const m=mesh.instanceMatrix.array.subarray(index*16,index*16+16);
        for(const [id,{p,r}] of remaining) {
          if(Math.hypot(m[12]-p.x,m[14]-p.z)>r.lanes*1.8+2 || m[8]*p.dx+m[10]*p.dz<.95)continue;
          // Match the rendered centre to its emitting stock course. A nearby
          // parallel road at a fork can be inside the same geographic window.
          const visible=traffic['visible'].slice(0,traffic['visibleCars']).find(v=>Math.hypot(v.x-m[12],v.z-m[14])<.005);
          if(!visible?.lane.roads.some(road=>road.pts===r.pts))continue;
          console.log(JSON.stringify({quality,id,time:new Date(epoch+seconds*1000),x:m[12],z:m[14],
            mesh:mesh.name,index,rgb:Array.from(mesh.instanceColor.array.slice(index*3,index*3+3)),
            route:[...new Set(visible.lane.roads.map(road=>ribbons.find(w=>w.pts===road.pts)?.id))]}));
          remaining.delete(id);
        }
      }
    }
  }
  console.log(JSON.stringify({quality,remaining:[...remaining.keys()]}));
  traffic.dispose();
}
