/** MARTA Rapid XE60 study. Sources, measured and estimated dimensions: docs/marta-rapid-buses.md.
 * +z forward, y up, curb side -x. Front origin: front axle on ground; rear/bellows: hitch on ground. */
import * as THREE from 'three';
import { Builder, loft } from './geom';
import { busMaterial, RAPID_LIVERY } from './xcelsior';

export const XE60_LAYOUT = {
  length: 18.54, bodyLength: 18.29, width: 2.6, height: 3.3,
  front: { axles: [0, -229 * .0254], hitch: [0, 0, -8] as const, minZ: -7.4, maxZ: 2.2 },
  rear: { axles: [8 - (229 + 293) * .0254], hitch: [0, 0, 0] as const, minZ: -8.34, maxZ: -.6 },
  // Hitch location and articulation limit estimated; not manufacturer operating limits.
  maxAngle: 35 * Math.PI / 180,
} as const;
export type BusDetail = 'low' | 'high';
const C = { purple: RAPID_LIVERY.body, lavender: '#b6adc8', grey: '#bac1cd', glass: '#26333d', black: '#181e25', blue: '#29abe0', yellow: '#f4c346', orange: '#f28a39' };
class Kit extends Builder {
  kinds: number[] = [];
  mark(kind: number) { while (this.kinds.length < this.pos.length / 3) this.kinds.push(kind); }
  panel(side: number, z0: number, z1: number, y0: number, y1: number, color: string, kind = 0, x = 1.305) {
    this.quad([side*x,y0,z0],[side*x,y0,z1],[side*x,y1,z1],[side*x,y1,z0],color); this.mark(kind);
  }
  finish() {
    this.mark(0); const g = this.geometry();
    g.setAttribute('aKind',new THREE.Float32BufferAttribute(this.kinds,1));
    g.setAttribute('aBendWeight',new THREE.Float32BufferAttribute(new Float32Array(this.kinds.length),1));
    return g;
  }
}
function shell(k: Kit, z0: number, z1: number, axles: readonly number[], detail: BusDetail) {
  // Side silhouettes have real wheel cut-outs; solid roof and end caps close the body.
  const shape = new THREE.Shape(); shape.moveTo(z0,.3);
  for(const z of [...axles].sort((a,b)=>a-b)) {
    shape.lineTo(z-.61,.3); shape.lineTo(z-.61,.5);
    shape.absarc(z,.5,.61,Math.PI,0,true); shape.lineTo(z+.61,.3);
  }
  shape.lineTo(z1,.3); shape.lineTo(z1,2.8); shape.lineTo(z1-.16,3.02);
  shape.lineTo(z0+.1,3.02); shape.lineTo(z0,2.9); shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:2.6,bevelEnabled:false,curveSegments:detail==='low'?3:8});
  g.translate(0,0,-1.3); g.rotateY(-Math.PI/2); k.addGeometry(g,C.purple);g.dispose();k.mark(0);
  for(const s of [-1,1]) {
    k.panel(s,z0+.12,z1-.2,1.25,2.77,C.black);
    for(let z=z0+.18;z<z1-.29;z+=1.25) k.panel(s,z,Math.min(z+1.15,z1-.26),1.32,2.70,C.glass,4,1.311);
    // Thin blue / gold / orange band below the windows, with pale angular lower blocks.
    const span=z1-z0;
    for(const [a,b,color] of [[0,.32,C.orange],[.32,.58,C.yellow],[.58,1,C.blue]] as const)
      k.panel(s,z0+span*a,z0+span*b,1.2,1.31,color,0,1.315);
    // Keep the lower paint on solid skirt panels between the wheel openings.
    const edges = [z0 + .16, ...[...axles].sort((a,b) => a-b).flatMap(z => [z-.64,z+.64]), z1-.18];
    for (let i=0; i<edges.length; i+=2) {
      const left=edges[i], right=edges[i+1];
      if (right-left < .7) continue;
      k.quad([s*1.31,.32,left],[s*1.31,.32,right],[s*1.31,1.19,right-.42],[s*1.31,1.19,left],C.lavender);
      k.mark(0);
    }
    if(detail==='high') for(let z=z0+.4;z<z1-.4;z+=1.4) {
      k.panel(s,z,z+.018,.34,1.15,'#70618b',0,1.32);
      k.panel(s,z,z+.1,1.02,1.06,C.grey,0,1.325);
    }
  }
  const n=detail==='low'?8:20;
  for(const z of axles) for(const s of [-1,1]) {
    for(const [r,w,x,color] of [[.5,.24,1.14,'#171b20'],[.29,.025,1.273,'#aab1b9'],[.12,.04,1.29,'#606b7a']] as const) {
      const wheel=new THREE.CylinderGeometry(r,r,w,n,1).rotateZ(Math.PI/2).translate(s*x,.5,z);
      k.addGeometry(wheel,color);wheel.dispose();k.mark(0);
    }
  }
}
function door(k: Kit,z: number) {
  k.panel(-1,z-.56,z+.56,.32,2.8,C.black,0,1.33);
  k.panel(-1,z-.48,z-.04,.45,2.64,C.glass,4,1.34);
  k.panel(-1,z+.04,z+.48,.45,2.64,C.glass,4,1.34);
  k.panel(-1,z-.52,z+.52,.36,.4,C.yellow,0,1.35);
  k.panel(-1,z-.018,z+.018,.42,2.7,C.grey,0,1.35);
}
/** A shallow crown with rolled shoulders and swept ends, as seen on 9001.
 * The lower edge sits inside the body roof. Each rigid section carries its own cover. */
