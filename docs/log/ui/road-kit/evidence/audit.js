(async()=>{const THREE=await import('/node_modules/.vite/deps/three.js');const {scene,areas}=__cityDev;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const views=[[35,55,430,565,-1279],[35,55,430,358,777],[35,55,430,1200,-150],[35,55,430,1200,-700],[35,55,430,73,-2555],[35,55,430,-29,-4186],[35,55,430,-249,-4860],[0,55,600,700,-5600],[35,55,430,190,1018],[35,55,430,-600,1000],[35,55,430,1400,1000]];
for(const v of views){__setView(...v);await sleep(9000);}
const C=1.0, OFF=20000, key=(i,j)=>(i+OFF)*100000+(j+OFF), unkey=k=>{const a=Math.floor(k/100000);return [a-OFF,k-a*100000-OFF];};
const TREAD=new Set(['54565d','5d5f66','d9d3c7','e6e2d6']), PARAPET='c9c4b9';
const col=new THREE.Color();const hex=(c,i)=>{col.fromBufferAttribute(c,i);return col.getHexString();};
// Board bounds in world space
const BOUNDS={"downtown": {"minX": -1000.0, "maxX": 1000.0, "minZ": -1300.0, "maxZ": 700.0}, "north-band": {"minX": -1000, "maxX": 1800, "minZ": -1700, "maxZ": -1300}, "brookwood-station": {"minX": -1000.0, "maxX": 1800.0, "minZ": -5700.0, "maxZ": -4900.0}, "midtown-central": {"minX": -1000, "maxX": 1800, "minZ": -3300, "maxZ": -2500}, "north-corner": {"minX": 1000, "maxX": 1800, "minZ": -1300, "maxZ": -520}, "south-band": {"minX": -1000, "maxX": 1800, "minZ": 700, "maxZ": 1100}, "midtown-south": {"minX": -1000, "maxX": 1800, "minZ": -2500, "maxZ": -1700}, "brookwood-south": {"minX": -1000.0, "maxX": 1800.0, "minZ": -4900.0, "maxZ": -4100.0}, "midtown-upper": {"minX": -1000, "maxX": 1800, "minZ": -4100, "maxZ": -3300}, "r16": {"minX": -1000.0, "maxX": 1800.0, "minZ": -6500.0, "maxZ": -5700.0}, "south-corner": {"minX": 1000, "maxX": 1800, "minZ": 640, "maxZ": 700}, "auburn": {"minX": 1000, "maxX": 1800, "minZ": -520, "maxZ": 280}, "king": {"minX": 1000.0, "maxX": 1800.0, "minZ": 280.0, "maxZ": 640.0}};
const boards=[];for(const [id,a] of areas()){if(!a.board||!BOUNDS[id])continue;a.board.updateMatrixWorld(true);const q=BOUNDS[id];const bb=new THREE.Box3(new THREE.Vector3(q.minX,-1e4,q.minZ),new THREE.Vector3(q.maxX,1e4,q.maxZ));boards.push({id,a,bb});}
const boardOf=(x,z)=>{for(const b of boards)if(x>=b.bb.min.x&&x<=b.bb.max.x&&z>=b.bb.min.z&&z<=b.bb.max.z)return b.id;return null;};
const isStructure=p=>/Decks and embedded rails|bridge approaches|17th Street Bridge|ramp tread|concrete tread|street deck/i.test(p);
const treads=new Map(), walls=new Map();
const v=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];
function raster(a,b,c,fn){const minx=Math.min(a.x,b.x,c.x),maxx=Math.max(a.x,b.x,c.x),minz=Math.min(a.z,b.z,c.z),maxz=Math.max(a.z,b.z,c.z);
 for(let i=Math.ceil(minx/C);i*C<=maxx;i++)for(let j=Math.ceil(minz/C);j*C<=maxz;j++){const x=i*C,z=j*C;
  const d=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(d)<1e-9)continue;const l1=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/d,l2=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/d,l3=1-l1-l2;
  if(l1<-1e-6||l2<-1e-6||l3<-1e-6)continue;fn(i,j,l1*a.y+l2*b.y+l3*c.y);}}
