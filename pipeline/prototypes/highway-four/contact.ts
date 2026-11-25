import type { BufferGeometry } from 'three';
import type { P2 } from '../../../web/src/vignette/geom';
import { ribbons } from '../../../web/src/terrain/connector-corridor';

const deering = new Set([358758245,29013401,9238120]);
const east = new Set([38982156,38983378,369529892,369529886,38983384,38981774,187141934,1020867018]);
const owners = new Map(ribbons.map(r=>[r.pts,r.id]));
export function onStudyTread(axis: P2[], x: number, z: number) {
  const id=owners.get(axis);
  return id!==undefined && (deering.has(id) && Math.hypot(x+397,z+4917)<190 ||
    east.has(id) && z < -5900 && x>1100);
}

interface Shoe { z:number; halfTrack:number; bottom:number }
export function outerAxles(geometry:BufferGeometry): Shoe[] {
  const pos=geometry.getAttribute('position');
  const stations=new Map<number,{sum:number;n:number;bottom:number}>();
  for(let i=0;i<pos.count;i++) {
    const x=pos.getX(i), y=pos.getY(i), z=pos.getZ(i);
    if(x<.4 || y<-.001 || y>.035)continue;
    const key=Math.round(z*10000)/10000;
    const group=stations.get(key)??{sum:0,n:0,bottom:y};
    group.sum+=x;group.n++;stations.set(key,group);
  }
  const sorted=[...stations.keys()].sort((a,b)=>a-b);
  if(sorted.length<2)return [];
  // A ten-facet tyre rests on two vertices fore/aft of its axle center.
  return [sorted[0],sorted.at(-1)!].map(end=>{
    const hits=sorted.filter(z=>Math.abs(z-end)<.5);
    let halfTrack=0, bottom=0, zMean=0;
    for(const z of hits) {
      const row=stations.get(z)!;
      halfTrack+=row.sum/row.n;bottom+=row.bottom;zMean+=z;
    }
    return {halfTrack:halfTrack/hits.length,bottom:bottom/hits.length,z:zMean/hits.length};
  });
}

type Height=(s:number,x:number,z:number)=>number|null;
export function wheelPlane(shoes:Shoe[], height:Height, s:number, x:number, z:number, dx:number, dz:number) {
  if(shoes.length!==2)return;
  const samples=[];
  for(const a of shoes){
    const cx=x+dx*a.z, cz=z+dz*a.z;
    const l=height(s+a.z,cx-dz*a.halfTrack,cz+dx*a.halfTrack);
    const r=height(s+a.z,cx+dz*a.halfTrack,cz-dx*a.halfTrack);
    if(l===null || r===null)return;
    samples.push({y:(l+r)/2-a.bottom,roll:(r-l)/(2*a.halfTrack)});
  }
  const grade=(samples[1].y-samples[0].y)/(shoes[1].z-shoes[0].z);
  const roll=(samples[1].roll+samples[0].roll)/2;
  return {grade,roll,y:samples[0].y-grade*shoes[0].z};
}