function roofFairing(k: Kit, rear: number, front: number, detail: BusDetail) {
  const shoulderSteps = detail === 'low' ? 2 : 4;
  const profile = [[1, 0]];
  for (const side of [1, -1]) {
    for (let i = 0; i <= shoulderSteps; i++) {
      const angle = (side === 1 ? i : shoulderSteps - i) * Math.PI / (2 * shoulderSteps);
      profile.push([side * (.78 + .22 * Math.cos(angle)), .36 + .64 * Math.sin(angle)]);
    }
  }
  profile.push([-1, 0]);

  // Ease both ends into the roof. The battery cover tapers in width as well as height.
  const stations = [
    [rear, .82, .10], [rear + .16, .94, .70], [rear + .48, 1, 1],
    [front - .65, 1, 1], [front - .22, .95, .75], [front, .82, .10],
  ];
  const rings = stations.map(([z, width, height]) => profile.map(([x, y]) =>
    [x * 1.18 * width, 3.005 + y * .295 * height, z]));
  loft(k, rings, profile.map(() => C.purple));
  k.mark(0);
}
export function xe60Geometry(detail:BusDetail='high') {
  const f=new Kit(),r=new Kit();
  shell(f,-7.4,2.07,XE60_LAYOUT.front.axles,detail);shell(r,-8.21,-.6,XE60_LAYOUT.rear.axles,detail);
  door(f,1.27);door(f,-3.9);door(r,-3.2);
  roofFairing(f, -7.30, 1.88, detail);
  roofFairing(r, -8.02, -.70, detail);
  // Broad front glass, upper destination strip and swept silver headlight cheeks.
  f.box(2.36,1.43,.03,0,2.03,2.085,C.glass);f.mark(0);
  f.box(2.25,.25,.035,0,2.83,2.087,C.black);f.mark(0);
  f.box(1.8,.11,.04,0,2.83,2.11,'#ffb950');f.mark(7);
  f.box(.035,1.42,.04,0,2.03,2.105,C.black);f.mark(0);
  for(const s of [-1,1]) {
    f.box(.4,.24,.04,s*.92,.86,2.09,C.grey);f.mark(0);
    f.box(.29,.11,.05,s*.92,.88,2.12,'#fff9df');f.mark(1);
    f.box(.075,.05,.42,s*1.23,2.75,2.04,C.black);f.mark(0);
    f.box(.14,.42,.16,s*1.24,2.5,2.28,C.black);f.mark(0);
    r.box(.15,.47,.04,s*1.08,.95,-8.23,'#ef2830');r.mark(2);
    r.box(.13,.1,.04,s*1.08,1.28,-8.24,C.orange);r.mark(0);
  }
  f.box(2.48,.27,.19,0,.43,2.105,C.black);f.mark(0);
  r.box(2.48,.27,.19,0,.43,-8.245,C.black);r.mark(0);
  r.box(1.55,.8,.025,0,1.17,-8.23,C.grey);r.mark(0);
  r.box(.95,.17,.025,0,2.56,-8.23,'#ffb950');r.mark(7);
  return {front:f.finish(),rear:r.finish(),bellows:bellows(detail)};
}
function bellows(detail:BusDetail) {
  const b=new Builder(), weights:number[]=[]; const rings=detail==='low'?8:20;
  for(let i=0;i<rings;i++) {
    const ring=(j:number)=>{const t=j/rings, w=1.29+(j%2===0?0:.045),top=3.02+(j%2===0?0:.035);return [[-w,.32,.6-1.2*t],[w,.32,.6-1.2*t],[w,top,.6-1.2*t],[-w,top,.6-1.2*t]];};
    const a=ring(i),c=ring(i+1);
    for(let j=0;j<4;j++){
      b.quad(a[j],a[(j+1)%4],c[(j+1)%4],c[j],i%2?'#8a8e98':'#b0b3bb');
      weights.push(i/rings,i/rings,(i+1)/rings,i/rings,(i+1)/rings,(i+1)/rings);
    }
  }
  const g=b.geometry();g.setAttribute('aKind',new THREE.Float32BufferAttribute(new Float32Array(weights.length),1));g.setAttribute('aBendWeight',new THREE.Float32BufferAttribute(weights,1));return g;
}
export function xe60Pose(angle:number) {
  const a=THREE.MathUtils.clamp(Number.isFinite(angle)?angle:0,-XE60_LAYOUT.maxAngle,XE60_LAYOUT.maxAngle);
  return { front:{x:0,y:0,z:0,yaw:0,pitch:0},rear:{x:0,y:0,z:-8,yaw:a,pitch:0},angle:a };
}
/** For instanced motion, supply an InstancedBufferAttribute named aArticulation on each mesh.
 * Front/rear geometries have zero bend weight; their instance matrices own their rigid poses. */
