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
