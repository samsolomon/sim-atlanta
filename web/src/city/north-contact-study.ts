import * as THREE from 'three';
import fixture from './fixtures/mayson-study.json';
import { roadSedanGeometry } from '../vignette/road-sedan';

const ray = new THREE.Raycaster();
// Independent witness: retain the original uploaded triangle vertices and raycast them.
// Index 16 m strips by Z so hundreds of tread rays do not traverse the full board.
const rayStrips = new WeakMap<THREE.Mesh,Map<number,THREE.Mesh>>();
function strips(mesh:THREE.Mesh, colour:string) {
  let cached=rayStrips.get(mesh);
  if(cached)return cached;
  cached=new Map();
  const positions=new Map<number,number[]>();
  const g=mesh.geometry, pos=g.getAttribute('position'),col=g.getAttribute('color');
  const paint=new THREE.Color(colour);
  const id=(i:number)=>g.index?.getX(i) ?? i;
  for(let i=0;i<(g.index?.count??pos.count);i+=3){
    const first=id(i);
    if(Math.abs(col.getX(first)-paint.r)>.0001||Math.abs(col.getY(first)-paint.g)>.0001)continue;
    const pts=[first,id(i+1),id(i+2)].map(j=>new THREE.Vector3().fromBufferAttribute(pos,j).applyMatrix4(mesh.matrixWorld));
    const zs=pts.map(p=>Math.floor(p.z/16));
    for(let k=Math.min(...zs);k<=Math.max(...zs);k++){
      if(!positions.has(k))positions.set(k,[]);
      positions.get(k)!.push(...pts.flatMap(p=>p.toArray()));
    }
  }
  for(const [k,vertices] of positions){
    const geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    cached.set(k,new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide})));
  }
  rayStrips.set(mesh,cached);
  return cached;
}
function railTop(point: THREE.Vector3, south: THREE.Mesh, north: THREE.Mesh) {
  const mesh=point.z<=-5700?north:south;
  const strip=strips(mesh,mesh===north?'#c0b7a9':'#a69b8c').get(Math.floor(point.z/16));
  if(!strip)return;
  ray.set(new THREE.Vector3(point.x,250,point.z),new THREE.Vector3(0,-1,0));
  return ray.intersectObject(strip,false)[0]?.point.y;
}
export function mountedWheelCheck(cars: THREE.Mesh[], group: THREE.Scene) {
  const south = group.getObjectByName('North Line guideway') as THREE.Mesh;
  const north = group.getObjectByName('Inferred North Line extension') as THREE.Mesh;
  if (!south || !north) return [];
  return cars.map(car => ({
    index: car.userData.consistIndex, origin: car.position.toArray(), quaternion: car.quaternion.toArray(),
    treads: [-8.8,-6.7,5.95,8.05].flatMap(z => [-1,1].map(side => {
      const samples = [-.065,-.04875,-.0325,-.01625,0,.01625,.0325,.04875,.065].map(dx=>{
        const axle=car.getObjectByName('axle:'+z);
        const point=axle ? axle.localToWorld(new THREE.Vector3(side*.74+dx,0,0)) :
          car.localToWorld(new THREE.Vector3(side*.74+dx,0,z));
        const top = railTop(point,south,north);
        return {dx,xyz:point.toArray(),gap:top===undefined?null:point.y-top};
      });
      return {z,side,samples};
    }))
  }));
}

export function roadControl(scene: THREE.Scene) {
  const mesh=scene.getObjectByName('Carrier 9270932') as THREE.Mesh;
  if (!mesh) return;
  const rows=fixture.surfaces.find(s=>s.way===9270932)!.rows.map(([a,b])=>a.map((v,i)=>(v+b[i])/2));
  function pointAt(s:number) {
    const i=Math.max(1,rows.findIndex(r=>r[3]>=s));
    const [a,b]=[rows[i-1],rows[i]], t=(s-a[3])/(b[3]-a[3]);
    return new THREE.Vector3(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t);
  }
  const car=new THREE.Mesh(roadSedanGeometry(),new THREE.MeshLambertMaterial({vertexColors:true}));
  car.name='Illustrative Mayson axle control';
  scene.add(car);
  const checks=[];
  for(let s=2;s<=32;s+=.5) {
    const rear=pointAt(s-1.3575),front=pointAt(s+1.4675);
    const forward=front.clone().sub(rear).normalize();
    const right=new THREE.Vector3(0,1,0).cross(forward).normalize();
    car.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,forward.clone().cross(right),forward));
    car.position.copy(rear).addScaledVector(forward,1.3575);
    car.updateMatrixWorld(true);
    for(const [axle,halfTrack] of [[-1.3575,.7925],[1.4675,.79]]) for(const side of [-1,1]){
      const tire=car.localToWorld(new THREE.Vector3(side*halfTrack,0,axle));
      ray.set(new THREE.Vector3(tire.x,250,tire.z),new THREE.Vector3(0,-1,0));
      const top=ray.intersectObject(mesh,false)[0];
      checks.push({s,side,axle,gap:top?tire.y-top.point.y:null});
    }
  }
  car.removeFromParent();car.geometry.dispose();car.material.dispose();
  return checks;
}
