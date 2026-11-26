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


import { Builder } from '../../../web/src/vignette/geom';
import { drawRoadWallSteps, type RoadWall } from './profile-wall';
import type { Build } from '../../../web/src/core/slice';
import toes from './wall-toes.json';

const sourceRuns=[28038801,1416312985,484857197,369529900].map(id=>ribbons.find(r=>r.id===id)!);
const origins=[-sourceRuns[0].line.length-sourceRuns[1].line.length,-sourceRuns[1].line.length,0,sourceRuns[2].line.length];
const creekEnd=origins[3];
const bounds:[number,number]=[origins[0]+1020,creekEnd+sourceRuns[3].line.length];
function edgeAt(s:number,side:RoadWall['side']){
  const index=origins.reduce((last,origin,i)=>origin<=s?i:last,0);
  const r=sourceRuns[index], row=sectionAt(r,s-origins[index]);
  const f=side==='right'?1+1.8/(6*3.55):-1.8/(6*3.55);
  return {edge:stripePoint(row,f),inside:stripePoint(row,f+(side==='right'?-.0005:.0005))};
}
// At a rotated road section the right edge crosses z=-5700 at its own station.
let lo=creekEnd,hi=bounds[1];
for(let i=0;i<48;i++){
  const mid=(lo+hi)/2;
  if(edgeAt(mid,'right').edge[1]>-5700)lo=mid;else hi=mid;
}
export const wallSeam=(lo+hi)/2;
export function brookwoodWall(top:(x:number,z:number)=>number|null):RoadWall {
  return {
    side:'right',bounds,
    evidence:{extent:'County 2024 aerial plus dated GA 13 roadside panoramas in side-observations.json',
      top:'Inside the owning NB tread; USGS classified pavement windows, NAVD88 datum',
      toe:'Median of class-2 windows 16–22 m right of the source axis, interpolated; face alignment inferred'},
    interruptions:[{from:0,to:creekEnd,feature:'Clear Creek open span NBI 12105500'},
      {from:creekEnd+320,to:bounds[1],feature:'ramp passage and portal transition; independent lining and wings'}],
    breaks:[wallSeam,...origins,...toes.map(t=>t[0]),...sourceRuns.flatMap((r,i)=>r.rows.map(row=>origins[i]+row.s))],
    section(s,side){
      const {edge,inside}=edgeAt(s,side),y=top(...inside);
      if(y===null||!Number.isFinite(y))return null;
      let i=1;while(i<toes.length-1&&toes[i][0]<s)i++;
      const a=toes[i-1],b=toes[i],t=Math.max(0,Math.min(1,(s-a[0])/(b[0]-a[0])));
      return {edge,top:y,toe:a[1]+(b[1]-a[1])*t-323.8};
    }
  };
}
// Callback compatibility with the private mount. All facets are emitted by Builder.wall.
export function* retainedOuterEdge(top:(x:number,z:number)=>number|null, quad:(vertices:V[],color:string)=>void): Build<void> {
  class MountWall extends Builder {
    override quad(a:V,b:V,c:V,d:V,color:string){quad([a,b,c,d],color);}
  }
  yield* drawRoadWallSteps(new MountWall(),brookwoodWall(top));
}
