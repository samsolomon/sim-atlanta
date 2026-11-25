// Private R16 study. The lower road module is supplied by the corridor owner.
import { east, west, lowerAxis, lowerEdges, lowerPoint } from '../i85-cohesion/lower';
import type { OpenSlot } from '../../../web/src/terrain/openings';

type Ground = (x:number,z:number)=>number|null;
type XYZ = [number,number,number];

// The two roof limits are inferred from the mounted ground sections. The NBI
// underclearance applies at the structure, not at every ramp station.
export function rampMouthSlots(exposed: Ground): OpenSlot[] {
  const slots: OpenSlot[] = [];
  for (const [lo,hi] of [[east-15,east+24],[west-3,west+25]]) {
    const stations=new Set([lo,hi,...lowerAxis.cum.filter(s=>s>lo && s<hi)]);
    for (let s=lo+1;s<hi;s++) stations.add(s);
    const rows=[...stations].sort((a,b)=>a-b).map(s=>{
      const [l,r]=lowerEdges.map(offset=>lowerPoint(s,offset,exposed));
      if (!l || !r) throw new Error('Missing original ground at ramp mouth '+s);
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
