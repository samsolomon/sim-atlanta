// Usage: node probe.mjs < baked.json
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { triangleHeight } from '../../../web/src/terrain/tread-height.ts';
const require = createRequire(new URL('../../../web/package.json', import.meta.url));
const { Mesh, BufferGeometry, Float32BufferAttribute, MeshBasicMaterial, DoubleSide, Raycaster, Vector3 } = require('three');
const fixture = JSON.parse(readFileSync(0, 'utf8'));
const surfaces = new Map(fixture.surfaces.map(s => [s.id, s]));
const material = new MeshBasicMaterial({side:DoubleSide});
const ray = new Raycaster(new Vector3(), new Vector3(0,-1,0));
for (const s of surfaces.values()) {
  s.meshes = s.pieces.map(vertices => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position',new Float32BufferAttribute(vertices.flatMap(v=>v.slice(0,3)),3));
    return new Mesh(geometry,material);
  });
}
function sample(s,x,z,side = Number(z >= s.cutZ)) {
  x=Math.fround(x); z=Math.fround(z);
  const mesh = s.meshes[side];
  ray.ray.origin.set(x,1000,z);
  const rendered = ray.intersectObject(mesh,false)[0]?.point.y;
  const p = mesh.geometry.getAttribute('position');
  let wheel;
  for (let i=0;i<p.count;i+=3) {
    const h=triangleHeight(p,i,x,z);
    if (h!==null) wheel=Math.max(wheel??-Infinity,h);
  }
  return {rendered,wheel};
}
function check(s,x,z,side) {
  const {rendered,wheel}=sample(s,x,z,side);
  assert.ok(Number.isFinite(rendered)&&Number.isFinite(wheel),`missing ${s.id} at ${x},${z}`);
  assert.ok(Math.abs(rendered-wheel)<.0001,`wheel off the drawn surface on ${s.id}`);
  return wheel;
}
function center(row) {return row[0].map((v,j)=>(v+row[1][j])/2)}
const owner=id=>surfaces.get('osm:way:'+id);
const results=[];
for (const id of [1450813223,1450813225,1450813220,9235148]) {
  const s=owner(id),z=s.cutZ;
  const edges=s.pieces.map(piece=>piece.filter(v=>v[2]===z).map(v=>v[0]));
  const spans=edges.map(xs=>[Math.min(...xs),Math.max(...xs)]);
  const [left,right]=spans[0];
  assert.ok(Math.max(...spans[1].map((v,j)=>Math.abs(v-spans[0][j])))<1e-7);
  const rows=s.rows.map(center);
  const j=rows.findIndex((v,i)=>i && (v[2]-z)*(rows[i-1][2]-z)<=0);
  const a=rows[j-1],b=rows[j],dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz);
  const width=(right-left)*Math.abs(dz)/len;
  assert.ok(Math.abs(width-s.width)<.01,`width ${id}`);
  let step=0, gradeChange=0, missing=0, probes=0;
  for(let m=0;m<=40;m++){
    // Sample the entire usable width, 1 mm inside the outer edges for ray precision.
    const x=left+.001+(right-left-.002)*m/40;
    step=Math.max(step,Math.abs(check(s,x,z,0)-check(s,x,z,1)));
  }
  for(const offset of [0,-.8,.8,-s.width/2+.01,s.width/2-.01]){
    const x=(left+right)/2+offset*len/Math.abs(dz);
    const neighbours=fixture.relations.filter(r=>r.kind==='continuation' && r.ways.includes(id))
      .flatMap(r=>r.ways.filter(n=>n!==id)).map(owner);
    const heights=[];
    for(let i=-8;i<=8;i++){
      const d=i*.025, xx=x+d*dx/len, zz=z+d*dz/len;
      const p=[s,...neighbours].map(surface=>sample(surface,xx,zz)).find(p=>Number.isFinite(p.rendered)&&Number.isFinite(p.wheel))??{};
      probes++;
      if(!Number.isFinite(p.wheel)||!Number.isFinite(p.rendered)){missing++; console.error(id,offset,d,p);}
      heights.push(p.wheel);
    }
    const gradeL=(heights[8]-heights[0])/.2, gradeR=(heights[16]-heights[8])/.2;
    gradeChange=Math.max(gradeChange,Math.abs(gradeL-gradeR));
  }
  assert.equal(missing,0); assert.ok(step<.0002); assert.ok(gradeChange<.01,`grade change ${id}: ${gradeChange}`);
  results.push({id,probes,missing,seamStepM:step,gradeChangePp:100*gradeChange,usableWidthM:width});
}
for(const r of fixture.relations){
  const [x,z]=r.point;
  if(r.upper){
    const clearance=check(owner(r.upper),x,z)-r.depth-check(owner(r.lower),x,z);
    assert.ok(clearance>=r.required-.001,`clearance ${r.upper} ${clearance}`);
    results.push({upper:r.upper,lower:r.lower,modeledSoffitClearanceM:clearance,marginM:clearance-r.required});
  } else if (r.kind==='continuation'||r.kind==='same-grade') {
    // Source endpoint lies on boundary triangles. Use the native wheel tolerance.
    const heights=r.ways.map(id=>sample(owner(id),x,z).wheel);
    assert.ok(heights.every(Number.isFinite));
    assert.ok(Math.max(...heights)-Math.min(...heights)<.0002);
    results.push({node:r.node,kind:r.kind,stepM:Math.max(...heights)-Math.min(...heights)});
  }
}
assert.equal(fixture.relations.filter(r=>r.kind==='rail-over-road').length,8);
assert.equal(fixture.relations.filter(r=>r.kind==='pedestrian-connection').length,2);
console.log(JSON.stringify(results,null,2));
