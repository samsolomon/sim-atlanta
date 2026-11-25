// Private R16 southbound I-85 trial. Heights in scene metres, station follows OSM 38983384.
import sections from './sb-sections.json';
import { splitConvex } from '../../../web/src/terrain/openings';
type Point = [number, number, number, number]; // x, z, design Y, blend weight
type Bounds = {minX:number; maxX:number; minZ:number; maxZ:number};
type Face = {points:[Point,Point,Point]; bounds:Bounds; det:number; planes:((x:number,y:number,z:number)=>number)[]};
type Mesh = {pos:number[]; uv:number[]; indices:number[]; starts?:Uint32Array};

const bins=new Map<string,Face[]>();
const cross=(a:Point,b:Point,x:number,z:number)=>(b[0]-a[0])*(z-a[1])-(b[1]-a[1])*(x-a[0]);
function rowPoints([s,x,z,rx,rz,y,grade]:number[]):Point[] {
  const along=Math.max(0,Math.min(1,(s-40)/10,(535-s)/20));
  // The five-lane travel band remains planar. Across the outside shoulder the
  // upper bench meets 2018 lower returns near +12..+15 m. The face is inferred.
  return [[-14,0],[-11.075,1],[8.875,1],[10.6,1],[14,0]].map(([u,w])=>
    [x+rx*u,z+rz*u,y+grade*u,along*w]);
}
function binRange(b:Bounds,visit:(key:string)=>void){
  for(let i=Math.floor(b.minX/25);i<=Math.floor(b.maxX/25);i++)
    for(let j=Math.floor(b.minZ/25);j<=Math.floor(b.maxZ/25);j++)visit(i+','+j);
}
function register(points:[Point,Point,Point]){
  const [a,b,c]=points, det=cross(a,b,c[0],c[1]);
  const bounds={minX:Math.min(a[0],b[0],c[0]),maxX:Math.max(a[0],b[0],c[0]),minZ:Math.min(a[1],b[1],c[1]),maxZ:Math.max(a[1],b[1],c[1])};
  const face={points,det,bounds,planes:points.map((p,i)=>(x:number,_y:number,z:number)=>Math.sign(det)*cross(p,points[(i+1)%3],x,z))};
  binRange(bounds,key=>{const bin=bins.get(key);if(bin)bin.push(face);else bins.set(key,[face]);});
}
const rows=sections.filter(r=>r[0]>=40 && r[0]<=535).map(rowPoints);
for(let j=1;j<rows.length;j++)for(let i=1;i<rows[j].length;i++){
  const a=rows[j-1][i-1],b=rows[j][i-1],c=rows[j][i],d=rows[j-1][i];
  register([a,b,c]);register([a,c,d]);
}
function blended(f:Face,x:number,z:number,y:number){
  const [a,b,c]=f.points, wa=cross(b,c,x,z)/f.det,wb=cross(c,a,x,z)/f.det,wc=1-wa-wb;
  const weight=Math.max(0,Math.min(1,wa*a[3]+wb*b[3]+wc*c[3]));
  return y+weight*(wa*a[2]+wb*b[2]+wc*c[2]-y);
}
/** Source target for trial comparisons. Use the mounted board triangle query for vehicle contact. */
export function sbTrialHeight(x:number,z:number,ground:number){
  const near=bins.get(Math.floor(x/25)+','+Math.floor(z/25));
  const f=near?.find(cell=>cell.planes.every(test=>test(x,0,z)>=-1e-7));
  return f?blended(f,x,z,ground):ground;
}
/** Replace only existing board faces, after slots and rail/trail cuts; retain UVs and block ownership. */
export function gradeSouthboundBoard<T extends Mesh>(mesh:T,bounds:Bounds):T{
  if(bounds.minX!==-1000 || bounds.minZ!==-6500 || bounds.maxZ!==-5700 || bounds.maxX!==1800)return mesh;
  const {pos,uv,indices}=mesh, next:number[]=[], cache=new Map<string,number>();
  const add=(x:number,y:number,z:number)=>{
    const key=[x,y,z].map(n=>Math.round(n*1e7)).join(',');
    const previous=cache.get(key);if(previous!==undefined)return previous;
    const i=pos.length/3;pos.push(x,y,z);uv.push((x-bounds.minX)/(bounds.maxX-bounds.minX),(bounds.maxZ-z)/(bounds.maxZ-bounds.minZ));cache.set(key,i);return i;
  };
  function planArea(a:number,b:number,c:number){
    return (pos[3*b]-pos[3*a])*(pos[3*c+2]-pos[3*a+2])-(pos[3*b+2]-pos[3*a+2])*(pos[3*c]-pos[3*a]);
  }
  function emit(poly:number[]){
    for(let i=2;i<poly.length;i++){
      if(Math.abs(planArea(poly[0],poly[i-1],poly[i]))>1e-10)next.push(poly[0],poly[i-1],poly[i]);
    }
  }
  // starts[] indexes the same original per-block face ranges as GroundSurface.sampleScene.
  const starts=mesh.starts,oldStarts=starts?.slice(),blocks=oldStarts?oldStarts.length-1:1;
  for(let block=0;block<blocks;block++){
    if(starts)starts[block]=next.length;
    const end=oldStarts?oldStarts[block+1]:indices.length;
    for(let j=oldStarts?oldStarts[block]:0;j<end;j+=3){
      const abc=indices.slice(j,j+3);
      const xs=abc.map(i=>pos[3*i]),zs=abc.map(i=>pos[3*i+2]);
      const box={minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)};
      if(Math.abs(planArea(abc[0],abc[1],abc[2]))<1e-10||box.maxX<1080||box.minX>1540||box.minZ> -5870||box.maxZ< -6300){next.push(...abc);continue;}
      const nearby=new Set<Face>();binRange(box,k=>{for(const f of bins.get(k)??[])nearby.add(f);});
      let pieces=[abc];
      for(const f of nearby){
        const b=f.bounds;if(box.maxX<b.minX||box.minX>b.maxX||box.maxZ<b.minZ||box.minZ>b.maxZ)continue;
        const remain:number[][]=[];
        for(const p of pieces){
          const {inside,outside}=splitConvex(p,f.planes,pos,add);remain.push(...outside);
          if(inside)emit(inside.map(i=>{const x=pos[3*i],y=pos[3*i+1],z=pos[3*i+2];return add(x,blended(f,x,z,y),z);}));
        }
        pieces=remain;if(!pieces.length)break;
      }
      for(const p of pieces)emit(p);
    }
  }
  if(starts)starts[blocks]=next.length;
  mesh.indices=next;return mesh;
}
