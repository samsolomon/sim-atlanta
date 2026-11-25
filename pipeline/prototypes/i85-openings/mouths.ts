// Private R16 study. The lower road module is supplied by the corridor owner.
import { east, west, lowerAxis, lowerEdges } from '../i85-cohesion/lower';
import { rampSection, roofTopAboveTread } from './lining';
import type { OpenSlot } from '../../../web/src/terrain/openings';

type Ground = (x:number,z:number)=>number|null;
type XYZ = [number,number,number];

// The two roof limits are inferred from the mounted ground sections. The NBI
// underclearance applies at the structure, not at every ramp station.
export function rampMouthSlots(exposed: Ground): OpenSlot[] {
  const slots: OpenSlot[] = [];
  const bedDepth = .35;
  for (const [lo,hi] of [[east-15,east+40],[west-5,west+25]]) {
    const stations=new Set([lo,hi,...[east-12,east,west,west+12].filter(s=>s>lo && s<hi),...lowerAxis.cum.filter(s=>s>lo && s<hi)]);
    for (let s=lo+1;s<hi;s++) stations.add(s);
    const ordered=[...stations].sort((a,b)=>a-b);
    const rows=ordered.map(s=>{
      const section=rampSection(s,exposed);
      const [l,r]=[section.l,section.r].map((p,i):XYZ=>{
        const dx=section.r[0]-section.l[0],dz=section.r[2]-section.l[2],length=Math.hypot(dx,dz);
        const out=(i?1:-1)*.08*section.wing;
        return [p[0]+out*dx/length,p[1],p[2]+out*dz/length];
      });
      // Remove the original top over the new paved width, including the seam
      // at which the blended pavement reaches grade. Keep roof between mouths.
      const center: XYZ=[(l[0]+r[0])/2,Math.min(l[1],r[1])-bedDepth,(l[2]+r[2])/2];
      return {l,r,center};
    });
    for (let i=1;i<rows.length;i++) {
      const a=rows[i-1],b=rows[i];
      slots.push({start:a.center,end:b.center,halfWidthM:(lowerEdges[1]-lowerEdges[0])/2,
        // End the excavation inside the solid roof. Original embankment above
        // the eastern bore stays continuous with the undisturbed bank.
        ...(ordered[i-1]>=east && ordered[i]<=east+40 ? {cutHeightM:bedDepth+roofTopAboveTread-.05} : {}),
        footprint:[a.l,a.r,b.r,b.l].map(p=>[p[0],p[2]] as const)});
    }
  }
  return slots;
}
