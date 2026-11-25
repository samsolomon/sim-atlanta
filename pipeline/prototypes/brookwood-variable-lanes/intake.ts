// Two ground approaches carry measured centre profiles down from separate spans.
// Drive and paint already use these signed sections; apply them to the last
// structural treads as well. All heights and weights come from the owning run.
import { Line, type P2 } from '../../../web/src/vignette/geom';
import { PAL } from '../../../web/src/vignette/world';
import { stripePoint } from '../../../web/src/terrain/connector-corridor';
import type { TransportRun } from '../../../web/src/terrain/transport-data';
import axes from './axes.json';
import { sections, startGain } from './profile';

const clamp = (v:number) => Math.min(1,Math.max(0,v));
export function intakeTread(run:TransportRun):TransportRun {
  const source=run.sourceAxis, heights=run.deckNavd88M, weights=run.deckWeight;
  if(!source || !heights || !weights || run.cls!=='motorway') return run;
  const intake=([484857195,1257642775] as const).find(id=>{
    const pts=axes[id].pts;
    return source.length===pts.length && source.every(([x,z],i)=>x===pts[i][0] && z===pts[i][1]);
  });
  if(!intake)return run;
  const ramp=intake===1257642775, lanes=ramp?1:5, width=3.55*lanes;
  const axis=new Line(source), profile=new Line(run.pts);
  const register=(d:number)=>startGain*(1-d/axis.length);
  const sourceD=(s:number)=>axis.length*(1-s/startGain);
  const last=register(profile.length);
  const stations=new Set([startGain,last,...profile.cum.map(register)]);
  for(let s=Math.ceil(startGain);s<last;s++)stations.add(s);
  const rows=[...stations].sort((a,b)=>a-b).map(s=>{
    const vertex=profile.vertexAt(sourceD(s));
    const i=Math.min(Math.floor(vertex),heights.length-2),t=vertex-i;
    const layout=sections('gain',s);
    const section=ramp?layout.ramp:layout.main;
    const tie=clamp((s-startGain)/12);
    const inside=ramp?.7*(1-tie):1.8;
    const outside=ramp?.7+1.1*tie:1.8*(1-tie);
    const w=weights[i]+t*(weights[i+1]-weights[i]);
    return {s,section,inside,outside,w,height:heights[i]+t*(heights[i+1]-heights[i]),
      // Meet the original bridge at full thickness and fade the raised lip
      // into the ground-painted shoulder over the approach.
      settle:clamp((last-s)/12)};
  });
  return {...run,drawTread(builder,zero,ground){
    const top:number[]=[];
    type Row=(typeof rows)[number];
    function point(row:Row,f:number,lift:number){
      const [x,z]=stripePoint(row.section,f);
      const bare=ground(x,z);
      if(bare===null)throw Error('Missing Brookwood intake ground');
      const y=bare+Math.max(0,row.height-zero-bare)*row.w;
      return [x,y+lift*row.settle,z];
    }
    const quad=(a:Row,b:Row,l:(row:Row)=>number,r:(row:Row)=>number,lift:number,color:string,tread=false)=>{
      if(tread){const i=builder.pos.length/3;top.push(i,i+3);}
      builder.quad(point(a,l(a),lift),point(a,r(a),lift),point(b,r(b),lift),point(b,l(b),lift),color);
    };
    for(let j=1;j<rows.length;j++){
      const a=rows[j-1],b=rows[j],s=(a.s+b.s)/2;
      const left=(r:Row)=>-r.inside/width, right=(r:Row)=>1+r.outside/width;
      quad(a,b,left,()=>0,.12,'#66666c',true);
      for(let i=0;i<2*lanes;i++)quad(a,b,()=>i/(2*lanes),()=>(i+1)/(2*lanes),.12,PAL.asphaltHwy,true);
      quad(a,b,()=>1,right,.12,'#66666c',true);
      // Preserve the upstream edge treatment where its carrying span is high.
      // Both inner faces recede before the ramp meets the through lanes.
      for(const [edge,sign] of [[left,1],[right,-1]] as const){
        const outerA=point(a,edge(a),.12),outerB=point(b,edge(b),.12);
        const skirt=(row:Row,p:number[])=>[p[0],p[1]-.95*row.w,p[2]];
        builder.quad(outerA,outerB,skirt(b,outerB),skirt(a,outerA),PAL.concreteDark);
        const inset=(row:Row)=>edge(row)+sign*.28/width;
        const up=(row:Row,f:number)=>{const p=point(row,f,.12);p[1]+=.85*row.w;return p;};
        builder.quad(outerA,outerB,up(b,edge(b)),up(a,edge(a)),PAL.concrete);
        builder.quad(up(a,edge(a)),up(b,edge(b)),up(b,inset(b)),up(a,inset(a)),PAL.concrete);
        builder.quad(point(a,inset(a),.12),up(a,inset(a)),up(b,inset(b)),point(b,inset(b),.12),PAL.concrete);
      }
      for(let i=0;i<=lanes;i++){
        const seam=ramp?i===0:i===lanes;
        if(seam && s>=-18 && ramp)continue;
        const dashed=seam?s>=-18:i>1&&i<lanes;
        if(dashed && ((s%12)+12)%12>=3)continue;
        quad(a,b,()=>(i-.14/3.55)/lanes,()=>(i+.14/3.55)/lanes,.15,i===0&&!ramp?PAL.lineYellow:PAL.lineWhite);
      }
    }
    return top;
  }};
}
