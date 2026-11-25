import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { brookwoodGrid } from '../../../web/src/city/brookwood';
import { midtownConnectorGround } from '../../../web/src/terrain/midtown-connector-ground';
import { GroundSurface } from '../../../web/src/terrain/surface';
import { trailYields,trailAxis,trailBridge,portalLimits,trailHalfWidth,trailPoint } from './path';
import { trailDriveAxis,trailDrivePoint,accessStation } from './access';

const dir=homedir()+'/orca/artifacts/sim-atlanta-ground/r16/results/fixture/r16/';
const m=JSON.parse(readFileSync(dir+'ground.json','utf8'));
const grid=brookwoodGrid(m,midtownConnectorGround(m,Uint8Array.from(readFileSync(dir+'ground.i16')).buffer));
for(const tier of ['low','high'] as const) {
  const g=new GroundSurface(grid,tier,[],[{z:-5700,minX:-1000,maxX:1800}]);
  g.carve(trailYields());
  const ground=g.sampleScene.bind(g);
  const cap=[];
  for(const u of [-2.12,0,2.12]) {
    const values=[];
    for(const delta of [-.5,-.02,-.001,-.0005,-.0002,-.0001,0,.0001,.0002,.0005,.001,.02,.5]){
      const p=trailPoint(Math.max(0,delta),u), tangent=trailAxis.at(0);
      if(delta<0){p[0]+=delta*tangent.dx;p[2]+=delta*tangent.dz;}
      let high=-Infinity;
      g.trianglesIn(p[0],p[0],p[2],p[2],(ax,ay,az,bx,by,bz,cx,cy,cz)=>{
        const x=p[0]-ax,z=p[2]-az,d=(bx-ax)*(cz-az)-(bz-az)*(cx-ax);
        if(Math.abs(d)<1e-10)return;
        const l=(x*(cz-az)-z*(cx-ax))/d,r=((bx-ax)*z-(bz-az)*x)/d;
        if(l>=-1e-7&&r>=-1e-7&&l+r<=1+1e-7)high=Math.max(high,ay+l*(by-ay)+r*(cy-ay));
      });
      values.push([delta,Math.round((high-p[1])*100000)/100]);
    }
    cap.push({u,mm:values});
  }
  console.log(JSON.stringify({tier,cap}));
  let highest=-Infinity,lowest=Infinity,n=0;
  for(let s=.1;s<trailAxis.length;s+=.25){
    if(s>trailBridge[0]&&s<trailBridge[1] || s>portalLimits[0]&&s<portalLimits[1])continue;
    for(const lateral of [-.99,-.5,0,.5,.99]){
      const [x,y,z]=trailPoint(s,lateral*trailHalfWidth), h=ground(x,z);
      assert.ok(h!==null);highest=Math.max(highest,h-y);lowest=Math.min(lowest,h-y);n++;
    }
  }
  let maxStep=0;
  for(let s=accessStation+.02;s<trailDriveAxis.length;s+=.02)
    maxStep=Math.max(maxStep,Math.abs(trailDrivePoint(s,ground)[1]-trailDrivePoint(s-.02,ground)[1]));
  assert.ok(maxStep<.01);
  const entry=trailDrivePoint(accessStation,ground),end=trailDrivePoint(trailDriveAxis.length,ground);
  assert.ok(Math.hypot(end[0]-1321.7182639,end[2]+6194.7557564)<.00001);
  console.log(JSON.stringify({tier,n,maxStep,highest,lowest,accessStation,driveLength:trailDriveAxis.length,entry,end}));
  assert.ok(highest<.02,'Terrain intrudes on the exposed tread');
}
