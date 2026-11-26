import { runSync, type Build } from '../core/slice';
// Split a long terrain edge at the existing vertices of its neighbours while
// positions are still doubles. Both sides then round to the same Float32 chain.
type Mesh = { pos:number[]; uv:number[]; indices:number[]; starts:Uint32Array };
export function conformCutEdges(mesh: Mesh, touched: ReadonlySet<number>, formationFloor?: (x:number,z:number)=>number) {
  runSync(conformCutEdgesSteps(mesh, touched, formationFloor));
}

/** conformCutEdges as a build that yields every few hundred blocks (same triangles). The mesh is
 * the tessellation's own until it returns. */
export function* conformCutEdgesSteps(mesh: Mesh, touched: ReadonlySet<number>, formationFloor?: (x:number,z:number)=>number): Build<void> {
  const {pos,uv,indices,starts}=mesh;
  const cells=new Map<string,number[]>(), seen=new Set<string>();
  const key=(x:number,z:number)=>Math.floor(x)+','+Math.floor(z);
  for(const block of touched) for(let i=starts[block];i<starts[block+1];i++) {
    const v=indices[i], x=pos[v*3], z=pos[v*3+2], xy=x+','+z;
    if(seen.has(xy)) continue;
    seen.add(xy);
    const k=key(x,z), bucket=cells.get(k);
    if(bucket) bucket.push(v); else cells.set(k,[v]);
  }
  const output:number[]=[], oldStarts=starts.slice();
  const cuts=new Map<string,number[]>();
  function splitEdge(a:number,b:number) {
    const edgeKey=a+','+b, known=cuts.get(edgeKey);
    if(known) return known;
    const ax=pos[a*3], az=pos[a*3+2], bx=pos[b*3], bz=pos[b*3+2];
    const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);
    const picks:{t:number,v:number}[]=[];
    if(len>1e-7) for(let x=Math.floor(Math.min(ax,bx));x<=Math.floor(Math.max(ax,bx));x++)
      for(let z=Math.floor(Math.min(az,bz));z<=Math.floor(Math.max(az,bz));z++)
        for(const v of cells.get(x+','+z)??[]) {
          const vx=pos[3*v]-ax,vz=pos[3*v+2]-az;
          if(Math.abs(dx*vz-dz*vx)>1e-8*len) continue;
          const t=(vx*dx+vz*dz)/(len*len);
          if(t*len>1e-7 && (1-t)*len>1e-7) picks.push({t,v});
        }
    const chain:number[]=[];
    let last=-1;
    for(const {t,v} of picks.sort((p,q)=>p.t-q.t)) {
      if((t-last)*len<1e-7) continue;
      last=t;
      const y=pos[a*3+1]+t*(pos[b*3+1]-pos[a*3+1]);
      // A single-valued graded shoulder shares the sampled vertex height.
      // Cuts with a floor can carry separate upper and lower surfaces.
      if(!formationFloor || Math.abs(y-pos[v*3+1])<1e-8) chain.push(v);
      else {
        chain.push(pos.length/3);
        pos.push(pos[v*3],y,pos[v*3+2]);
        uv.push(uv[v*2],uv[v*2+1]);
      }
    }
    cuts.set(edgeKey,chain);cuts.set(b+','+a,[...chain].reverse());
    return chain;
  }
  yield 'ground rows';
  for(let block=0;block<starts.length-1;block++) {
    if(block%256===255) yield 'ground rows';
    starts[block]=output.length;
    if (!touched.has(block)) {
      for(let i=oldStarts[block];i<oldStarts[block+1];i++)output.push(indices[i]);
      continue;
    }
    for(let i=oldStarts[block];i<oldStarts[block+1];i+=3) {
      const original=indices.slice(i,i+3),faces=[original];
      if(touched.has(block)) {
        const [a,b,c]=original.map(v=>3*v);
        const area=(pos[b]-pos[a])*(pos[c+2]-pos[a+2])-(pos[c]-pos[a])*(pos[b+2]-pos[a+2]);
        if(Math.abs(area)<1e-8 && formationFloor) {
          // A zero-width clip remnant can acquire projected area after the Float32 cast.
          // Keep its plan boundary, with the same floor as the adjacent formation.
          for(const v of original) {
            const x=pos[3*v], y=pos[3*v+1], z=pos[3*v+2];
            const floor=formationFloor(x,z);
            if(y<=floor) output.push(v);
            else {
              output.push(pos.length/3); pos.push(x,floor,z); uv.push(uv[2*v],uv[2*v+1]);
            }
          }
          continue;
        }
      }
      for(let e=0;e<3;e++) {
        const a=original[e],b=original[(e+1)%3], chain=splitEdge(a,b);
        if(!chain.length) continue;
        const j=faces.findIndex(f=>f.includes(a)&&f.includes(b));
        if(j<0) continue;
        const face=faces[j],third=face[(face.indexOf(a)+2)%3];
        const edge=[a,...chain,b];
        faces.splice(j,1,...edge.slice(1).map((v,k)=>[edge[k],v,third]));
      }
      for(const face of faces) output.push(...face);
    }
  }
  starts[starts.length-1]=output.length;
  mesh.indices=output;
}
