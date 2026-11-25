import { east,west,lowerAxis,lowerEdges,lowerPoint } from '../i85-cohesion/lower';

type Ground=(x:number,z:number)=>number|null;
type V=[number,number,number];
type Emit=(a:V,b:V,c:V,d:V,color:string)=>void;
const margin=1.525;
const height=5.65; // Inferred clear profile. The bridge inventory reports a 5.51 m minimum.
const slab=.45;

export function rampSection(s:number,exposed:Ground) {
  const left=lowerPoint(s,lowerEdges[0],exposed),right=lowerPoint(s,lowerEdges[1],exposed);
  if (!left || !right) throw new Error('Missing lower road profile at '+s);
  const width=Math.hypot(right[0]-left[0],right[2]-left[2]);
  const nx=(right[0]-left[0])/width,nz=(right[2]-left[2])/width;
  const wing=Math.max(0,Math.min(1,(s-east+12)/12,(west+12-s)/12));
  const edge=(p:V,sign:number):V=>[p[0]+sign*margin*wing*nx,p[1],p[2]+sign*margin*wing*nz];
  return {left,right,l:edge(left,-1),r:edge(right,1),wing};
}

export function rampLining(exposed:Ground,quad:Emit) {
  const lo=east-15,hi=west+25;
  const stations=new Set([lo,hi,east-12,east,west,west+12,...lowerAxis.cum.filter(v=>v>lo&&v<hi)]);
  for(let s=lo+1;s<hi;s++)stations.add(s);
  const levels=[...stations].sort((a,b)=>a-b);
  const lift=(p:V,h:number):V=>[p[0],p[1]+h,p[2]];
  const rows=levels.map(s=>rampSection(s,exposed));
  const cap=(p:V)=>lift(p,height+slab);
  for(let i=1;i<rows.length;i++) {
    const a=rows[i-1],b=rows[i],s=(levels[i-1]+levels[i])/2;
    if(!a.wing && !b.wing)continue;
    // Margins close the floor all the way to the lining. No paint or wheels use them.
    quad(a.l,b.l,b.left,a.left,'#777574');
    quad(a.right,b.right,b.r,a.r,'#777574');
    const inside=s>east && s<west;
    for(const side of ['l','r'] as const) {
      const start=a[side],end=b[side];
      const top=(p:V,w:number):V=>{
        const ground=exposed(p[0],p[2]);
        if(ground===null)throw new Error('Missing uncut wing terrain');
        return inside?lift(p,height):[p[0],Math.max(p[1],p[1]+(height+slab)*w,ground),p[2]];
      };
      const upperA=top(start,a.wing),upperB=top(end,b.wing);
      const outer=(p:V,row:typeof a):V=>{
        const dx=row.r[0]-row.l[0],dz=row.r[2]-row.l[2],length=Math.hypot(dx,dz);
        const out=(side==='l'?-1:1)*.16*row.wing;
        return [p[0]+out*dx/length,p[1],p[2]+out*dz/length];
      };
      const crownA=inside?cap(start):upperA,crownB=inside?cap(end):upperB;
      const oa=outer(crownA,a),ob=outer(crownB,b);
      quad(crownA,crownB,ob,oa,'#aaa18d');
      quad(outer(start,a),outer(end,b),ob,oa,'#a39985');
      if(side==='l')quad(start,end,upperB,upperA,'#a39985');
      else quad(end,start,upperA,upperB,'#a39985');
    }
    if(inside) {
      quad(lift(a.r,height),lift(b.r,height),lift(b.l,height),lift(a.l,height),'#969182');
      quad(cap(a.l),cap(b.l),cap(b.r),cap(a.r),'#aaa18d');
      // Close the exposed roof edges wherever adjacent terrain is lower.
      for(const side of ['l','r'] as const) {
        const p=a[side],q=b[side];
        quad(lift(p,height),lift(q,height),cap(q),cap(p),'#9c937f');
      }
    }
  }
  for(const s of [east,west]) {
    const {l,r}=rampSection(s,exposed);
    quad(lift(l,height),lift(r,height),cap(r),cap(l),'#b5ad9e');
  }
}
