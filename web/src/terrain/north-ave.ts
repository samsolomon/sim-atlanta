import type { P2 } from '../vignette/geom';
import type { GroundManifest } from './grid';
import { upperGrade, type Underpass } from './underpass';

const ux=-.8730086035, uz=.4877048064;
const origin: P2=[-761.16,-1885.765];
const bend=(s:number)=>Math.max(0,s-80)*.05+Math.max(0,s-128)*.115;

export const northAvenue: Underpass = {
  roadName:'North Avenue Northwest',
  point(s,t) {
    t+=bend(s);
    return [origin[0]+s*ux-t*uz,origin[1]+s*uz+t*ux];
  },
  local(x,z) {
    const dx=x-origin[0],dz=z-origin[1],s=dx*ux+dz*uz;
    return [s,-dx*uz+dz*ux-bend(s)];
  },
  floor: s=>296.6+Math.max(0,s-20)*.01,
  start:-30,end:183,breaks:[20,80,128],halfWidth:11.3,clearance:4.5,
  spans:[
    {start:0,end:19,type:'street',top:302.32,clearance:4.69,medianPier:true},
    {start:24,end:86,type:'rail-ballast',top:303.53},
    {start:100,end:107,type:'terrain',top:304.24},
    {start:115,end:130,type:'terrain',top:304.03},
    {start:140,end:153,type:'terrain',top:304.52},
  ],
};

/** Restore the surveyed upper formation before either terrain tier triangulates. */
export function northAveGround(manifest:GroundManifest,bytes:ArrayBuffer) {
  const data=new DataView(bytes), {bounds,stepM,cols,scaleM,offsetM}=manifest;
  for(let row=Math.floor((-1970-bounds.minZ)/stepM);row<=Math.ceil((-1740-bounds.minZ)/stepM);row++)
    for(let col=Math.floor((-975-bounds.minX)/stepM);col<=Math.ceil((-695-bounds.minX)/stepM);col++){
      const [s,t]=northAvenue.local(bounds.minX+col*stepM,bounds.minZ+row*stepM);
      const i=2*(row*cols+col),raw=data.getInt16(i,true);
      if(raw===manifest.noData)continue;
      const h=upperGrade(northAvenue,s,t,raw*scaleM+offsetM);
      data.setInt16(i,Math.round((h-offsetM)/scaleM),true);
    }
  return bytes;
}
