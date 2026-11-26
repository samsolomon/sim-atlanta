(async()=>{const THREE=await import('/node_modules/.vite/deps/three.js');const {scene}=__cityDev;
__setView(180,60,200,1112,-520); await new Promise(r=>setTimeout(r,6000));
const deck=[];scene.traverse(o=>{if(!o.isMesh)return;const p=[];for(let q=o;q&&q!==scene;q=q.parent)p.unshift(q.name||q.type);if(p.join('/').includes('Decks and embedded rails'))deck.push(o);});
const rc=new THREE.Raycaster();const out=[];
for(const off of [-3,-1.5,0,1.5,3]) for(let z=-521.5;z<=-518.5;z+=0.05){const x=1111.89+off;rc.set(new THREE.Vector3(x,60,z),new THREE.Vector3(0,-1,0));const h=rc.intersectObjects(deck,false).map(q=>q.point.y).filter(y=>y>-12&&y<-6);out.push([off,+z.toFixed(2),h.length?+Math.max(...h).toFixed(3):null]);}
return out;})()
