// The modeled mainline continues beyond this branch. The walk to Mayson turns
// onto the existing three-node access way at its shared (interior) source node.
import { Builder, Line, type P2 } from '../../../web/src/vignette/geom';
import { alongOn } from '../../../web/src/terrain/connector-corridor';
import { trailAxis, trailHalfWidth, trailPoint, trailStations } from './path';
import access from './access.json';
import mayson from '../../../web/src/city/fixtures/mayson-study.json';

const fork = trailAxis.pts.findIndex(p=>p[0]===access.axis[0][0] && p[1]===access.axis[0][1]);
if(fork<0)throw new Error('Missing Mayson access node in the directed trail');
export const accessStation=trailAxis.cum[fork];
export const trailDriveAxis=new Line([...trailAxis.pts.slice(0,fork+1), ...access.axis.slice(1) as P2[]]);

type Vertex = [number,number,number];
type Ground = (x:number,z:number)=>number|null;
const accessAxis=new Line(access.axis as P2[]);
const cross=(x:number,z:number,dx:number,dz:number)=>x*dz-z*dx;

function triangleHeight(x:number,z:number,[a,b,c]:number[][]) {
  const bx=b[0]-a[0],bz=b[2]-a[2],cx=c[0]-a[0],cz=c[2]-a[2];
  const det=cross(bx,bz,cx,cz);
  if(Math.abs(det)<1e-10)return null;
  const u=cross(x-a[0],z-a[2],cx,cz)/det,v=cross(bx,bz,x-a[0],z-a[2])/det;
  if(u< -1e-7 || v< -1e-7 || u+v>1+1e-7)return null;
  return a[1]+u*(b[1]-a[1])+v*(c[1]-a[1]);
}

// mountMayson uses an identity transform and Float32BufferAttribute. Only the
// receiving road is eligible here; an overlapping rail/guideway cannot win.
const street = mayson.surfaces.find(s=>s.way===9270932)!.tiles.flat(1)
  .map(tri=>tri.map(vertex=>vertex.slice(0,3).map(Math.fround)));
export function receivingHeight(x:number,z:number,ground:Ground) {
  let top=ground(x,z);
  for(const tri of street) {
    const y=triangleHeight(x,z,tri);
    if(y!==null && (top===null || y>top))top=y;
  }
  return top;
}

// Intersect each edge of the spur with the actual edge polyline drawn for the
// main trail. Both strips use the exact same vertices at that joint.
function edgeHit(offset:number): Vertex {
  const p=accessAxis.at(0), x=p.x-offset*p.nx, z=p.z-offset*p.nz;
  const stations=trailStations().filter(s=>Math.abs(s-accessStation)<10);
  for(const side of [-trailHalfWidth,trailHalfWidth]){
    for(let i=1;i<stations.length;i++){
      const a=trailPoint(stations[i-1],side), b=trailPoint(stations[i],side);
      const dx=b[0]-a[0], dz=b[2]-a[2],det=cross(p.dx,p.dz,dx,dz);
      if(Math.abs(det)<1e-8)continue;
      const t=cross(a[0]-x,a[2]-z,dx,dz)/det;
      const u=cross(a[0]-x,a[2]-z,p.dx,p.dz)/det;
      if(t<0||t>4||u<0||u>1)continue;
      return [a[0]+u*dx,a[1]+u*(b[1]-a[1]),a[2]+u*dz];
    }
  }
  throw new Error('No forward intersection with the paved trail edge');
}

// Only this short apron is added. The final 0.5 m uses the existing Mayson
// surface; its receiving elevation is sampled separately at each cross section.
const lanes=[-1,0,1];
const from=lanes.map(edgeHit);
const cache=new WeakMap<Ground,Vertex[][]>();
function faces(ground:Ground) {
  const found=cache.get(ground);
  if(found)return found;
  const end=accessAxis.at(accessAxis.length-.5);
  const to:Vertex[]=lanes.map(offset=>{
    const x=end.x-offset*end.nx,z=end.z-offset*end.nz,y=receivingHeight(x,z,ground);
    if(y===null)throw new Error('Missing receiving street');
    return [x,y,z];
  });
  const tris:Vertex[][]=[];
  for(let i=1;i<lanes.length;i++)
    tris.push([from[i-1],from[i],to[i]],[from[i-1],to[i],to[i-1]]);
  cache.set(ground,tris);
  return tris;
}
export function drawAccessApron(builder:Builder,ground:Ground) {
  for(const [a,b,c] of faces(ground))builder.tri(a,b,c,'#b4afa4');
}
export function trailDrivePoint(s:number, ground:Ground):Vertex {
  if(s<=accessStation)return trailPoint(s);
  const p=trailDriveAxis.at(s);
  const receiving=receivingHeight(p.x,p.z,ground);
  for(const tri of faces(ground)){
    const h=triangleHeight(p.x,p.z,tri);
    if(h!==null)return [p.x,Math.max(h,receiving??h),p.z];
  }
  const near=alongOn({line:trailAxis,pts:trailAxis.pts},[p.x,p.z]);
  const h=near.distance<=trailHalfWidth ? trailPoint(near.s)[1] : receiving;
  if(h===null)throw new Error('Missing mounted Mayson access surface');
  return [p.x,h,p.z];
}
