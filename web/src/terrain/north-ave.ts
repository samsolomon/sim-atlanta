/** North Avenue option C. Survey and truth tiers: docs/north-ave-underpass.md. */
import { Builder } from '../vignette/geom';
import type { GroundGrid } from './grid';
import type { OpenSlot } from './openings';
import type { TerrainCity, TransportRun } from './transport-data';
const U = [-.8730086035, .4877048064], V = [-U[1], U[0]];
export const NORTH_AVE = { origin: [-761.16, -1885.765], halfWidth: 11.3,
  groups: [[0,19], [24,86], [100,107], [115,130], [140,153]],
  roadStart: -12, roadEnd: 168, railClearance: 4.5, mariettaClearance: 4.69 } as const;
export function northAveLocal(x: number, z: number) {
  const dx=x-NORTH_AVE.origin[0], dz=z-NORTH_AVE.origin[1];
  return [dx*U[0]+dz*U[1], dx*V[0]+dz*V[1]];
}
export function northAvePoint(s: number, t: number): [number,number] {
  return [NORTH_AVE.origin[0]+s*U[0]+t*V[0], NORTH_AVE.origin[1]+s*U[1]+t*V[1]];
}
export const northAveFloor = (s:number) => 296.6 + Math.max(0,s-20)*.01;
export const northAveRail = (t:number) => 303.8-.007*t;
export function hasNorthAve(city: Pick<TerrainCity,'bounds'>) {
  const b=city.bounds; return b.minX<=-920 && b.maxX>=-740 && b.minZ<=-1950 && b.maxZ>=-1800;
}
export function northAveSlots(city: Pick<TerrainCity,'bounds'>, zero: number): OpenSlot[] {
  if(!hasNorthAve(city)) return [];
  return [[-12,20],[20,168]].map(([a,b])=>{
    const p=northAvePoint(a,0),q=northAvePoint(b,0);
    return {start:[p[0],northAveFloor(a)-zero,p[1]],end:[q[0],northAveFloor(b)-zero,q[1]],halfWidthM:NORTH_AVE.halfWidth};
  });
}
/** Linear grade between DEM anchors outside the trench, evaluated across each track. */
export function northAveRailProfile(run: Pick<TransportRun,'pts'>,grid:GroundGrid) {
  const anchors = [-40,40].map(target=>{
    for(let i=1;i<run.pts.length;i++){
      const a=run.pts[i-1],b=run.pts[i],ta=northAveLocal(...a)[1],tb=northAveLocal(...b)[1];
      if((ta-target)*(tb-target)>0||ta===tb)continue;
      const f=(target-ta)/(tb-ta),x=a[0]+f*(b[0]-a[0]),z=a[1]+f*(b[1]-a[1]);
      return {t:target,h:grid.sample(x,z)!};
    }
    // A turnout beginning inside the profile shares the common formation there.
    return {t:target,h:northAveRail(target)};
  });
  return (x:number,z:number,base:number|null)=>{
    const [s,t]=northAveLocal(x,z);
    if(s<20||s>90||Math.abs(t)>=40)return base;
    return anchors[0].h+(anchors[1].h-anchors[0].h)*(t+40)/80-grid.manifest.vertical.sceneZeroNavd88M;
  };
}
export function northAveRoadHeight(x:number,z:number,run: Pick<TransportRun,'name'>,zero:number) {
  const [s,t]=northAveLocal(x,z);
  if(run.name==='North Avenue Northwest' && s>=-12 && s<=168 && Math.abs(t)<=11.3) return northAveFloor(s)-zero+.04;
  if(run.name==='Marietta Street Northwest' && s>=0 && s<=19 && Math.abs(t)<=11.3) return 302.32-zero+.04;
  return null;
}
/** Appends to the existing structural batch: no new material, texture or draw. */
export function drawNorthAve(city:TerrainCity, grid:GroundGrid, out:Builder) {
  if(!hasNorthAve(city))return;
  const zero=grid.manifest.vertical.sceneZeroNavd88M;
  const p=(s:number,t:number,h:number)=>{const [x,z]=northAvePoint(s,t);return [x,h-zero,z];};
  const quad=(a:number[],b:number[],c:number[],d:number[],color:string)=>out.quad(a,b,c,d,color);
  function slab(a:number,b:number,l:number,r:number,top:(s:number,t:number)=>number,bottom:(s:number,t:number)=>number,color:string){
    const vs=[[a,l],[b,l],[b,r],[a,r]],hi=vs.map(([s,t])=>p(s,t,top(s,t))),lo=vs.map(([s,t])=>p(s,t,bottom(s,t)));
    quad(hi[3],hi[2],hi[1],hi[0],color);quad(lo[0],lo[1],lo[2],lo[3],color);
    for(let i=0;i<4;i++){const j=(i+1)%4;quad(lo[i],lo[j],hi[j],hi[i],color);}
  }
  // Low road and sidewalks continue through every opening; centre strip reserves pier space.
  for(let a=-12;a<168;a+=4){const b=Math.min(168,a+4);
    quad(p(a,11.3,northAveFloor(a)+.04),p(b,11.3,northAveFloor(b)+.04),p(b,-11.3,northAveFloor(b)+.04),p(a,-11.3,northAveFloor(a)+.04),'#525354');
    for(const [l,r] of [[-11.3,-9],[9,11.3],[-.55,.55]]){
      quad(p(a,r,northAveFloor(a)+.18),p(b,r,northAveFloor(b)+.18),p(b,l,northAveFloor(b)+.18),p(a,l,northAveFloor(a)+.18),'#aaa394');
      for(const t of [l,r])quad(p(a,t,northAveFloor(a)+.04),p(b,t,northAveFloor(b)+.04),p(b,t,northAveFloor(b)+.18),p(a,t,northAveFloor(a)+.18),'#aaa394');
    }
    for(const t of [-4.7,4.7])if((a+12)%12<4)slab(a,b,t-.06,t+.06,s=>northAveFloor(s)+.05,s=>northAveFloor(s)+.04,'#d4cba7');
    for(const t of [-11.3,11.3]){
      const [x,z]=northAvePoint((a+b)/2,t),h=grid.sample(x,z);if(h===null)continue;
      const top=Math.max(h,northAveFloor(a)+.2,northAveFloor(b)+.2);
      quad(p(a,t,northAveFloor(a)),p(b,t,northAveFloor(b)),p(b,t,top),p(a,t,top),'#9c978a');
    }
  }
  for(const [i,[a,b]] of NORTH_AVE.groups.entries()){
    const top=(s:number,t:number)=>i===0?302.32:i===1?northAveRail(t):[0,0,304.24,304.03,304.52][i];
    const underside=(s:number)=>northAveFloor(s)+(i===0?4.69:4.5);
    slab(a,b,-11.3,11.3,top,underside,'#a9a396');
    // Two road bays: columns occupy only the reserved median, with wall abutments outside shoulders.
    for(const s of [a+.6,b-.6]) for(const t of [0,-10.85,10.85]) {
      slab(s-.35,s+.35,t-.35,t+.35,underside,q=>northAveFloor(q)+.18,'#918c80');
      slab(s-.55,s+.55,t-.5,t+.5,underside,q=>underside(q)-.55,'#aaa496');
    }
    // Balustrade on Marietta; pipe-like narrow bars on the rail/disused decks.
    for(const s of [a+.18,b-.18]){
      const h=top(s,0),thin=i===0?.16:.06;
      slab(s-thin,s+thin,-11.3,11.3,()=>h+1.05,()=>h+.91,'#a59e90');
      for(let t=-11;t<=11;t+=i===0?.8:2.5)slab(s-thin,s+thin,t-thin,t+thin,()=>h+.95,()=>h,'#a59e90');
    }
  }
}
