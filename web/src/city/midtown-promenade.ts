import type { P2 } from '../vignette/geom';
import type { localLandmarkShell } from './landmark-shell';
import sites from './fixtures/midtown-skyline.json';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

function chamfered(width: number, depth: number, corner: number): P2[] {
  return [[-width+corner,-depth],[width-corner,-depth],[width,-depth+corner],[width,depth-corner],
    [width-corner,depth],[-width+corner,depth],[-width,depth-corner],[-width,-depth+corner]];
}

function glazed(shell: Shell, plan: P2[], lo: number, hi: number, rows: number, central = false) {
  const glass = central ? ['#657276','#47565c'] : ['#5a525c','#6b626b','#4e505e'];
  shell.prism(plan, lo, hi, central ? '#aca799' : '#826e68', '#817d78');
  plan.forEach((a, i) => {
    const b = plan[(i+1)%plan.length];
    shell.facade(a,b,lo,hi,rows,central ? 4.7 : 2.8,central ? .76 : .92,central ? .61 : .84,glass,.12);
  });
}

export function promenadeTower(shell: Shell) {
  shell.prism(shell.ring, shell.base, 9, '#927f75','#aea29a');
  // TVS massing steps inward on the diagonal street grid, ending in a narrow lantern.
  for (const [width,depth,notch,lo,hi,rows] of [
    [29,19.8,3.2,9,143,32],[24.6,17,3.2,143,156,3],[19.8,14,3.2,156,168,3],
    [15,11,2.7,168,180,2],[10.7,7.8,2.1,180,189,2],
  ]) {
    const plan = chamfered(width,depth,notch);
    glazed(shell,plan,lo,hi,rows);
    for (const [x,z] of plan) {
      const r = .42;
      const fin: P2[] = [[x-r,z-r],[x+r,z-r],[x+r,z+r],[x-r,z+r]];
      shell.prism(fin,lo,hi+1.5,'#b5aaa0','#c9c4b8');
    }
  }
  for (const [width,depth,lo,hi] of [[5.8,4.8,189,196],[2.6,2.4,196,202],[.55,.55,202,sites.promenadeTower.heightM]]) {
    const plan = chamfered(width,depth,width*.2);
    shell.prism(plan,lo,hi,'#c3c6bd','#cfcec6');
    plan.forEach(([x,z],i) => {
      const [a,b] = plan[(i+1)%plan.length];
      shell.lights.quad([x*1.015,lo,z*1.015],[x*1.015,hi,z*1.015],[a*1.015,hi,b*1.015],[a*1.015,lo,b*1.015],'#cdd0c9');
    });
  }
  return shell.finish('#fff0ce',.84);
}

export function promenadeCentral(shell: Shell) {
  shell.prism(shell.ring,shell.base,2.0,'#8b8b82','#a8a599');
  const main: P2[] = [[-45,-29],[-6,-30],[44,-24],[44,23],[-27,23],[-27,-7],[-42,-7],[-42,-17],[-45,-17]];
  shell.prism(main,shell.base,6.4,'#839295','#899797');
  glazed(shell,main,6.4,sites.promenadeCentral.heightM,10,true);
  // The plaza entrance has a glazed double-height lobby and horizontal sunshade blades.
  const terrace: P2[] = [[-25,23],[35,23],[35,29],[-25,29]];
  shell.prism(terrace,shell.base,1.8,'#8b8b82','#a8a599');
  glazed(shell,terrace,1.8,6.5,1,true);
  for(let z=23;z<=31;z+=1.3) {
    shell.prism([[-25,z],[35,z],[35,z+.42],[-25,z+.42]],6.65,7.05,'#c9ccc5','#d6d9d2');
  }
  for(let x=-24;x<=34;x+=9.5) {
    shell.prism([[x,28],[x+.4,28],[x+.4,28.4],[x,28.4]],shell.base,6.7,'#b9bdb8','#b9bdb8');
  }
  return shell.finish('#f6deb3',.7);
}
