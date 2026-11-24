import { Builder, pointInRing, segDist, type P2 } from '../vignette/geom';
import type { GroundYield } from '../terrain/surface';
import type { TerrainCity } from '../terrain/transport-data';

/** A small filled shelf at the sidewalk, not a new parcel or a whole-yard earthwork. */
export function yardTerrace(b: Builder, o: {
  at(s:number,d:number):P2; ground(x:number,z:number):number|null;
  clear(a:P2,c:P2,width:number):boolean; street(x:number,z:number):number;
  sharedApproach?(ring:P2[]):boolean; walkStart?:number; width:number; door:number; walkEnd:number; newer:boolean; piers:boolean;
  bounds:TerrainCity['bounds']; trees:readonly (readonly number[])[];
}) {
  const half=Math.min(o.width*.45,6),gap=.85,front=o.walkEnd-.2,back=front-2.2;
  if(o.walkEnd<6 || Math.abs(o.door)+gap+.8>half)return null;
  if(o.walkStart !== undefined && (back - o.walkStart < .5 ||
    !o.clear(o.at(o.door,o.walkStart),o.at(o.door,back),1.2)))return null;
  const entry=o.at(o.door,o.walkEnd),house=o.at(o.door,0);
  const low=o.ground(...entry),houseY=o.ground(...house);
  const ys=[o.at(-half,back),o.at(half,back)].map(p=>o.ground(...p));
  if(low===null || houseY===null || ys.some(y=>y===null) || houseY-low<=.8)return null;
  const landing=o.ground(...o.at(o.door,back));
  if(landing===null)return null;
  // The walk joins the centre of the stairs, not the higher shelf corner on a sideways slope.
  const top=Math.max(...ys as number[]),stairTop=landing+.04,rise=stairTop-low;
  if(rise<.25 || rise>.85)return null;
  const steps=Math.ceil(rise/.17),riser=rise/steps;
  const runs:[number,number][]=[[-half,o.door-gap],[o.door+gap,half]];
  const ring=(a:number,c:number,from=front,to=back):P2[]=>[o.at(a,from),o.at(c,from),o.at(c,to),o.at(a,to)];
  const shelves=runs.map(([a,c])=>ring(a,c));
  const stairs=ring(o.door-.6,o.door+.6,o.walkEnd,back);
  const polygons=[...shelves,stairs];
  // Protect mapped trees, other buildings, curved carriageways and board seams.
  for(const polygon of polygons) {
    if(polygon.some(([x,z])=>x<o.bounds.minX+10 || x>o.bounds.maxX-10 || z<o.bounds.minZ+10 || z>o.bounds.maxZ-10 || o.ground(x,z)===null))return null;
    if(o.trees.some(([x,z])=>pointInRing(x,z,polygon)||polygon.some((a,i)=>segDist(x,z,a,polygon[(i+1)%4])<.65)))return null;
    for(let i=0;i<4;i++) {
      const a=polygon[i],c=polygon[(i+1)%4];
      if(!o.clear(a,c,.35))return null;
      const n=Math.ceil(Math.hypot(c[0]-a[0],c[1]-a[1]));
      for(let k=0;k<=n;k++)if(o.street(a[0]+(c[0]-a[0])*k/n,a[1]+(c[1]-a[1])*k/n)<1.5)return null;
    }
  }
  if (o.walkStart !== undefined && o.sharedApproach?.(ring(o.door-.6,o.door+.6,o.walkEnd,o.walkStart))) return null;
  const stone=o.newer?'#c5bcaa':'#999b91',cap=o.newer?'#d3cbbb':'#b7b9ab';
  const start=b.pos.length;
  const at=(s:number,d:number,y:number)=>{const p=o.at(s,d);return[p[0],y,p[1]];};
  const prism=(a:number,c:number,from:number,to:number,y0:number,y1:number,color:string)=>{
    const p=[at(a,from,y1),at(c,from,y1),at(c,to,y1),at(a,to,y1)];
    b.quad(...p as [number[],number[],number[],number[]],color);
    for(let i=0;i<4;i++){const j=(i+1)%4;b.quad([p[i][0],y0,p[i][2]],[p[j][0],y0,p[j][2]],p[j],p[i],color);}
  };
  for(const [a,c] of runs) {
    const p=ring(a,c);
    b.quad(...p.map(([x,z])=>[x,top,z]) as [number[],number[],number[],number[]],'#8da16f');
    for(let i=0;i<4;i++) {
      const q=p[i],r=p[(i+1)%4];
      b.quad([q[0],o.ground(...q)!-.2,q[1]],[r[0],o.ground(...r)!-.2,r[1]],[r[0],top,r[1]],[q[0],top,q[1]],stone);
    }
    prism(a+.15,c-.15,front-.12,front-.62,top,top+.5,'#587444');
  }
  // Open treads/risers, with two solid side cheeks. No hidden box per tread.
  const depth=o.walkEnd-back;
  for(let k=0;k<steps;k++) {
    const d0=o.walkEnd-depth*k/steps,d1=o.walkEnd-depth*(k+1)/steps,y=low+riser*(k+1);
    b.quad(at(o.door-.6,d0,y),at(o.door+.6,d0,y),at(o.door+.6,d1,y),at(o.door-.6,d1,y),cap);
    b.quad(at(o.door-.6,d0,y-riser),at(o.door+.6,d0,y-riser),at(o.door+.6,d0,y),at(o.door-.6,d0,y),stone);
  }
  for(const s of [o.door-.6,o.door+.6])b.quad(at(s,o.walkEnd,low-.2),at(s,back,low-.2),at(s,back,stairTop),at(s,o.walkEnd,low+riser),stone);
  // Keep the occasional entry piers within the 80-triangle per-yard budget.
  if(o.newer && o.piers && steps<=4)for(const s of [o.door-1.1,o.door+1.1])prism(s-.22,s+.22,front,front-.44,top,top+.8,cap);
  const a=o.at(o.door,o.walkEnd),c=o.at(o.door,back),dx=c[0]-a[0],dz=c[1]-a[1],len2=dx*dx+dz*dz;
  const yields:GroundYield[]=[...shelves.map(ring=>({ring,floor:()=>top-.04})),
    {ring:stairs,floor:(x,z)=>low+rise*((x-a[0])*dx+(z-a[1])*dz)/len2-riser-.05}];
  return {yields,stairTop,walkStop:back,at:entry,triangles:(b.pos.length-start)/9};
}
