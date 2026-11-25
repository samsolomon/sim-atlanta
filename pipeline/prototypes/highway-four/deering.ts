import type { P2 } from '../../../web/src/vignette/geom';
import picks from './deering-sections.json';

type Pick = [number,P2,P2];
type Row = {s:number;inner:P2;outer:P2};
export const deeringBranch=29013401, deeringThrough=9238120, deeringDonor=358758245;
const sections=new Map(Object.entries(picks).map(([id,values])=>[Number(id),values as Pick[]]));
export const deeringStations=(id:number)=>sections.get(id)?.map(([s])=>s) ?? [];

function blend(a:P2,b:P2,t:number):P2 {return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}

// Both consumers use the same measured stripe frame. The fixed child ordinals
// overlap by one choice lane at the source node and diverge in travel order.
export function deeringSection(id:number,row:Row):Row {
  const points=sections.get(id);
  if(!points)return row;
  const start=points[0],end=points[points.length-1];
  const outside=Math.max(start[0]-row.s,row.s-end[0],0);
  if(outside>=32)return row;
  let i=1;
  while(i+1<points.length && points[i][0]<row.s)i++;
  const a=points[i-1],b=points[i];
  // Extrapolate the terminal tangent during the bounded return to the source
  // centreline. Clamping to the last fixed point would stop forward movement.
  const t=(row.s-a[0])/(b[0]-a[0]);
  const weight=outside/32;
  return {s:row.s,inner:blend(blend(a[1],b[1],t),row.inner,weight),
    outer:blend(blend(a[2],b[2],t),row.outer,weight)};
}

// Skip both interior branch-edge strokes until the aerial separator opens.
// The enclosing stripes and branch lane dividers remain continuous.
export function deeringEdgeStart(id:number,ordinal:number,lanes:number){
  if((id===deeringBranch && ordinal===lanes)||(id===deeringThrough && ordinal===0))
    return sections.get(id)![1][0];
  return 0;
}
