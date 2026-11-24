// 145 The Prado. Local metres run south along the street frontage (u) and east
// into the lot (v). The axes follow the long western edge of OSM way 269539876.
import type { BuildingFinish } from '../vignette/world';
import { PALETTE } from '../materials/library';
import type { Builder } from '../vignette/geom';

export const pradoCraftsmanId = 'osm:way:269539876';
const wall = '#75776a', shingles = '#535953', roof = PALETTE.asphalt.charcoal, trim = '#dedbc9', stone = PALETTE.granite.grey;
const point = (u:number,v:number,y:number) => [1225.03+.1624*u+.9867*v, y, -4434.2+.9867*u-.1624*v];

function prism(b:Builder,u:number,v:number,width:number,depth:number,lo:number,hi:number,color:string) {
  const top = [[u,v],[u+width,v],[u+width,v+depth],[u,v+depth]].map(([x,z])=>point(x,z,hi));
  b.quad(top[0],top[1],top[2],top[3],color);
  for(let i=0;i<4;i++) {
    const a=top[i], c=top[(i+1)%4];
    b.quad([a[0],lo,a[2]],[c[0],lo,c[2]],c,a,color);
  }
}

export const pradoCraftsman: BuildingFinish = {
  wall, roof, parapet:0, fallbackHeight:6.1,
  drawRing(b,ring,_hole,base,eave,glass) {
    // Retain the stepped rear perimeter. Recess the front wall so the porch
    // and the drive-through bay beside it are open beneath the roof.
    const floor=eave-3.15;
    for(let i=0;i<ring.length;i++) {
      const a=ring[i], c=ring[(i+1)%ring.length];
      const local=([x,z]:number[]) => [(x-1225.03)*.1624+(z+4434.2)*.9867,(x-1225.03)*.9867-(z+4434.2)*.1624];
      const [u,v]=local(a), [cu,cv]=local(c);
      if(Math.max(v,cv)<.2 || (Math.max(v,cv)<7.4 && Math.min(u,cu)>11.4)) continue;
      const from = v<.15 ? point(u,3.1,base-.5) : [a[0],base-.5,a[1]];
      const to = cv<.15 ? point(cu,3.1,base-.5) : [c[0],base-.5,c[1]];
      b.quad(from,to,[to[0],eave,to[2]],[from[0],eave,from[2]],wall);
      const dx=to[0]-from[0], dz=to[2]-from[2], length=Math.hypot(dx,dz);
      const bays=Math.floor(length/4.2);
      for(let j=0;j<bays;j++) {
        // Keep each sash parallel to its wall, with the light trim outside the siding.
        const pane=(along:number,h:number,offset:number) => [
          from[0]+dx*along/length-dz*offset/length,h,from[2]+dz*along/length+dx*offset/length];
        const mid=length*(j+.5)/bays;
        const panel=(batch:Builder,w:number,lo:number,hi:number,out:number,color:string)=>
          batch.quad(pane(mid-w,lo,out),pane(mid+w,lo,out),pane(mid+w,hi,out),pane(mid-w,hi,out),color);
        panel(b,.63,floor+.82,floor+2.19,.04,trim);
        panel(glass,.52,floor+.94,floor+2.08,.06,'#738187');
      }
    }
    b.quad(point(0,3.1,base-.5),point(11.6,3.1,base-.5),point(11.6,3.1,eave),point(0,3.1,eave),wall);
    b.quad(point(11.6,3.1,base-.5),point(11.6,7.2,base-.5),point(11.6,7.2,eave),point(11.6,3.1,eave),wall);
    prism(b,0,0,11.6,3.1,base-.5,floor,stone);
    for(const u of [.24,10.88,15.86]) {
      prism(b,u,.2,.55,.55,base-.5,floor+.85,stone);
      prism(b,u+.1,.3,.35,.35,floor+.85,eave,trim);
    }
    prism(b,0,0,16.6,.25,eave-.22,eave,trim);
    prism(b,6.7,3.04,1.12,.08,floor,floor+2.24,'#51483d');
    for(const u of [1.2,2.55,4.05,8.75]) {
      prism(b,u,3.02,1.18,.10,floor+.78,floor+2.18,trim);
      glass.quad(point(u+.09,3.00,floor+.87),point(u+1.09,3.00,floor+.87),
        point(u+1.09,3.00,floor+2.09),point(u+.09,3.00,floor+2.09),'#758287');
    }
  },
  dressRoof(b,_ring,eave) {
    const gable=(u0:number,u1:number,v0:number,v1:number,rise:number,side:boolean)=>{
      const p=(s:number,d:number,h:number)=>side?point(d,s,h):point(s,d,h);
      const [l,r,front,back]=side?[v0,v1,u0,u1]:[u0,u1,v0,v1];
      const mid=(l+r)/2;
      for(const d of [front,back]) {
        b.tri(p(l,d,eave),p(r,d,eave),p(mid,d,eave+rise),shingles);
        for(const end of [l,r]) {
          const edge=d+(d===front?-.02:.02);
          b.quad(p(end,edge,eave),p(mid,edge,eave+rise),p(mid,edge,eave+rise-.12),p(end,edge,eave-.12),trim);
        }
      }
      for(const end of [l,r]) b.quad(p(end,front,eave),p(end,back,eave),p(mid,back,eave+rise),p(mid,front,eave+rise),roof);
    };
    gable(-.35,13.65,2.85,19,3.65,true); // side-gabled main block
    gable(-.4,11.95,-.5,10.7,3.05,false); // projecting shingled porch gable
    gable(11.9,16.75,-.12,7.22,1.15,true); // open porte-cochère
    gable(-.05,13.4,15.2,29.35,2.7,false);
    gable(6.5,18.6,25.65,32.42,1.4,true);
    prism(b,4.33,-.56,2.9,.08,eave+.48,eave+1.56,trim);
    for(const u of [4.46,5.36,6.26]) prism(b,u,-.59,.77,.05,eave+.60,eave+1.44,'#53636a');
  },
};
