// 145 The Prado. The west frontage of OSM way 269539876 defines the frame:
// u runs south along the porch and v runs east into the lot, in metres.
import type { BuildingFinish } from '../vignette/world';
import type { Builder } from '../vignette/geom';
import { PALETTE } from '../materials/library';

export const pradoCraftsmanId = 'osm:way:269539876';
const siding = '#97a186', shingles = '#76826c', trim = '#eee6cf', glass = '#617981';
const slate = '#96958d', stone = PALETTE.granite.grey;
const point = (u: number, v: number, y: number) => [1225.03 + .1624*u + .9867*v, y, -4434.2 + .9867*u - .1624*v];

function box(b: Builder, u: number, v: number, width: number, depth: number, lo: number, hi: number, color: string) {
  const top = [[u,v],[u+width,v],[u+width,v+depth],[u,v+depth]].map(([x,z]) => point(x,z,hi));
  b.quad(top[0],top[1],top[2],top[3],color);
  for (let i=0; i<4; i++) {
    const a=top[i], c=top[(i+1)%4];
    b.quad([a[0],lo,a[2]],[c[0],lo,c[2]],c,a,color);
  }
}

export function pradoCraftsman(groundAt: (x: number,z: number) => number | null): BuildingFinish {
  const grade = (u: number,v: number, fallback: number) => {
    const [x,,z] = point(u,v,0);
    return groundAt(x,z) ?? fallback;
  };
  const floor = grade(6.8,-1.15,-50) + .72;
  const eave = floor + 4.45, porchEave = floor + 3.25;
  const ridgeV = 13, ridgeRise = 2.45;
  const roofY = (v: number) => eave + ridgeRise * (v < ridgeV ? (v-3.1)/(ridgeV-3.1) : (32.4-v)/(32.4-ridgeV));
  // Each band is part of the same two roof planes over the stepped footprint.
  const bands = [[0,11.6,3.1,9],[0,13.4,9,ridgeV],[0,13.4,ridgeV,25.7],
    [0,18.6,25.7,29.4],[6.5,18.6,29.4,32.4]];
  return {
    wall: siding, roof: slate, parapet: 0, replacesRoof: true,
    drawRing(b,_ring,_hole,base,_top,lights) {
      const outline = [[0,3.1],[11.6,3.1],[11.6,9],[13.4,9],[13.4,25.7],[18.6,25.7],
        [18.6,32.4],[6.5,32.4],[6.5,29.4],[0,29.4],[0,ridgeV],[0,3.1]];
      for (let i=1; i<outline.length; i++) {
        const [u,v]=outline[i-1], [s,t]=outline[i];
        const boundary = v < ridgeV && t > ridgeV ? [[u,v],[u,ridgeV],[s,t]] : [[u,v],[s,t]];
        for (let j=1;j<boundary.length;j++) {
          const [a,c]=boundary[j-1], [d,f]=boundary[j];
          b.quad(point(a,c,base-.5),point(d,f,base-.5),point(d,f,roofY(f)),point(a,c,roofY(c)),siding);
        }
        const du=s-u, dv=t-v, len=Math.hypot(du,dv);
        const sash = (along: number, height: number, out: number) =>
          point(u+(du*along+dv*out)/len,v+(dv*along-du*out)/len,height);
        const panel = (batch: Builder, mid: number, half: number, lo: number, hi: number, out: number, color: string) =>
          batch.quad(sash(mid-half,lo,out),sash(mid+half,lo,out),sash(mid+half,hi,out),sash(mid-half,hi,out),color);
        const centers = i===1 ? [1.8,3.45,5.1,9.1,10.55] : Array.from({length:Math.floor(len/3.8)},(_,k)=>len*(k+.5)/Math.floor(len/3.8));
        for (const mid of centers) {
          panel(b,mid,.68,floor+.76,floor+2.55,.045,trim);
          panel(lights,mid,.55,floor+.90,floor+2.43,.07,glass);
          panel(b,mid,.56,floor+1.8,floor+1.88,.09,trim);
        }
      }
      box(b,6.43,3.03,1.42,.09,floor,floor+2.65,trim);
      box(b,6.54,3.00,1.2,.08,floor,floor+2.54,'#574e40');
      box(b,0,0,11.6,3.1,base-.45,floor,stone);
      for(let i=0;i<4;i++) box(b,5.85,-1.28+i*.32,2.55,.33,base-.5,floor-(4-i)*.145,'#b5ad9d');
      for(const [u,v] of [[.28,.2],[10.76,.2],[15.76,.25],[15.76,6.34]]) {
        box(b,u,v,.72,.72,Math.min(base,grade(u,v,base))-.48,floor+1.05,stone);
        box(b,u-.04,v-.04,.8,.8,floor+.97,floor+1.13,'#c5bba4');
        box(b,u+.12,v+.12,.48,.48,floor+1.12,porchEave,trim);
      }
    },
    dressRoof(b) {
      for(const [u,s,v,t] of bands) {
        b.quad(point(u,v,roofY(v)),point(s,v,roofY(v)),point(s,t,roofY(t)),point(u,t,roofY(t)),v<ridgeV?slate:'#8c8b85');
      }
      // A single centred porch ridge dies into the rising street-facing slope.
      const left=-.34, right=11.94, mid=(left+right)/2, front=-.42, peak=porchEave+2.1;
      for(const edge of [left,right]) {
        const crestEnd=3.1+(peak-eave)*(ridgeV-3.1)/ridgeRise;
        b.quad(point(edge,front,porchEave),point(mid,front,peak),point(mid,crestEnd,peak),point(edge,3.1,porchEave),slate);
        b.quad(point(edge,front-.02,porchEave),point(mid,front-.02,peak),point(mid,front-.02,peak-.13),point(edge,front-.02,porchEave-.13),trim);
      }
      b.tri(point(left,front,porchEave),point(right,front,porchEave),point(mid,front,peak),shingles);
      box(b,left,front,right-left,.2,porchEave-.19,porchEave,trim);
      box(b,4.36,front-.045,2.89,.08,porchEave+.28,porchEave+1.21,trim);
      for(const u of [4.48,5.4,6.32]) box(b,u,front-.07,.81,.04,porchEave+.39,porchEave+1.10,glass);
      // Open drive-through bay has its own shallow shed, below the porch rake.
      const inner=porchEave+.32, outer=porchEave-.04;
      b.quad(point(11.6,-.14,inner),point(16.75,-.14,outer),point(16.75,7.2,outer),point(11.6,7.2,inner),'#919087');
      for(const v of [-.14,7.2]) b.quad(point(11.6,v,inner),point(16.75,v,outer),point(16.75,v,outer-.16),point(11.6,v,inner-.16),trim);
      box(b,16.65,-.14,.1,7.34,outer-.16,outer,trim);
    }
  };
}
