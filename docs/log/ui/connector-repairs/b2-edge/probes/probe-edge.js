(async()=>{const THREE=await import('/node_modules/.vite/deps/three.js');const {scene}=__cityDev;const W=[{"step": "auburn-edge", "way": 1450884836, "pts": [[1037.37, -496.54], [1045.81, -497.53]], "lengthM": 8.5, "spans": [[[0.0, 303.67, 1], [0.25, 303.69], [5.0, 304.04], [8.5, 304.11]]]}];
__setView(180,62,120,1042,-497); await new Promise(r=>setTimeout(r,6000));
const deck=[],ground=[];scene.traverse(o=>{if(!o.isMesh)return;const p=[];for(let q=o;q&&q!==scene;q=q.parent)p.unshift(q.name||q.type);const n=p.join('/');if(n.includes('Decks and embedded rails'))deck.push(o);else if(o.visible)ground.push(o);});
const rc=new THREE.Raycaster();rc.firstHitOnly=false;const out=[];
for(const w of W){let run=0;const P=w.pts;for(let i=1;i<P.length;i++){const [ax,az]=P[i-1],[bx,bz]=P[i],l=Math.hypot(bx-ax,bz-az);
 for(let t=0;t<l;t+=0.25){const s=run+t;const sp=w.spans.find(q=>s>=q[0][0]&&s<=q.at(-1)[0]);if(!sp)continue;let k=1;while(k<sp.length-1&&sp[k][0]<s)k++;const h=sp[k-1][1]+(sp[k][1]-sp[k-1][1])*(s-sp[k-1][0])/((sp[k][0]-sp[k-1][0])||1);
  for(const off of [0,-1.6,1.6]){const x=ax+(bx-ax)*t/l-off*(bz-az)/l,z=az+(bz-az)*t/l+off*(bx-ax)/l;rc.set(new THREE.Vector3(x,60,z),new THREE.Vector3(0,-1,0));
  const dh=rc.intersectObjects(deck,false).map(q=>q.point.y).filter(y=>y>h-323.8-1.5&&y<h-323.8+1.5);const gh=rc.intersectObjects(ground,false).map(q=>q.point.y);
  out.push([off?w.way+'@'+off:w.way,+s.toFixed(2),+x.toFixed(2),+z.toFixed(2),+(h-323.8).toFixed(3),dh.length?+Math.max(...dh).toFixed(3):null,gh.length?+Math.max(...gh).toFixed(3):null]);}}
 run+=l;}}
return out;})()