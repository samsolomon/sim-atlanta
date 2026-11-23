import type { P2 } from '../vignette/geom';
import type { localLandmarkShell } from './landmark-shell';
import type { LocalGround } from './midtown-skyline';

import parts from './fixtures/midtown-skyline/georgian-terrace.json';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

export function georgianTerrace(shell: Shell, ground: LocalGround) {
  const buff = '#bfa585', stone = '#ddccb2', glass = ['#5c676c','#718080','#59656b'];
  const limestone = '#d9cdb8', joint = '#a89880', shade = '#9d8f7c', crown = '#e6dccb';
  function roof(plan: P2[],lo: number,hi: number,tint: string) { shell.prism(plan,lo,hi,tint,stone); }
  // Outward-facing edge frames for cornices, string courses and modillions.
  // Each projection is a true per-edge offset, so notched walls keep their band.
  function edges(plan: P2[]) {
    const area = plan.reduce((sum,[x,z],i) => { const [u,v] = plan[(i+1)%plan.length]; return sum+x*v-u*z; },0);
    const sign = Math.sign(area) || 1;
    return plan.map(([x,z],i) => {
      const [u,v] = plan[(i+1)%plan.length], length = Math.hypot(u-x,v-z);
      const tx = (u-x)/length, tz = (v-z)/length;
      return { x, z, tx, tz, nx: sign*tz, nz: -sign*tx, length };
    }).filter(e => e.length > .3);
  }
  // A band projecting `out` metres from every wall, with mitred corners.
  function band(plan: P2[],lo: number,hi: number,out: number,tint = stone) {
    const n = plan.length, e = (i: number) => {
      const [x,z] = plan[(i+n)%n], [u,v] = plan[(i+1+n)%n], l = Math.hypot(u-x,v-z) || 1;
      return [(v-z)/l,-(u-x)/l];
    };
    const area = plan.reduce((sum,[x,z],i) => { const [u,v] = plan[(i+1)%n]; return sum+x*v-u*z; },0);
    const sign = Math.sign(area) || 1;
    const offset: P2[] = plan.map(([x,z],i) => {
      const [ax,az] = e(i-1), [bx,bz] = e(i), mx = ax+bx, mz = az+bz;
      const k = Math.min(3, 2/Math.max(.2, mx*mx+mz*mz)), d = sign*out*k;
      return [x+mx*d,z+mz*d];
    });
    roof(offset,lo,hi,tint);
  }
  // Brackets under a cornice: small blocks every `pitch` metres along each wall.
  function modillions(plan: P2[],lo: number,hi: number,out: number,pitch: number,width: number) {
    for (const {x,z,tx,tz,nx,nz,length} of edges(plan)) {
      const count = Math.floor(length/pitch);
      for (let i = 0; i < count; i++) {
        const s = (i+.5)*length/count, a = s-width/2, c = s+width/2;
        const at = (t: number,y: number,o: number) => [x+tx*t+nx*o,y,z+tz*t+nz*o];
        shell.body.quad(at(a,lo,out),at(c,lo,out),at(c,hi,out),at(a,hi,out),stone);
        shell.body.quad(at(a,lo,0),at(c,lo,0),at(c,lo,out),at(a,lo,out),shade);
        shell.body.quad(at(a,lo,0),at(a,lo,out),at(a,hi,out),at(a,hi,0),stone);
        shell.body.quad(at(c,lo,0),at(c,hi,0),at(c,hi,out),at(c,lo,out),stone);
      }
    }
  }
  // Pale limestone over the two base storeys, with rusticated joints.
  function rusticated(plan: P2[],lo: number,hi: number) {
    for (const {x,z,tx,tz,nx,nz,length} of edges(plan)) {
      const at = (t: number,y: number,o: number) => [x+tx*t+nx*o,y,z+tz*t+nz*o];
      shell.body.quad(at(0,lo,.05),at(length,lo,.05),at(length,hi,.05),at(0,hi,.05),limestone);
      for (let y = Math.ceil((lo+.3)/.75)*.75; y < hi-.3; y += .75)
        shell.body.quad(at(0,y,.07),at(length,y,.07),at(length,y+.07,.07),at(0,y+.07,.07),joint);
    }
  }
  function facade(plan: P2[],lo: number,hi: number,rows: number) {
    plan.forEach((a,i) => shell.facade(a,plan[(i+1)%plan.length],lo,hi,rows,3.25,.53,.66,glass,.16));
  }
  const circle = (x: number,z: number,r: number): P2[] => Array.from({length:16},(_,i) =>
    [x+r*Math.cos(i*Math.PI/8),z+r*Math.sin(i*Math.PI/8)]);
  // Historic wing turns the Peachtree/Ponce corner with a rounded bay and terrace.
  const historic: P2[] = parts.historic.ring.map(([x,z]) => [x,z]);
  // Peachtree sits about 2.5 m above the site grade on 3DEP. The raised terrace
  // (a layer-1 walkway reached by steps in OSM) is level with its highest point.
  const frontage = [-7,0,8,16,24,32].map(z => ground(-35,z) ?? 0);
  const deck = Math.max(1.05,...frontage)+.3;
  roof(historic,shell.base,37,buff);
  facade(historic,8.6,35.6,8);
  // The 1911 wing's classical vocabulary, from the street photographs: a limestone
  // base, a belt cornice over it, a string course under the top storey, and a deep
  // crowning cornice on modillions below a low parapet.
  rusticated(historic,shell.base,7.7);
  band(historic,7.7,8.2,.55,crown);
  band(historic,8.2,8.6,.25);
  modillions(historic,7.25,7.7,.5,1.2,.3);
  band(historic,32.1,32.45,.22);
  band(historic,35.6,36.15,.3);
  modillions(historic,36.15,36.55,.95,1,.32);
  band(historic,36.55,37.15,1.05,crown);
  band(historic,37.15,38,-.15,buff);
  // The round corner bay rises a little higher and the crowning cornice wraps it.
  const corner = circle(-31,32,3.05);
  roof(corner,shell.base,38,buff);
  facade(corner,9,36,8);
  rusticated(corner,shell.base,7.7);
  band(corner,7.7,8.2,.55,crown);
  band(corner,32.1,32.45,.22);
  band(corner,35.6,36.15,.3);
  modillions(corner,36.15,36.55,.95,1,.32);
  band(corner,36.55,37.15,1.05,crown);
  band(corner,37.15,38.9,-.15,buff);
  // The two-storey mapped infill fills the recess in front of the upper wing.
  roof(parts.porch.ring as P2[],shell.base,8.6,buff);

  // Separate upper block and glass stair/atrium cylinder of the 1991 addition.
  const addition: P2[] = parts.addition.ring.map(([x,z]) => [x,z]);
  roof(addition,shell.base,68,buff);
  facade(addition,7,65.7,17);
  for (const h of [9,54,63,66.9]) band(addition,h,h+.85,.3);
  const atrium = circle(-9,-9.7,5.8);
  roof(atrium,8,70,'#84989b');
  atrium.forEach((a,i) => shell.facade(a,atrium[(i+1)%atrium.length],9,69.5,18,2.6,.88,.86,['#647f8b','#8297a1'],.07));
  for (const h of [68.5,70]) roof(circle(-9,-9.7,6.0),h,h+.5,stone);
  atrium.forEach(([x,z],i) => {
    const [a,b]=atrium[(i+1)%atrium.length];
    shell.body.tri([x,70.5,z],[a,70.5,b],[-9,73,-9.7],stone);
  });

  // Three-storey mapped podium east of the tower, and the mapped drive and
  // entrance canopies, which stand open on posts over their drives.
  const podium = parts.podium.ring as P2[];
  roof(podium,shell.base,12,buff);
  facade(podium,1.4,11,3);
  band(podium,11.4,12.2,.3);
  for (const [plan,lo] of [[parts.driveCanopy.ring,4.6],[parts.northCanopy.ring,7.4],[parts.ponceCanopy.ring,7.6]] as const) {
    roof(plan as P2[],lo,lo+.55,stone);
    for (const [x,z] of (plan as P2[]).filter((_,i) => i%3===0)) {
      roof(circle(x,z,.2),shell.base,lo,'#8d8170');
    }
  }

  // A colonnade along the raised west terrace supports the deep entablature.
  // The deck wraps the rounded corner onto Ponce inside the mapped outline.
  const terrace: P2[] = [[-33.6,-7.3],[-34.9,10.2],[-36.35,32.7],[-35.2,35.4],[-33.5,36.9],[-31.7,37.6],
    [-29.6,37.6],[-13.2,32.2],[-14.24,29.18],[-28.41,33.68],[-31.21,34.95],[-33.28,33.84],[-33.95,31.57],
    [-33.46,30.24],[-32.81,20.56],[-31.42,1.76],[-30.83,-7.28]];
  roof(terrace,shell.base,deck,'#ae9c89');
  // Mapped west edge of the hotel outline along Peachtree.
  const edge = (z: number) => z<10.2 ? -33.6-1.3*(z+7.3)/17.5 : -34.9-1.45*(z-10.2)/22.5;
  const entablature: P2[] = [[edge(-6.6)+.2,-6.6],[-31,-6.6],[-32.7,25],[edge(25)+.2,25]];
  roof(entablature,7.4,8.25,stone);
  for (let i=0;i<6;i++) {
    const z=-4+i*5.3, x=edge(z)+1.1;
    roof(circle(x,z,.61),deck,7.4,stone);
    roof(circle(x,z,.83),7.0,7.4,'#e2d4bd');
    shell.lights.quad([x-.63,deck+.2,z-.25],[x-.63,deck+2.7,z-.25],[x-.63,deck+2.7,z+.25],[x-.63,deck+.2,z+.25],'#bb9e78');
  }
  // Arched French windows open from the terrace on the porch and the end bays.
  const windows: [P2,P2][] = [[[-33.46,30.24],[-32.81,20.56]],[[-32.81,20.56],[-31.42,1.76]],[[-31.42,1.76],[-30.83,-7.28]]];
  const spring = Math.min(deck+2.7,5.9);
  for (const [[x,z],[a,b]] of windows) {
    const length=Math.hypot(a-x,b-z);
    const bays=Math.max(1,Math.round(length/5));
    for (let bay=0;bay<bays;bay++) {
      const pane=(u: number,y: number) => {
        const t=(bay+.5)/bays+u/length;
        return [x+(a-x)*t+(b-z)*.08/length,y,z+(b-z)*t-(a-x)*.08/length];
      };
      shell.body.quad(pane(-1.4,deck+.1),pane(-1.4,spring),pane(1.4,spring),pane(1.4,deck+.1),'#4b5758');
      for (let arc=0;arc<8;arc++) {
        const t0=arc*Math.PI/8,t1=(arc+1)*Math.PI/8;
        shell.body.tri(pane(0,spring),pane(1.4*Math.cos(t0),spring+1.4*Math.sin(t0)),pane(1.4*Math.cos(t1),spring+1.4*Math.sin(t1)),'#5d6866');
      }
    }
  }
  return shell.finish('#f9d8a1',.68);
}
