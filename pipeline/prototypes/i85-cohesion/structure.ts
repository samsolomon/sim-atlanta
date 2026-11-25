// Private schematic NB slab fascia. Top geometry and traffic remain with the existing carrier.
import { ribbons, sectionAt, stripePoint } from '../../../web/src/terrain/connector-corridor';
import { east, lowerAxis } from './lower';
import register from './register.json';
type V = [number,number,number];
export function rampSpanSides(top: (x:number,z:number)=>number|null, quad:(vertices:V[])=>void) {
  const carrier=ribbons.find(r=>r.id===369529900)!;
  const fraction=1.8/(6*3.55); // same shoulders as the accepted NB carrier
  for(const edge of [-fraction,1+fraction]){
    // The two sides cross the lower route at different chainages on a skewed span.
    const edgeAt=(s:number)=>stripePoint(sectionAt(carrier,s),edge);
    const lower=lowerAxis.at(east+register.lowerStation);
    const side=(s:number)=>{
      const [x,z]=edgeAt(s);
      return (x-lower.x)*lower.nx+(z-lower.z)*lower.nz;
    };
    let lo=0,hi=carrier.line.length;
    if(side(lo)*side(hi)>0)continue;
    for(let i=0;i<32;i++){
      const mid=(lo+hi)/2;
      if(side(mid)*side(lo)>0)lo=mid;else hi=mid;
    }
    const middle=(lo+hi)/2;
    // 14 m along NB is reported overall structure length. Individual edge limits,
    // skew and slab depth are modeled. No surveyed soffit or pier coordinates.
    for(let j=-7;j<7;j++){
      const pair=[middle+j,middle+j+1].map(s=>{
        const [x,z]=edgeAt(s);
        const inner=stripePoint(sectionAt(carrier,s),edge+(edge<0?.0005:-.0005));
        const y=top(...inner);
        return y===null?null:[x,y,z] as V;
      });
      const [a,b]=pair;
      if(!a||!b)continue;
      const depth=.55;
      quad([a,b,[b[0],b[1]-depth,b[2]],[a[0],a[1]-depth,a[2]]]);
    }
  }
}

import windows from './wall-windows.json';
// Roadside views on GA 13 show a panel retaining face continuing from the creek's
// north abutment toward the east portal. Distinct roof/wing faces belong to Ground.
export function retainedOuterEdge(top:(x:number,z:number)=>number|null, quad:(vertices:V[],color:string)=>void) {
  const carrier=ribbons.find(r=>r.id===369529900)!;
  const outer=1+1.8/(6*3.55);
  const samples=new Map<number,number[]>();
  for(const [station,offset,bands] of windows as [number,number,number[][]][]){
    if(offset<16 || offset>22)continue;
    for(const [cls,,median] of bands){
      if(cls!==2)continue;
      const values=samples.get(station)??[];
      values.push(median);samples.set(station,values);
    }
  }
  const anchors=[...samples].map(([s,values])=>[s,values.sort((a,b)=>a-b)[values.length>>1]]).sort((a,b)=>a[0]-b[0]);
  const vertex=(s:number)=>{
    const section=sectionAt(carrier,s),[x,z]=stripePoint(section,outer);
    const y=top(...stripePoint(section,outer-.0005));
    if(y===null)return null;
    const i=anchors.findIndex(([station])=>station>=s);
    const b=anchors[i],a=anchors[Math.max(0,i-1)];
    const low=a[1]+(b[1]-a[1])*(s-a[0])/(b[0]-a[0]||1)-323.8;
    return {x,y,z,low};
  };
  // End before the approach overlaps Ground's inferred portal/wing treatment.
  for(let s=0;s<320;s+=2){
    const a=vertex(s),b=vertex(s+2);
    if(!a||!b)continue;
    const rows=Math.max(1,Math.ceil(((a.y-a.low)+(b.y-b.low))/3));
    for(let j=0;j<rows;j++){
      const at=(p:NonNullable<typeof a>,k:number):V=>[p.x,p.low+(p.y-p.low)*k/rows,p.z];
      quad([at(a,j),at(b,j),at(b,j+1),at(a,j+1)],['#aaa398','#b3ac9e','#aea89a'][(s/2+2*j)%3]);
    }
  }
}
