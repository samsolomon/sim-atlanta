(async()=>{
const {ribbons,stripePoint}=await import('/src/terrain/connector-corridor.ts');
const THREE=await import('/node_modules/.vite/deps/three.js').catch(()=>null);
const {scene}=__cityDev; const areas=[...__cityDev.areas()];
const decks=[]; scene.updateWorldMatrix(true,true);
scene.traverseVisible(m=>{if(!m.isMesh||m.isInstancedMesh)return; const path=[];for(let o=m;o&&o!==scene;o=o.parent)path.unshift(o.name||''); const l=path.join('/'); if(/Decks and embedded rails|17th Street Bridge|bridge approaches|Connector street deck|Peachtree bridge|North Line spans|MARTA track and viaduct|Freight track/.test(l)) decks.push(m);});
const RC=new (THREE?THREE.Raycaster:Object)(); const V=scene.position.constructor;
const out=[];
const at=(x,z)=>{for(const [id,a] of areas){const b=a.bounds; if(x>b.minX&&x<b.maxX&&z>b.minZ&&z<b.maxZ) return [id,a];} return null;};
for(const r of ribbons){ if(r.kind!=='ground')continue; const rows=r.rows; for(let i=0;i<rows.length;i++){ for(const half of [0,.5]){ if(half&&i===rows.length-1)continue; const row=half? {inner:[(rows[i].inner[0]+rows[i+1].inner[0])/2,(rows[i].inner[1]+rows[i+1].inner[1])/2],outer:[(rows[i].outer[0]+rows[i+1].outer[0])/2,(rows[i].outer[1]+rows[i+1].outer[1])/2]}:rows[i]; const s=half?(rows[i].s+rows[i+1].s)/2:rows[i].s;
 for(let lane=0;lane<r.lanes;lane++){ const [x,z]=stripePoint(row,(lane+.5)/r.lanes); const A=at(x,z); if(!A)continue; const [id,a]=A; const y=a.terrainAt(x,z); if(y==null||!Number.isFinite(y))continue; const g=a.grid.sample(x,z);
  let deck=null; if(THREE){RC.set(new V(x,400,z),new V(0,-1,0)); RC.far=800; const hits=RC.intersectObjects(decks,false).map(h=>h.point.y).filter(h=>h>y+1.5); if(hits.length)deck=Math.min(...hits);} 
  out.push([r.id,r.direction,lane,+s.toFixed(1),+x.toFixed(2),+z.toFixed(2),id,+y.toFixed(3),g==null?null:+g.toFixed(3),deck==null?null:+deck.toFixed(2)]);}}}}
return {three:!!THREE,decks:decks.length,n:out.length,rows:out};})()
