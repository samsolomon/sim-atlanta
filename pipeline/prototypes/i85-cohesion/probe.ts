import assert from 'node:assert/strict';
import { board } from './fixture-board';
import { lowerPoint, lowerStrips, east, west } from './lower';
import { brookwoodWall, wallSeam, retainedOuterEdge, rampSpanSides } from './structure';
import { ribbons } from '../../../web/src/terrain/connector-corridor';

for (const tier of ['low','high'] as const) {
  const north=board('pipeline/prototypes/north-row-transport',tier);
  const south=board('pipeline/prototypes/square-board/brookwood-station',tier);
  const boards=(z:number)=>z<=-5700?north:south;
  const ids=[28038801,1416312985,484857197,369529900];
  const sources=ids.map(id=>ribbons.find(r=>r.id===id)!);
  const top=(x:number,z:number)=>{
    let closest=sources[0],best=Infinity;
    for(const r of sources) for(let i=1;i<r.pts.length;i++){
      const a=r.pts[i-1],b=r.pts[i],dx=b[0]-a[0],dz=b[1]-a[1];
      const f=Math.min(1,Math.max(0,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
      const d=Math.hypot(x-a[0]-dx*f,z-a[1]-dz*f);
      if(d<best){best=d;closest=r;}
    }
    return boards(z).road(x,z,{cls:'motorway',bridge:false,tunnel:false,pts:closest.pts,name:'Northeast Expressway'});
  };
  const profile=brookwoodWall(top),positions:number[][]=[];
  let across=0;
  retainedOuterEdge(top,q=>{
    positions.push(...q);
    if(Math.min(...q.map(p=>p[2]))< -5700-1e-7 && Math.max(...q.map(p=>p[2]))> -5700+1e-7)across++;
  });
  assert(positions.length>1000);assert.equal(across,0);
  const zAt=(s:number)=>profile.section(s,'right')!.edge[1];
  for(const gap of profile.interruptions){
    // No wall geometry may enter the open interval, even between samples.
    const zMin=zAt(gap.from);
    const zMax=gap.to===profile.bounds[1]? -5900:zAt(gap.to);
    assert(!positions.some(p=>p[2]<zMin-.02&&p[2]>zMax+.02));
  }
  const cut=profile.section(wallSeam,'right')!;
  assert(Math.abs(cut.edge[1]+5700)<1e-7);
  const levels=[...new Set(positions.filter(p=>Math.abs(p[2]+5700)<1e-6).map(p=>p[1]))];
  assert.equal(levels.length,5);
  const ground=(x:number,z:number)=>boards(z).ground(x,z);
  let lowerTriangles=0, misses=0,maxError=0;
  const floor:number[][][]=[];
  lowerStrips(ground,(v,_color,tread)=>{
    if(!tread)return;
    for(let i=0;i<6;i+=3){
      const [a,b,c]=v.slice(i,i+3);
      assert((b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2])>0);
      floor.push([a,b,c]);lowerTriangles++;
    }
  });
  for(let s=east-15;s<=west+25;s+=.5)for(const u of [-.79,0,.79]){
    const [x,h,z]=lowerPoint(s,u,ground)!;
    let err=Infinity;
    for(const [a,b,c] of floor){
      const det=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
      const k=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/det;
      const j=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/det;
      if(k>=-1e-6 && j>=-1e-6 && k+j<=1+1e-6)err=Math.min(err,Math.abs(h-(k*a[1]+j*b[1]+(1-k-j)*c[1])));
    }
    if(err===Infinity)misses++;else maxError=Math.max(err,maxError);
  }
  assert.equal(misses,0);assert(maxError<.005);
  let faces=0;rampSpanSides(top,()=>faces++);assert.equal(faces,28);
  console.log(JSON.stringify({tier,wallQuads:positions.length/4,across,seam:cut,faces,lowerTriangles,misses,maxWheelResidualM:maxError}));
}
