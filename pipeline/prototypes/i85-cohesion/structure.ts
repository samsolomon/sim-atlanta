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
