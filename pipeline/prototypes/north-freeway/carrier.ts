// Development-only Brookwood carriageways. XY and lane ordinals follow City's directed ribbons.
import observations from './sections.json';
import { alongOn, matchRibbon, sectionAt, stripePoint, ribbons } from '../../../web/src/terrain/connector-corridor';
import type { TerrainCity, TransportRun } from '../../../web/src/terrain/transport-data';
import { PAL } from '../../../web/src/vignette/world';
import type { P2 } from '../../../web/src/vignette/geom';

type Vertex = [number,number,number];
type Section = typeof observations[number];
const rowFor = (id:number) => observations.find(row => row.way === id)!;
const south = rowFor(28038801), approach = rowFor(1416312985);
const leadingLength = south.rows.at(-1)![0] - south.rows[0][0];
const phase = new Map([[south.way,-south.rows[0][0]], [approach.way,leadingLength],
  [369529900,leadingLength+approach.rows.at(-1)![0]+ribbons.find(r=>r.id===484857197)!.line.length]]);

function drawProfile(data: Section, ribbon: typeof ribbons[number], bounds: TerrainCity['bounds']): NonNullable<TransportRun['drawTread']> {
  // Clip triangles, including their Y, after solving the full-width carriageway in source space.
  const clip = (polygon: Vertex[], z: number, sign: number) => {
    const out: Vertex[] = [];
    for (let i=0;i<polygon.length;i++) {
      const a=polygon[(i+polygon.length-1)%polygon.length], b=polygon[i];
      const da=(a[2]-z)*sign, db=(b[2]-z)*sign;
      if ((da<0)!==(db<0)) {
        const t=da/(da-db);
        out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),z]);
      }
      if(db>=0) out.push(b);
    }
    return out;
  };
  return (builder,sceneZero) => {
    const top:number[]=[];
    const obs=data.rows;
    const lo=obs[0][0],hi=Math.min(obs.at(-1)![0],ribbon.line.length);
    const stations = new Set([lo,hi,...obs.map(r=>r[0]),...ribbon.line.cum,...ribbon.rows.map(r=>r.s)]);
    const startPhase=phase.get(data.way)!;
    for(let s=Math.floor((lo+startPhase)/12)*12-startPhase;s<=hi;s+=12) {
      stations.add(s); stations.add(s+3);
    }
    const ordered=[...stations].filter(s=>s>=lo && s<=hi).sort((a,b)=>a-b);
    function vertex(s:number, f:number, lift:number):Vertex {
      let i=1;
      while(i<obs.length-1 && obs[i][0]<s) i++;
      const a=obs[i-1],b=obs[i],t=(s-a[0])/(b[0]-a[0]);
      const h=(j:number)=>a[j]+(b[j]-a[j])*t;
      const center=h(2), offset=(f-.5)/.36;
      const lateral=Math.abs(offset)*((offset<0?h(1):h(3))-center);
      // Existing span tops include a 12 cm model lift and use a level cross section.
      // Match those exact rows at the two surveyed abutments; use the returns elsewhere.
      const fromSpan=data.way===369529900?s:data.way===1416312985?hi-s:Infinity;
      const blend=Math.max(0,1-fromSpan/10);
      const spanEnd=data.way===1416312985 ? 254.48 : 256.77;
      const [x,z]=stripePoint(sectionAt(ribbon,s),f);
      const terminalAdjustment=data.way===1416312985?spanEnd-obs.at(-1)![2]:spanEnd-obs[0][2];
      return [x,center+lateral*(1-blend)+blend*(.12+terminalAdjustment)+lift-sceneZero,z];
    }
    const pitch=data.lanes*3.55;
    const strip=(s:number,t:number,l:number,r:number,color:string,isTop:boolean)=>{
      const lift=isTop?0:.022;
      const a=vertex(s,l,lift),b=vertex(s,r,lift),c=vertex(t,r,lift),d=vertex(t,l,lift);
      for(const triangle of [[a,b,c],[a,c,d]]) {
        const poly=clip(clip(triangle,bounds.minZ,1),bounds.maxZ,-1);
        for(let i=1;i+1<poly.length;i++) {
          const [u,v,w]=[poly[0],poly[i],poly[i+1]];
          const normal=(v[2]-u[2])*(w[0]-u[0])-(v[0]-u[0])*(w[2]-u[2]);
          if(Math.abs(normal)<1e-8)continue;
          if(isTop)top.push(builder.pos.length/3);
          builder.tri(u,normal>0?v:w,normal>0?w:v,color);
        }
      }
    };
    for(let i=1;i<ordered.length;i++) {
      const a=ordered[i-1],b=ordered[i];
      if(b-a<.001)continue;
      strip(a,b,-1.8/pitch,.5,PAL.asphaltHwy,true);
      strip(a,b,.5,1+1.8/pitch,PAL.asphaltHwy,true);
      for(let lane=0;lane<=data.lanes;lane++) {
        const edge=lane===0||lane===data.lanes;
        if(!edge && ((a+b)/2+startPhase)%12>=3)continue;
        const f=lane/data.lanes;
        strip(a,b,f-.14/pitch,f+.14/pitch,lane===0?PAL.lineYellow:PAL.lineWhite,false);
      }
    }
    return top;
  };
}

export function northFreeway(city: TerrainCity): TerrainCity {
  const transport=city.terrainTransport;
  if(!transport||city.bounds.maxZ< -6500||city.bounds.minZ> -5400)return city;
  const additions:TransportRun[]=[];
  const replaced=new Set<P2[]>();
  for(const road of city.roads) {
    if(road.cls!=='motorway'||road.sub==='link'||road.pts.length<2)continue;
    const ribbon=matchRibbon(road.pts[0],road.pts[1],false);
    const data=observations.find(d=>d.way===ribbon?.id);
    if(!data||!ribbon)continue;
    const lo=Math.max(data.rows[0][0],alongOn(ribbon,road.pts[0]).s);
    const hi=Math.min(data.rows.at(-1)![0],alongOn(ribbon,road.pts.at(-1)!).s);
    if(hi-lo<.1)continue;
    const pts=[lo,...ribbon.line.cum.filter(s=>s>lo&&s<hi),hi].map(s=>{
      const p=ribbon.line.at(s); return [p.x,p.z] as P2;
    });
    // Existing terrain paint excludes this interval through its bridge-run inventory.
    additions.push({cls:'motorway',kind:'bridge',name:road.name,sourceAxis:road.pts,pts,
      drawTread:drawProfile(data,ribbon,city.bounds)});
    if(data.way!==28038801)replaced.add(road.pts);
  }
  return {...city,terrainTransport:{...transport,roads:[...additions,...transport.roads.filter(r=>!r.sourceAxis||!replaced.has(r.sourceAxis))]}};
}
