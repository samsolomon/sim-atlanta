import * as THREE from 'three';
import fixture from './fixtures/mayson-study.json';
import { roadSedanGeometry } from '../vignette/road-sedan';

const ray = new THREE.Raycaster();
function railTop(point: THREE.Vector3, south: THREE.Mesh, north: THREE.Mesh) {
  const mesh = point.z <= -5700 ? north : south;
  const colour = new THREE.Color(mesh === north ? '#c0b7a9' : '#a69b8c');
  ray.set(new THREE.Vector3(point.x, 250, point.z), new THREE.Vector3(0,-1,0));
  const colors = mesh.geometry.getAttribute('color');
  return ray.intersectObject(mesh,false).find(hit => hit.face &&
    Math.abs(colors.getX(hit.face.a)-colour.r)<.0001 &&
    Math.abs(colors.getY(hit.face.a)-colour.g)<.0001)?.point.y;
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