const pierSeen=new Set();
scene.updateMatrixWorld(true);
function collectAt(inBox){scene.traverse(o=>{if(!o.isMesh||!o.visible)return;const p=[];for(let q=o;q&&q!==scene;q=q.parent)p.unshift(q.name||q.type);const path=p.join('/');
 if(/pier|bent|supports/i.test(path)){pierSeen.add(o.uuid);}
 if(!isStructure(path))return;const g=o.geometry,pos=g.attributes.position,c=g.attributes.color,idx=g.index;const n=idx?idx.count:pos.count;const approach=/bridge approaches/.test(path);
 for(let t=0;t<n;t+=3){const ia=idx?idx.getX(t):t,ib=idx?idx.getX(t+1):t+1,ic=idx?idx.getX(t+2):t+2;
  v[0].fromBufferAttribute(pos,ia).applyMatrix4(o.matrixWorld);v[1].fromBufferAttribute(pos,ib).applyMatrix4(o.matrixWorld);v[2].fromBufferAttribute(pos,ic).applyMatrix4(o.matrixWorld);
  const h=c?hex(c,ia):null;
  if(!inBox((v[0].x+v[1].x+v[2].x)/3,(v[0].z+v[1].z+v[2].z)/3))continue;
  if(h===PARAPET){const minx=Math.min(v[0].x,v[1].x,v[2].x),maxx=Math.max(v[0].x,v[1].x,v[2].x),minz=Math.min(v[0].z,v[1].z,v[2].z),maxz=Math.max(v[0].z,v[1].z,v[2].z),top=Math.max(v[0].y,v[1].y,v[2].y);
   for(let i=Math.floor(minx/C);i*C<=maxx+C;i++)for(let j=Math.floor(minz/C);j*C<=maxz+C;j++){const k=key(i,j);walls.set(k,Math.max(walls.get(k)??-1e9,top));}continue;}
  if(!approach&&!TREAD.has(h))continue;
  const nx=(v[1].y-v[0].y)*(v[2].z-v[0].z)-(v[1].z-v[0].z)*(v[2].y-v[0].y),ny=(v[1].z-v[0].z)*(v[2].x-v[0].x)-(v[1].x-v[0].x)*(v[2].z-v[0].z),nz=(v[1].x-v[0].x)*(v[2].y-v[0].y)-(v[1].y-v[0].y)*(v[2].x-v[0].x);
  const len=Math.hypot(nx,ny,nz);if(!len||Math.abs(ny)/len<0.7)continue;
  raster(v[0],v[1],v[2],(i,j,y)=>{const k=key(i,j);let L=treads.get(k);if(!L)treads.set(k,L=[]);if(!L.some(q=>Math.abs(q-y)<0.002))L.push(y);});}});}
const inB=b=>(x,z)=>x>=b.bb.min.x&&x<=b.bb.max.x&&z>=b.bb.min.z&&z<=b.bb.max.z;
for(const b of boards){const nx=Math.max(1,Math.ceil((b.bb.max.x-b.bb.min.x)/600)),nz=Math.max(1,Math.ceil((b.bb.max.z-b.bb.min.z)/600));
 for(let ix=0;ix<nx;ix++)for(let iz=0;iz<nz;iz++){const x=b.bb.min.x+(ix+.5)*(b.bb.max.x-b.bb.min.x)/nx,z=b.bb.min.z+(iz+.5)*(b.bb.max.z-b.bb.min.z)/nz;
  const sub=(px,pz)=>Math.abs(px-x)<=(b.bb.max.x-b.bb.min.x)/nx/2+1&&Math.abs(pz-z)<=(b.bb.max.z-b.bb.min.z)/nz/2+1;
  __setView(35,55,430,x,z);await sleep(8000);collectAt((px,pz)=>inB(b)(px,pz)&&sub(px,pz));}}
