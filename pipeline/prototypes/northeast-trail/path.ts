// Private physical trail, northbound chainage. Elevations in the register are NAVD88 metres.
import { Builder, Line, type P2 } from '../../../web/src/vignette/geom';
import source from './axis.json';
import type { GroundYield } from '../../../web/src/terrain/surface';

type Vertex = [number, number, number];
type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };
const points = source.ways.flatMap((w, i) => i ? w.axis.slice(1) : w.axis) as P2[];
export const trailAxis = new Line(points);
export const trailBridge = [source.starts[1], source.ends[1]] as const;
export const trailBore = [source.starts[3], source.ends[3]] as const;
export const portalLimits = [trailBore[0]-6, trailBore[1]+6] as const;
export const trailHalfWidth = 2.1336;
const knots = [
  [0,257.49], [36,257.72], [60,257.95], [96,258.41], [130.91112583425772,258.92],
  [152,259.21], [176,259.35], [192,259.35], [216,259.45], [240,259.18],
  [trailBore[0],259.07], [324,258.47], [332,258.30], [348,257.85],
  [368,259.21], [388,259.48], [trailAxis.length,259.77],
];
const register = [...new Set([...trailAxis.cum,...source.starts,...source.ends,...portalLimits,...knots.map(k=>k[0]),
  ...Array.from({length:Math.ceil(trailAxis.length/2)},(_,i)=>i*2)])].sort((a,b)=>a-b)
  .filter((s,i,ss)=>i===0 || s-ss[i-1]>1e-7);

export function trailStations() { return register.slice(); }
export function trailPoint(s: number, offsetRight = 0): Vertex {
  s = Math.max(0,Math.min(trailAxis.length,s));
  const i = knots.findIndex(k=>k[0]>=s);
  const a = knots[Math.max(0,i-1)], b = knots[i];
  const h = a[1]+(b[1]-a[1])*(s-a[0])/(b[0]-a[0] || 1);
  const p = trailAxis.at(s), back = trailAxis.at(s-.05), ahead = trailAxis.at(s+.05);
  const dx = ahead.x-back.x, dz = ahead.z-back.z, length = Math.hypot(dx,dz);
  return [p.x-offsetRight*dz/length,h-323.8,p.z+offsetRight*dx/length];
}

// Clip the complete footprint, including edge furniture, to each owner's board.
function clip(poly: Vertex[], axis: 0|2, bound: number, sign: number) {
  const out: Vertex[] = [];
  for(let i=0;i<poly.length;i++) {
    const a=poly[(i+poly.length-1)%poly.length], b=poly[i];
    const da=sign*(a[axis]-bound), db=sign*(b[axis]-bound);
    if((da<0)!==(db<0)) {
      const t=da/(da-db);
      out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),a[2]+t*(b[2]-a[2])]);
    }
    if(db>=0)out.push(b);
  }
  return out;
}

export function drawTrail(builder: Builder, bounds: Bounds) {
  function face(v: Vertex[], color: string) {
    for(const [axis,bound,sign] of [[0,bounds.minX,1],[0,bounds.maxX,-1],[2,bounds.minZ,1],[2,bounds.maxZ,-1]] as const)
      v=clip(v,axis,bound,sign);
    for(let i=1;i+1<v.length;i++)builder.tri(v[0],v[i],v[i+1],color);
  }
  const at=(s:number,t:number,height=0):Vertex=>{
    const p=trailPoint(s,t);p[1]+=height;return p;
  };
  const width=trailHalfWidth;
  for(let i=1;i<register.length;i++){
    const a=register[i-1], b=register[i];
    face([at(a,-width),at(a,width),at(b,width),at(b,-width)],'#b4afa4');
    if((a+b)/2<trailBridge[0] || (a+b)/2>trailBridge[1])continue;
    face([at(b,-width,-.38),at(b,width,-.38),at(a,width,-.38),at(a,-width,-.38)],'#78766e');
    for(const side of [-width,width]){
      face([at(a,side,-.38),at(b,side,-.38),at(b,side),at(a,side)],'#8c8981');
      // The opening-week photograph shows tall, see-through mesh panels.
      for(const h of [.08,1.27,2.48])
        face([at(a,side,h),at(b,side,h),at(b,side,h+.045),at(a,side,h+.045)],'#536064');
      for(let h=.2;h<2.48;h+=.18)
        face([at(a,side,h),at(b,side,h),at(b,side,h+.012),at(a,side,h+.012)],'#747c7c');
    }
  }
  for(let s=trailBridge[0]+.18;s<trailBridge[1];s+=.18)
    for(const side of [-width,width])
      face([at(s,side,.08),at(s+.012,side,.08),at(s+.012,side,2.48),at(s,side,2.48)],'#747c7c');
  for(let i=0;i<=20;i++){
    const s=trailBridge[0]+i*(trailBridge[1]-trailBridge[0])/20;
    for(const side of [-width,width])
      face([at(s-.045,side),at(s+.045,side),at(s+.045,side,2.525),at(s-.045,side,2.525)],'#51554f');
  }
}

// Solve the ground against the exact two triangles emitted for each exposed
// section. The 15 mm bedding allowance keeps coplanar terrain out of the tread.
export function trailYields(): GroundYield[] {
  const result: GroundYield[] = [];
  for(let i=1;i<register.length;i++) {
    const s=register[i-1], t=register[i], mid=(s+t)/2;
    if((mid>=trailBridge[0] && mid<=trailBridge[1]) ||
       (mid>=portalLimits[0] && mid<=portalLimits[1]))continue;
    const a=trailPoint(s,-trailHalfWidth), b=trailPoint(s,trailHalfWidth);
    const c=trailPoint(t,trailHalfWidth), d=trailPoint(t,-trailHalfWidth);
    for(const [p,q,r] of [[a,b,c],[a,c,d]]) {
      const x1=q[0]-p[0], z1=q[2]-p[2], x2=r[0]-p[0], z2=r[2]-p[2];
      const det=x1*z2-x2*z1;
      if(Math.abs(det)<1e-9)continue;
      const dy1=q[1]-p[1],dy2=r[1]-p[1];
      result.push({ring:[p,q,r].map(v=>[v[0],v[2]] as P2),conformEdges:true,
        floor:(x,z)=>p[1]+((dy1*z2-dy2*z1)*(x-p[0])+(dy2*x1-dy1*x2)*(z-p[2]))/det-.015});
    }
  }
  return result;
}
