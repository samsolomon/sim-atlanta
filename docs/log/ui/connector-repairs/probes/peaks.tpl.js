(()=>{const {scene}=__cityDev; const SEG=__SEGS__; const C=20, grid=new Map();
for(const s of SEG){const [ax,az,bx,bz]=s; const n=Math.ceil(Math.hypot(bx-ax,bz-az)/C)+1; for(let i=0;i<=n;i++){const x=ax+(bx-ax)*i/n,z=az+(bz-az)*i/n; const k=Math.floor(x/C)+','+Math.floor(z/C); if(!grid.has(k))grid.set(k,[]); grid.get(k).push(s);}}
const near=(x,z)=>{let best=1e9; for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){const L=grid.get((Math.floor(x/C)+dx)+','+(Math.floor(z/C)+dz)); if(!L)continue; for(const [ax,az,bx,bz] of L){const vx=bx-ax,vz=bz-az,l2=vx*vx+vz*vz||1; let t=((x-ax)*vx+(z-az)*vz)/l2; t=Math.max(0,Math.min(1,t)); const d=Math.hypot(x-ax-t*vx,z-az-t*vz); if(d<best)best=d;}} return best;};
const out=[]; const P=new (scene.position.constructor)();
scene.updateWorldMatrix(true,true);
scene.traverseVisible(m=>{ if(!m.isMesh||m.isSkinnedMesh||m.isInstancedMesh)return; const g=m.geometry,pos=g.getAttribute('position'); if(!pos)return; const idx=g.index; const col=g.getAttribute('color');
 const path=[]; for(let o=m;o&&o!==scene;o=o.parent) path.unshift(o.name||o.type); const label=path.join('/');
 if(/traffic|buses|freight|landmark|houses|yards|tree|Streetcar|prewarm|Live|guideway|Stadium|osm:|curated|Tower|Building|Library|Hall|Center|Museum/i.test(label))return;
 const cnt=idx?idx.count:pos.count; const start=Math.max(0,g.drawRange.start), end=Math.min(cnt,g.drawRange.start+g.drawRange.count);
 // world positions, merged by quantised xz+y
 const key=new Map(); const W=[]; const vid=i=>{P.fromBufferAttribute(pos,i).applyMatrix4(m.matrixWorld); const k=Math.round(P.x*50)+','+Math.round(P.y*50)+','+Math.round(P.z*50); let v=key.get(k); if(v===undefined){v=W.length;key.set(k,v);W.push([P.x,P.y,P.z,i]);} return v;};
 const nb=[]; const add=(a,b)=>{(nb[a]??=new Set()).add(b);};
 for(let i=start;i+2<end;i+=3){const t=[0,1,2].map(d=>vid(idx?idx.getX(i+d):i+d)); for(const a of t)for(const b of t)if(a!==b)add(a,b);}
 for(let v=0;v<W.length;v++){const s=nb[v]; if(!s||s.size<3)continue; const [x,y,z,i]=W[v]; let mx=-1e9, sameXZ=false; for(const u of s){const w=W[u]; if(Math.abs(w[0]-x)<.02&&Math.abs(w[2]-z)<.02){sameXZ=true;break;} if(w[1]>mx)mx=w[1];}
  if(sameXZ)continue; const rise=y-mx; if(rise<1.5)continue; const d=near(x,z); if(d>25)continue;
  let rgb=null; if(col){rgb=[col.getX(i),col.getY(i),col.getZ(i)].map(c=>Math.round(255*(c<=.0031308?12.92*c:1.055*c**(1/2.4)-.055))); rgb=rgb[0]*65536+rgb[1]*256+rgb[2];}
  let mn=1e9; for(const u of s) mn=Math.min(mn,W[u][1]);
  out.push([label,rgb,+x.toFixed(2),+z.toFixed(2),+y.toFixed(2),+rise.toFixed(2),+mn.toFixed(2),s.size,+d.toFixed(1),i]);
 }});
return out;})()
