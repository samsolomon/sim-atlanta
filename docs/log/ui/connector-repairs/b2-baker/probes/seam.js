(async()=>{const THREE=await import('/node_modules/.vite/deps/three.js');const {scene}=__cityDev;
__setView(150,60,200,1000,-790); await new Promise(r=>setTimeout(r,6000));
const deck=[];scene.traverse(o=>{if(!o.isMesh)return;const p=[];for(let q=o;q&&q!==scene;q=q.parent)p.unshift(q.name||q.type);if(p.join('/').includes('Decks and embedded rails'))deck.push(o);});
const rc=new THREE.Raycaster();const out=[];
for(const [z0,dz] of [[-802.35,0.0],[-793.96,0]]) for(const off of [-1,0,1]) for(let x=998.5;x<=1001.5;x+=0.05){const z=z0+off;rc.set(new THREE.Vector3(x,60,z),new THREE.Vector3(0,-1,0));const h=rc.intersectObjects(deck,false).map(q=>q.point.y).filter(y=>y>-33);out.push([+z.toFixed(2),+x.toFixed(2),h.length?+Math.max(...h).toFixed(3):null]);}
return out;})()
