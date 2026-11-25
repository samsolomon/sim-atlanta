// Run with the fixture checkout's TypeScript bundler; this only samples plan geometry.
import assert from 'node:assert/strict';
import { ribbons, stripePoint, sectionAt } from '../../../web/src/terrain/connector-corridor';
import { drop,gain,nbTail } from './profile';
import type { P2 } from '../../../web/src/vignette/geom';

const distance=(a:P2,b:P2)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
for(const [label,rows] of [['exit',drop],['entrance',gain]] as const){
  let narrowest=Infinity,widest=0,minGap=Infinity;
  for(const row of rows){
    const main=distance(row.main.inner,row.main.outer);
    const ramp=distance(row.ramp.inner,row.ramp.outer);
    const through:[number,number]=[(row.main.outer[0]-row.main.inner[0])/main,(row.main.outer[1]-row.main.inner[1])/main];
    const gap=(row.ramp.inner[0]-row.main.outer[0])*through[0]+(row.ramp.inner[1]-row.main.outer[1])*through[1];
    narrowest=Math.min(narrowest,main/5,ramp);widest=Math.max(widest,main/5,ramp);minGap=Math.min(minGap,gap);
  }
  console.log(label,{narrowest,widest,minGap});
  assert(narrowest>3 && widest<4.5 && minGap>-.04);
}
const donor=ribbons.find(r=>r.id===369529900)!;
for(let i=0;i<6;i++){
  const old=stripePoint(sectionAt(donor,donor.line.length),(i+.5)/6);
  const first=drop[0];
  assert(distance(old,i===5?stripePoint(first.ramp,.5):stripePoint(first.main,(i+.5)/5))<.001);
}
for(const branch of [true,false]){
  const a=branch?drop.at(-1)!.ramp:drop.at(-1)!.main,b=nbTail(branch)[0];
  assert(distance(a.inner,b.inner)<.001 && distance(a.outer,b.outer)<.001);
}
