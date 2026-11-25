import * as THREE from 'three';
import { cq400StudyGear } from '../vignette/cq400';
import type { Line } from '../vignette/geom';

interface Face { a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3 }
const key = (x:number,z:number) => Math.floor(x/8)+','+Math.floor(z/8);
export class RailTops {
  private cells = new Map<string,Face[]>();
  add(mesh: THREE.Mesh, railColour: string) {
    const g=mesh.geometry, pos=g.getAttribute('position'), col=g.getAttribute('color');
    const paint=new THREE.Color(railColour);
    const vertices=g.index?.count ?? pos.count;
    for(let i=0;i<vertices;i+=3){
      const at=(offset:number)=>g.index?.getX(i+offset) ?? i+offset;
      if(Math.abs(col.getX(at(0))-paint.r)>.0001 || Math.abs(col.getY(at(0))-paint.g)>.0001)continue;
      const point=(n:number)=>new THREE.Vector3().fromBufferAttribute(pos,at(n)).applyMatrix4(mesh.matrixWorld);
      const a=point(0),b=point(1),c=point(2),face={a,b,c};
      for(let x=Math.floor(Math.min(a.x,b.x,c.x)/8);x<=Math.floor(Math.max(a.x,b.x,c.x)/8);x++)
        for(let z=Math.floor(Math.min(a.z,b.z,c.z)/8);z<=Math.floor(Math.max(a.z,b.z,c.z)/8);z++){
          const k=x+','+z,cell=this.cells.get(k);
          if(cell)cell.push(face);else this.cells.set(k,[face]);
        }
    }
  }
  at(x:number,z:number) {
    for(const {a,b,c} of this.cells.get(key(x,z)) ?? []){
      const den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);
      if(Math.abs(den)<1e-10)continue;
      const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den;
      const v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den;
      if(u>=-1e-6 && v>=-1e-6 && u+v<=1.000001)return u*a.y+v*b.y+(1-u-v)*c.y;
    }
    return null;
  }
}
const up=new THREE.Vector3(0,1,0);
const pivots=[-7.75,7];
const axles=[-8.8,-6.7,5.95,8.05];
const basis=(forward:THREE.Vector3,right:THREE.Vector3)=>{
  const vertical=forward.clone().cross(right).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(
    right,vertical,right.clone().cross(vertical).normalize()));
};
const parts=cq400StudyGear();
export function articulate(car:THREE.Mesh,line:Line,along:number,dir:number,rail:RailTops,bed:(s:number)=>number){
  if(!car.children.length) {
    for(const z of [...pivots,...axles]){
      const part=new THREE.Mesh(pivots.includes(z)?parts.bogie:parts.axle,car.material);
      part.name=(pivots.includes(z)?'bogie:':'axle:')+z;
      car.add(part);
    }
  }
  const poses=axles.map(z=>{
    const s=along+z*dir,p=line.at(s);
    const right=new THREE.Vector3(p.dz*dir,0,-p.dx*dir);
    const forward=new THREE.Vector3(p.dx*dir,0,p.dz*dir);
    // Keep the wheelset rigid. A polyline's corner normal differs from the actual
    // ribbon where the prior and next rail cross-sections are joined.
    for(const shift of [0,.01,-.01,.02,-.02,.03,-.03,.04,-.04,.05,-.05,.06,-.06,.08,-.08]){
      const centre=new THREE.Vector3(p.x,0,p.z).addScaledVector(right,shift);
      const left=centre.clone().addScaledVector(right,-.74),rhs=centre.clone().addScaledVector(right,.74);
      const lo=rail.at(left.x,left.z),hi=rail.at(rhs.x,rhs.z);
      if(lo===null || hi===null)continue;
      centre.y=(lo+hi)/2;
      right.y=(hi-lo)/1.48;right.normalize();
      return {position:centre,q:basis(forward,right)};
    }
    return {position:new THREE.Vector3(p.x,bed(s)+.07,p.z),q:basis(forward,right)};
  });
  const align=(a:THREE.Vector3,b:THREE.Vector3)=>{
    const f=b.clone().sub(a).normalize(),r=up.clone().cross(f).normalize();
    return basis(f,r);
  };
  const bogies=[0,2].map(i=>({position:poses[i].position.clone().lerp(poses[i+1].position,.5),
    q:align(poses[i].position,poses[i+1].position)}));
  car.position.copy(bogies[0].position).lerp(bogies[1].position,-pivots[0]/(pivots[1]-pivots[0]));
  car.quaternion.copy(align(bogies[0].position,bogies[1].position));
  const inverse=car.quaternion.clone().invert();
  [...bogies,...poses].forEach(({position,q},i)=>{
    const child=car.children[i];
    child.position.copy(position).sub(car.position).applyQuaternion(inverse);
    child.quaternion.copy(inverse).multiply(q);
  });
}