const pierMeshes=pierSeen.size;
// Terrain at tread cells
const terr=new Map();
for(const b of boards){const g=b.a.board.geometry,pos=g.attributes.position,idx=g.index,n=idx?idx.count:pos.count,m=b.a.board.matrixWorld;
 for(let t=0;t<n;t+=3){const ia=idx?idx.getX(t):t,ib=idx?idx.getX(t+1):t+1,ic=idx?idx.getX(t+2):t+2;v[0].fromBufferAttribute(pos,ia).applyMatrix4(m);v[1].fromBufferAttribute(pos,ib).applyMatrix4(m);v[2].fromBufferAttribute(pos,ic).applyMatrix4(m);
  const minx=Math.min(v[0].x,v[1].x,v[2].x),maxx=Math.max(v[0].x,v[1].x,v[2].x),minz=Math.min(v[0].z,v[1].z,v[2].z),maxz=Math.max(v[0].z,v[1].z,v[2].z);
  let any=false;for(let i=Math.ceil((minx-C)/C);i*C<=maxx+C&&!any;i++)for(let j=Math.ceil((minz-C)/C);j*C<=maxz+C;j++)if(treads.has(key(i,j))){any=true;break;}
  if(!any)continue;raster(v[0],v[1],v[2],(i,j,y)=>{const k=key(i,j);if(treads.has(k))terr.set(k,Math.max(terr.get(k)??-1e9,y));});}}
// Metrics per board
const stats={};const S=id=>stats[id]??=(stats[id]={treadM2:0,elevatedM2:0,stackedM2:0,coplanarM2:0,edgeM:0,walledM:0,landsM:0,stepM:0,openM:0,stacked:[],open:[],steps:[]});
const nb=[[1,0],[-1,0],[0,1],[0,-1]];
const top=k=>{const L=treads.get(k);return L?Math.max(...L):null;};
for(const [k,L] of treads){const [i,j]=unkey(k);const x=i*C,z=j*C;const id=boardOf(x,z);if(!id)continue;const s=S(id);s.treadM2+=C*C;
 const srt=[...L].sort((a,b)=>b-a);
 for(let q=1;q<srt.length;q++){const d=srt[q-1]-srt[q];if(d<0.30){if(d<=0.002)s.coplanarM2+=C*C;else{s.stackedM2+=C*C;s.stacked.push([x,z,+(srt[q-1]+323.8).toFixed(2),+d.toFixed(3)]);}break;}}
 const T=srt[0],G=terr.get(k);if(G==null||T-G<1.5)continue;s.elevatedM2+=C*C;
 for(const [di,dj] of nb){const kn=key(i+di,j+dj);const Ln=treads.get(kn);if(Ln&&Ln.some(q=>Math.abs(q-T)<0.3))continue;
  s.edgeM+=C;const w=Math.max(walls.get(k)??-1e9,walls.get(kn)??-1e9);
  if(w>T+0.3){s.walledM+=C;continue;}
  const Gn=terr.get(kn);if(Gn!=null&&Math.abs(Gn-T)<0.5){s.landsM+=C;continue;}
  if(Ln&&Ln.some(q=>q<T-0.3&&q>T-1.5)){s.stepM+=C;s.steps.push([x,z,+(T+323.8).toFixed(2)]);continue;}
  s.openM+=C;s.open.push([x,z,+(T+323.8).toFixed(2)]);}}
// Cluster sites (cells within 3 m) and keep the largest few per board
function sites(list){const cl=[];for(const p of list){let c=cl.find(c=>Math.abs(c.x-p[0])<=3&&Math.abs(c.z-p[1])<=3);if(!c)cl.push(c={x:p[0],z:p[1],n:0,y:p[2],sx:0,sz:0});c.n++;c.sx+=p[0];c.sz+=p[1];c.x=p[0];c.z=p[1];}
 return {count:cl.filter(c=>c.n>=3).length,top:cl.sort((a,b)=>b.n-a.n).slice(0,6).map(c=>[+(c.sx/c.n).toFixed(1),+(c.sz/c.n).toFixed(1),c.n,c.y])};}
const out={pierMeshes,boards:boards.map(b=>b.id),stats:{}};
for(const [id,s] of Object.entries(stats)){out.stats[id]={treadM2:s.treadM2,elevatedM2:s.elevatedM2,stackedM2:s.stackedM2,coplanarM2:s.coplanarM2,edgeM:s.edgeM,walledM:s.walledM,landsM:s.landsM,stepM:s.stepM,openM:s.openM,stackedSites:sites(s.stacked),openSites:sites(s.open),stepSites:sites(s.steps)};}
return out;})()
