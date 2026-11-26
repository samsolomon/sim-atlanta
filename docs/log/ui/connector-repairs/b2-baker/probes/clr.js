(async()=>{const THREE=await import('/node_modules/.vite/deps/three.js');const {scene}=__cityDev;
__setView(150,60,200,1000,-790); await new Promise(r=>setTimeout(r,6000));
const ms=[];scene.traverse(o=>{if(o.isMesh&&o.visible)ms.push(o)});const rc=new THREE.Raycaster();const out=[];
for(const [x,z] of [[946.7,-799.8],[951.66,-791.8],[988.77,-804.31],[995.88,-794.85]]){rc.set(new THREE.Vector3(x,60,z),new THREE.Vector3(0,-1,0));
out.push([x,z,rc.intersectObjects(ms,false).filter(q=>q.point.y<-15).slice(0,6).map(q=>{const p=[];for(let o=q.object;o&&o!==scene;o=o.parent)p.unshift((o.name||o.type)+'#'+o.id);return [+q.point.y.toFixed(3),p.join('/')]})]);}
return out;})()
