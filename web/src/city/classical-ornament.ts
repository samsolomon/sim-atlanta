import type { P2 } from '../vignette/geom';
import type { localLandmarkShell } from './landmark-shell';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

/**
 * The classical vocabulary first drawn for the 1911 Georgian Terrace: per-edge
 * cornices and belt courses with mitred corners, modillion brackets, a
 * rusticated limestone base, and stone corner strips (quoins). Every
 * projection is a true per-edge offset, so notched walls keep their band.
 */
export function classicalOrnament(shell: Shell, colours: { stone: string; shade: string; limestone: string; joint: string }) {
  const { stone, shade, limestone, joint } = colours;
  function edges(plan: P2[]) {
    const area = plan.reduce((sum,[x,z],i) => { const [u,v] = plan[(i+1)%plan.length]; return sum+x*v-u*z; },0);
    const sign = Math.sign(area) || 1;
    return plan.map(([x,z],i) => {
      const [u,v] = plan[(i+1)%plan.length], length = Math.hypot(u-x,v-z);
      const tx = (u-x)/length, tz = (v-z)/length;
      return { x, z, tx, tz, nx: sign*tz, nz: -sign*tx, length };
    }).filter(e => e.length > .3);
  }
  /** A band projecting `out` metres from every wall, with mitred corners. */
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
    shell.prism(offset,lo,hi,tint,stone);
  }
  /** Brackets under a cornice: small blocks every `pitch` metres along each wall. */
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
  /** Pale limestone over the base storeys, with rusticated joints on a 0.75 m course. */
  function rusticated(plan: P2[],lo: number,hi: number) {
    for (const {x,z,tx,tz,nx,nz,length} of edges(plan)) {
      const at = (t: number,y: number,o: number) => [x+tx*t+nx*o,y,z+tz*t+nz*o];
      shell.body.quad(at(0,lo,.05),at(length,lo,.05),at(length,hi,.05),at(0,hi,.05),limestone);
      for (let y = Math.ceil((lo+.3)/.75)*.75; y < hi-.3; y += .75)
        shell.body.quad(at(0,y,.07),at(length,y,.07),at(length,y+.07,.07),at(0,y+.07,.07),joint);
    }
  }
  /** Stone strips `width` wide on both faces of every outward corner longer than `min` metres. */
  function quoins(plan: P2[],lo: number,hi: number,width = 1.2,min = 6,tint = limestone) {
    const list = edges(plan);
    list.forEach(e => {
      if (e.length < min) return;
      const at = (t: number,y: number) => [e.x+e.tx*t+e.nx*.06,y,e.z+e.tz*t+e.nz*.06];
      const w = Math.min(width, e.length/4);
      shell.body.quad(at(0,lo),at(w,lo),at(w,hi),at(0,hi),tint);
      shell.body.quad(at(e.length-w,lo),at(e.length,lo),at(e.length,hi),at(e.length-w,hi),tint);
    });
  }
  return { edges, band, modillions, rusticated, quoins };
}
