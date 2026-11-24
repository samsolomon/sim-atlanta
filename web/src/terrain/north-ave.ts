/** North Avenue crossing. Survey and truth tiers: docs/north-ave-underpass.md. */
import { Builder } from '../vignette/geom';
import type { GroundGrid } from './grid';
import type { OpenSlot } from './openings';
import type { TerrainCity, TransportRun } from './transport-data';
const U = [-.8730086035, .4877048064], V = [-U[1], U[0]];
export const NORTH_AVE = { origin: [-761.16, -1885.765], halfWidth: 11.3,
  groups: [[0,19], [24,86], [100,107], [115,130], [140,153]],
  roadStart: -12, roadEnd: 168, railClearance: 4.5, mariettaClearance: 4.69 } as const;
// The mapped divided road bends north of the straight lidar transect at its west end.
const centerOffset = (s: number) => Math.max(0, s - 80) * .05 + Math.max(0, s - 128) * .115;
export function northAveLocal(x: number, z: number) {
  const dx=x-NORTH_AVE.origin[0], dz=z-NORTH_AVE.origin[1];
  const s = dx*U[0]+dz*U[1];
  return [s, dx*V[0]+dz*V[1]-centerOffset(s)];
}
export function northAvePoint(s: number, t: number): [number,number] {
  t += centerOffset(s);
  return [NORTH_AVE.origin[0]+s*U[0]+t*V[0], NORTH_AVE.origin[1]+s*U[1]+t*V[1]];
}
export const northAveFloor = (s:number) => 296.6 + Math.max(0,s-20)*.01;
/** Thin grass lip above the retained soffit, with the crossfall of the intact banks. */
export function stripTop(grid:GroundGrid,a:number,b:number,s:number,t:number){
  const lip=northAveFloor(s)+4.735;
  const bank=(side:number)=>grid.sample(...northAvePoint(s,side))??lip;
  const f=(t+11.3)/22.6;
  const crown=Math.max(lip+.065,bank(-23)*(1-f)+bank(23)*f);
  return lip+(crown-lip)*Math.min(1,Math.max(0,Math.min(s-a,b-s)/1.4));
}
export const northAveRail = (t:number) => 303.8-.007*t;
export function hasNorthAve(city: Pick<TerrainCity,'bounds'>) {
  const b=city.bounds; return b.minX<=-920 && b.maxX>=-740 && b.minZ<=-1950 && b.maxZ>=-1800;
}
export function northAveSlots(city: Pick<TerrainCity,'bounds'>, zero: number): OpenSlot[] {
  if(!hasNorthAve(city)) return [];
  return [[-12,20],[20,80],[80,128],[128,168]].map(([a,b])=>{
    const p=northAvePoint(a,0),q=northAvePoint(b,0);
    return {start:[p[0],northAveFloor(a)-zero,p[1]],end:[q[0],northAveFloor(b)-zero,q[1]],crossAxis: V as [number,number],halfWidthM:NORTH_AVE.halfWidth};
  });
}
/** Linear grade between DEM anchors outside the trench, evaluated across each track. */
export function northAveRailProfile(run: Pick<TransportRun,'pts'>,grid:GroundGrid) {
  const anchors = [-40,40].map(target=>{
    for(let i=1;i<run.pts.length;i++){
      const a=run.pts[i-1],b=run.pts[i],ta=northAveLocal(...a)[1],tb=northAveLocal(...b)[1];
      if((ta-target)*(tb-target)>0||ta===tb)continue;
      const f=(target-ta)/(tb-ta),x=a[0]+f*(b[0]-a[0]),z=a[1]+f*(b[1]-a[1]);
      const along = northAveLocal(x, z)[0];
      if (along < 0 || along > 110) continue;
      const h = grid.sample(x, z);
      if (h !== null) return {t:target,h};
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
  if(run.name==='Marietta Street Northwest' && s>=0 && s<=19 && Math.abs(t)<=11.3) return 302.32-zero;
  return null;
}
/** One structural batch for the five covers, their supports and the divided road. */
export function drawNorthAve(city:TerrainCity, grid:GroundGrid, out:Builder) {
  if(!hasNorthAve(city))return;
  const zero=grid.manifest.vertical.sceneZeroNavd88M;
  const p=(s:number,t:number,h:number)=>{const [x,z]=northAvePoint(s,t);return [x,h-zero,z];};
  const quad=(a:number[],b:number[],c:number[],d:number[],color:string)=>out.quad(a,b,c,d,color);
  function slab(a:number,b:number,l:number,r:number,top:(s:number,t:number)=>number,bottom:(s:number,t:number)=>number,color:string,soffit=color){
    const vs=[[a,l],[b,l],[b,r],[a,r]],hi=vs.map(([s,t])=>p(s,t,top(s,t))),lo=vs.map(([s,t])=>p(s,t,bottom(s,t)));
    quad(hi[3],hi[2],hi[1],hi[0],color);quad(lo[0],lo[1],lo[2],lo[3],soffit);
    for(let i=0;i<4;i++){const j=(i+1)%4;quad(lo[i],lo[j],hi[j],hi[i],color);}
  }
  // Low road and sidewalks continue through every opening; centre strip reserves pier space.
  // Split the pavement only where its grade or mapped direction changes.
  for(const [a,b] of [[-12,20],[20,80],[80,128],[128,168]]) {
    quad(p(a,11.3,northAveFloor(a)+.04),p(b,11.3,northAveFloor(b)+.04),p(b,-11.3,northAveFloor(b)+.04),p(a,-11.3,northAveFloor(a)+.04),'#525354');
    for(const [l,r] of [[-11.3,-9],[9,11.3],[-.55,.55]]){
      quad(p(a,r,northAveFloor(a)+.18),p(b,r,northAveFloor(b)+.18),p(b,l,northAveFloor(b)+.18),p(a,l,northAveFloor(a)+.18),'#aaa394');
      for(const t of [l,r])quad(p(a,t,northAveFloor(a)+.04),p(b,t,northAveFloor(b)+.04),p(b,t,northAveFloor(b)+.18),p(a,t,northAveFloor(a)+.18),'#aaa394');
    }
  }
  for(let a=-12;a<168;a+=4){const b=Math.min(168,a+4);
    for(const t of [-4.7,4.7])if((a+12)%12<4)
      quad(p(a,t+.06,northAveFloor(a)+.05),p(b,t+.06,northAveFloor(b)+.05),
        p(b,t-.06,northAveFloor(b)+.05),p(a,t-.06,northAveFloor(a)+.05),'#d4cba7');
    for(const t of [-11.3,11.3]){
      const [x,z]=northAvePoint((a+b)/2,t),h=grid.sample(x,z);if(h===null)continue;
      // Raw DEM at the bank includes the deviating track grade. Terminate the
      // retaining wall inside the rail cover so its crest cannot pierce a tread.
      const inRailCover = a >= 24 && b <= 86;
      const top = inRailCover ? Math.min(h,northAveRail(t)-.7)
        : Math.max(h,northAveFloor(a)+.2,northAveFloor(b)+.2);
      quad(p(a,t,northAveFloor(a)),p(b,t,northAveFloor(b)),p(b,t,top),p(a,t,top),'#c7c2b5');
    }
  }
  for(const [i,[a,b]] of NORTH_AVE.groups.entries()){
    const top=(s:number,t:number)=>i===0?302.32:northAveFloor(s)+4.72;
    const underside=(s:number)=>northAveFloor(s)+.04+(i===0?4.69:4.5);
    slab(a,b,-11.3,11.3,(s,t)=>top(s,t)-(i===0?.025:0),underside,i===0?'#b9b4a4':'#b5bd97','#d5d1c3');
    if(i>1){
      // The inactive strips carry soil. Take their crossfall from intact ground
      // on both banks, leaving a narrow grass lip above the preserved soffit.
      let prev:number[][]=[];
      for(const t of [-11.3,0,11.3]){
        const row=[a,a+1.4,b-1.4,b].map(s=>p(s,t,stripTop(grid,a,b,s,t)));
        for(let j=1;j<row.length && prev.length;j++)quad(prev[j-1],row[j-1],row[j],prev[j],'#b5bd97');
        prev=row;
      }
    }
    if(i===1){
      // Take a cross-section through the actual mapped tracks at each bank. Carry
      // the bed between tracks at their formation heights, below the textured treads.
      const tracks=(city.terrainTransport?.rail ?? []).map(run=>({
        points:run.pts.map(([x,z])=>northAveLocal(x,z)), grade:northAveRailProfile(run,grid),
      }));
      const section=(t:number)=>{
        const centers:{s:number;h:number}[]=[];
        for(const track of tracks){
          for(let j=1;j<track.points.length;j++){
            const [s0,t0]=track.points[j-1],[s1,t1]=track.points[j];
            if(t0===t1 || (t-t0)*(t-t1)>0)continue;
            const s=s0+(s1-s0)*(t-t0)/(t1-t0);
            if(s<a || s>b)continue;
            const [x,z]=northAvePoint(s,t);
            const h=track.grade(x,z,null);
            if(h!==null)centers.push({s,h:h+zero});
          }
        }
        centers.sort((u,v)=>u.s-v.s);
        if(!centers.length)return [];
        const left=centers[0],right=centers[centers.length-1];
        // Only the running corridor has an exposed gravel shoulder. The wider
        // surveyed cover continues below the earth beside it.
        return [[a,top(a,t)+.02],[left.s-3.35,left.h-.12],[left.s-2.25,left.h+.005],
          ...Array.from({length:9},(_,j)=>{
            const s=left.s+(right.s-left.s)*j/8;
            const upper=centers.find(c=>c.s>=s)??right,lower=centers.slice().reverse().find(c=>c.s<=s)??left;
            const f=upper.s===lower.s?0:(s-lower.s)/(upper.s-lower.s);
            return [s,lower.h+(upper.h-lower.h)*f+.005];
          }),[right.s+2.25,right.h+.005],[right.s+3.35,right.h-.12],[b,top(b,t)+.02]];
      };
      let previous:number[][]=[];
      let previousT = -11.3;
      for(const t of [-11.3,-6,0,6,11.3,13.5]){
        const row=section(t);
        const outside = Math.max(0,Math.abs(t)-11.3);
        if(outside){
          // A short sloped toe closes the abutment edge below the continuing
          // tracks while the bank still lies below the formation.
          for(const vertex of row) vertex[1] -= outside * .08;
        }
        for(let j=1;j<row.length && previous.length;j++){
          // Extend only the ballast shoulder onto the bank. Its taper bridges the
          // DEM dip without extending the deck or its earth margins into the yard.
          if ((outside || Math.abs(previousT)>11.3) && (j===1 || j===row.length-1)) continue;
          const color=j===1||j===row.length-1?'#b5bd97':j===2||j===row.length-2?'#877d6a':'#7e7363';
          quad(previous[j-1],p(row[j-1][0],t,row[j-1][1]),
            p(row[j][0],t,row[j][1]),previous[j],color);
        }
        previousT=t;
        previous=row.map(([s,h])=>p(s,t,h));
      }
    }
    // Two road bays: columns occupy only the reserved median, with wall abutments outside shoulders.
    for(const s of [a+.6,b-.6]) for(const t of [0,-10.7,10.7]) {
      slab(s-.35,s+.35,t-.35,t+.35,underside,q=>northAveFloor(q)+.18,'#aca798');
      slab(s-.55,s+.55,t-.5,t+.5,underside,q=>underside(q)-.55,'#aaa496');
    }
    // Balustrade on Marietta; pipe-like narrow bars on the rail/disused decks.
    for(const s of [a+.18,b-.18]){
      const thin=i===0?.07:.035, height=i===0?.64:i===1?.45:.12;
      const h=(q:number,t:number)=>top(q,t)+height;
      slab(s-thin,s+thin,-11.3,11.3,h,(q,t)=>h(q,t)-.065,'#a4a393');
      if(i<2)for(let t=-10;t<=10;t+=3.3)slab(s-thin,s+thin,t-thin,t+thin,h,top,'#a4a393');
    }
  }
}
