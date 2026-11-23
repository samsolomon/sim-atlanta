import type { P2 } from '../vignette/geom';
import type { localLandmarkShell } from './landmark-shell';

import parts from './fixtures/midtown-skyline/georgian-terrace.json';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

export function georgianTerrace(shell: Shell) {
  const buff = '#bfa585', stone = '#ddccb2', glass = ['#5c676c','#718080','#59656b'];
  function roof(plan: P2[],lo: number,hi: number,tint: string) { shell.prism(plan,lo,hi,tint,stone); }
  function cornice(plan: P2[],lo: number,hi: number) {
    const cx = plan.reduce((sum,p) => sum+p[0],0)/plan.length;
    const cz = plan.reduce((sum,p) => sum+p[1],0)/plan.length;
    roof(plan.map(([x,z]) => [cx+(x-cx)*1.018,cz+(z-cz)*1.018]),lo,hi,stone);
  }
  function facade(plan: P2[],lo: number,hi: number,rows: number) {
    plan.forEach((a,i) => shell.facade(a,plan[(i+1)%plan.length],lo,hi,rows,3.25,.53,.66,glass,.16));
  }
  const circle = (x: number,z: number,r: number): P2[] => Array.from({length:16},(_,i) =>
    [x+r*Math.cos(i*Math.PI/8),z+r*Math.sin(i*Math.PI/8)]);
  // Historic wing turns the Peachtree/Ponce corner with a rounded bay and terrace.
  const historic: P2[] = parts.historic.ring.map(([x,z]) => [x,z]);
  roof(shell.ring,shell.base,1.05,buff);
  roof(historic,shell.base,37,buff);
  facade(historic,8.6,35.6,8);
  cornice(historic,7.7,8.6);
  cornice(historic,35.6,37.12);
  const corner = circle(-31,32,3.05);
  roof(corner,shell.base,37.9,buff);
  facade(corner,9,36,8);
  for (const h of [8.1,15.4,29.8,35.8,37.5]) roof(circle(-31,32,3.2),h,h+.48,stone);

  // Separate upper block and glass stair/atrium cylinder of the 1991 addition.
  const addition: P2[] = parts.addition.ring.map(([x,z]) => [x,z]);
  roof(addition,shell.base,68,buff);
  facade(addition,7,65.7,17);
  for (const h of [9,54,63,66.9]) cornice(addition,h,h+.85);
  const atrium = circle(-9,-9.7,5.8);
  roof(atrium,8,70,'#84989b');
  atrium.forEach((a,i) => shell.facade(a,atrium[(i+1)%atrium.length],9,69.5,18,2.6,.88,.86,['#647f8b','#8297a1'],.07));
  for (const h of [68.5,70]) roof(circle(-9,-9.7,6.0),h,h+.5,stone);
  atrium.forEach(([x,z],i) => {
    const [a,b]=atrium[(i+1)%atrium.length];
    shell.body.tri([x,70.5,z],[a,70.5,b],[-9,73,-9.7],stone);
  });

  // A colonnade along the historic west terrace supports the deep entablature.
  const terrace: P2[] = [[-35,-6],[-31.5,-6],[-33,25],[-36,25]];
  roof(terrace,shell.base,1.4,'#ae9c89');
  roof(terrace,7.4,8.25,stone);
  for (let i=0;i<6;i++) {
    const z=-4+i*5.3, x=-34.3-i*.16;
    const wallX = -29.1 - .075*z;
    const pane = (u: number,y: number) => [wallX,y,z+u];
    shell.body.quad(pane(-1.4,1),pane(-1.4,5.2),pane(1.4,5.2),pane(1.4,1),'#4b5758');
    for (let arc=0;arc<8;arc++) {
      const a=arc*Math.PI/8, b=(arc+1)*Math.PI/8;
      shell.body.tri(pane(0,5.2),pane(1.4*Math.cos(a),5.2+1.4*Math.sin(a)),pane(1.4*Math.cos(b),5.2+1.4*Math.sin(b)),'#5d6866');
    }
    roof(circle(x,z,.61),1.4,7.4,stone);
    roof(circle(x,z,.83),7.0,7.4,'#e2d4bd');
    shell.lights.quad([x-.63,1.6,z-.25],[x-.63,4.1,z-.25],[x-.63,4.1,z+.25],[x-.63,1.6,z+.25],'#bb9e78');
  }
  return shell.finish('#f9d8a1',.68);
}
