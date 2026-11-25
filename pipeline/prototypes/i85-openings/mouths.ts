// Private R16 study. The lower road module is supplied by the corridor owner.
import { east, west, lowerAxis, lowerEdges } from '../i85-cohesion/lower';
import { rampSection } from './lining';
import type { OpenSlot } from '../../../web/src/terrain/openings';

type Ground = (x:number,z:number)=>number|null;
type XYZ = [number,number,number];

// The two roof limits are inferred from the mounted ground sections. The NBI
// underclearance applies at the structure, not at every ramp station.
export function rampMouthSlots(exposed: Ground): OpenSlot[] {
  const slots: OpenSlot[] = [];
  for (const [lo,hi] of [[east-15,east+28],[west-5,west+25]]) {
    const stations=new Set([lo,hi,...[east-12,east,west,west+12].filter(s=>s>lo && s<hi),...lowerAxis.cum.filter(s=>s>lo && s<hi)]);
    for (let s=lo+1;s<hi;s++) stations.add(s);
    const rows=[...stations].sort((a,b)=>a-b).map(s=>{
      const {l,r}=rampSection(s,exposed);
      // Remove the original top over the new paved width, including the seam
      // at which the blended pavement reaches grade. Keep roof between mouths.
      const center: XYZ=[(l[0]+r[0])/2,Math.min(l[1],r[1])-.35,(l[2]+r[2])/2];
      return {l,r,center};
    });
    for (let i=1;i<rows.length;i++) {
      const a=rows[i-1],b=rows[i];
      slots.push({start:a.center,end:b.center,halfWidthM:(lowerEdges[1]-lowerEdges[0])/2,
        footprint:[a.l,a.r,b.r,b.l].map(p=>[p[0],p[2]] as const)});
    }
  }
  return slots;
}
