import type { P2 } from '../vignette/geom';
import type { localLandmarkShell } from './landmark-shell';
import sites from './fixtures/midtown-skyline.json';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

export function symphonyTower(shell: Shell) {
  const palette = ['#839aa6','#758fa1','#6b8294'];
  // Origin at the Peachtree end of the block. The curved western nose belongs to the low wing.
  const podium = [...shell.ring];
  const area = podium.reduce((sum,[x,z],i) => {
    const [a,b] = podium[(i+1)%podium.length]; return sum+x*b-z*a;
  },0);
  if (area<0) podium.reverse();
  shell.prism(podium,shell.base,57,'#879da4','#9da9ab');
  podium.forEach((a,i) => shell.facade(a,podium[(i+1)%podium.length],2,56,13,2.3,.89,.83,palette,.1));

  const plate: P2[] = [[-30,-15],[26,-15],[29,-12],[29,12],[26,15],[-30,15],[-33,12],[-33,-12]];
  const roof = sites.symphony.heightM - 36.6;
  shell.prism(plate,56,roof,'#8499a6','#687984');
  plate.forEach((a,i) => shell.facade(a,plate[(i+1)%plate.length],57,roof,27,2.1,.88,.86,palette,.13));
  // Two independent screens bow away from the occupied floor plate. The open end
  // exposes the triangular steel framing above the flat mechanical roof.
  for (const side of [-1,1]) {
    const point = (u: number,v: number,inner=0) => {
      const x = -33 + u*62;
      const bulge = 1.6*Math.sin(Math.PI*u);
      const top = roof + 25.5 + 11.1*u;
      return [x,roof+(top-roof)*v,side*(14.8+bulge+1.35*v-inner)];
    };
    for (let bay=0;bay<14;bay++) {
      const u=bay/14, w=(bay+1)/14;
      for (let band=0;band<6;band++) {
        const v=band/6, h=(band+1)/6;
        const glass = (bay+band)%3===0 ? '#b8cacc' : '#a6bfc4';
        shell.lights.quad(point(u,v),point(u,h),point(w,h),point(w,v),glass);
        shell.body.quad(point(u,v,-.09),point(u,h,-.09),point(u+.008,h,-.09),point(u+.008,v,-.09),'#819599');
        shell.body.quad(point(u,h-.018,-.09),point(u,h,-.09),point(w,h,-.09),point(w,h-.018,-.09),'#87999f');
      }
      shell.body.quad(point(u,0,2),point(w,1,2),point(w,1,1.6),point(u,0,1.6),'#bbc5c2');
      shell.body.quad(point(u,1),point(w,1),point(w,1,2),point(u,1,2),'#b7c6c5');
    }
  }
  return shell.finish('#e4fff5',.96);
}
