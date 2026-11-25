// Reproduce the inferred profile against both City terrain tiers and the independent board clipping.
import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { Builder } from '../../../web/src/vignette/geom';
import { board } from '../i85-cohesion/fixture-board';
import { trailStations, trailPoint, drawTrail, trailHalfWidth, trailBore, trailBridge } from './path';
import source from './axis.json';
const bounds = {minX:-1000,maxX:1800,minZ:-6500,maxZ:-5700};
for(const quality of ['low','high'] as const) {
  const terrain=board(homedir()+'/orca/artifacts/sim-atlanta-ground/r16/results/fixture/r16',quality);
  const crossing=source.crossings.map(c=>{
    const [x,y,z]=trailPoint(c.station);
    assert.ok(Math.hypot(x-c.coords[0],z-c.coords[1])<.00001);
    return {road:c.road,station:c.station,trailMinusTerrain:y-terrain.ground(x,z)!};
  });
  const contacts=[];
  for (const s of trailStations()) {
    if(s>=trailBridge[0]&&s<=trailBridge[1] || s>=trailBore[0]&&s<=trailBore[1])continue;
    for(const offset of [-trailHalfWidth,0,trailHalfWidth]){
      const [x,y,z]=trailPoint(s,offset);
      contacts.push({s,offset,terrainMinusTread:terrain.ground(x,z)!-y});
    }
  }
  const worst=[...contacts].sort((a,b)=>b.terrainMinusTread-a.terrainMinusTread)[0];
  console.log(JSON.stringify({quality,crossing,worst,covered:contacts.filter(p=>p.terrainMinusTread>.02).length,total:contacts.length}));
}
const cut=-6075;
function area(minZ:number,maxZ:number){
  const b=new Builder();drawTrail(b,{...bounds,minZ,maxZ});
  let total=0;
  for(let i=0;i<b.pos.length;i+=9){
    const v=b.pos.slice(i,i+9);
    for(const z of [v[2],v[5],v[8]])assert.ok(z>=minZ && z<=maxZ);
    total+=Math.abs((v[3]-v[0])*(v[8]-v[2])-(v[6]-v[0])*(v[5]-v[2]))*.5;
  }
  return total;
}
assert.ok(Math.abs(area(bounds.minZ,bounds.maxZ)-area(bounds.minZ,cut)-area(cut,bounds.maxZ))<1e-6);