export function xe60Material(night:{value:number},angle:{value:number},instanced=false) {
  return bendMaterial(busMaterial(night), angle, instanced);
}
export function xe60DepthMaterial(angle: {value: number}, instanced = false) {
  return bendMaterial(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide }), angle, instanced);
}
function bendMaterial<T extends THREE.Material>(m: T, angle: {value: number}, instanced: boolean) {
  const base=m.onBeforeCompile;
  m.onBeforeCompile=(sh,renderer)=>{
    base.call(m,sh,renderer);sh.uniforms.uArticulation=angle;
    sh.vertexShader=sh.vertexShader.replace('#include <common>',`#include <common>\nattribute float aBendWeight;\nuniform float uArticulation;\n${instanced?'attribute float aArticulation;':''}\nmat3 bendRotation(float a) { float c=cos(a),s=sin(a); return mat3(c,0.,-s,0.,1.,0.,s,0.,c); }`)
      .replace('#include <begin_vertex>',`#include <begin_vertex>\ntransformed = mix(transformed, bendRotation(${instanced?'aArticulation':'uArticulation'}) * transformed, aBendWeight);`)
      .replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>\nobjectNormal = normalize(mix(objectNormal, bendRotation(${instanced?'aArticulation':'uArticulation'}) * objectNormal, aBendWeight));`);
  };
  m.customProgramCacheKey=()=>`xe60-${instanced}`;
  return m;
}
