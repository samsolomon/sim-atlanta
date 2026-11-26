(async()=>{const THREE=await import('/node_modules/.vite/deps/three.js');const {scene}=__cityDev;
__setView(200,60,160,555,595); await new Promise(r=>setTimeout(r,6000));
const ms=[];scene.traverse(o=>{if(o.isMesh&&o.visible)ms.push(o)});const rc=new THREE.Raycaster();const out=[];
for(const [x,z] of [[556.673, 595.669], [555.966, 594.962], [555.259, 594.255], [554.552, 593.548], [553.845, 592.841], [553.138, 592.134], [552.431, 591.427], [556.249, 596.093], [555.542, 595.386], [554.835, 594.679], [554.128, 593.972], [553.421, 593.265], [552.714, 592.558], [552.007, 591.851], [555.754, 596.588], [555.047, 595.881], [554.34, 595.174], [553.633, 594.467], [552.926, 593.76], [552.219, 593.053], [551.512, 592.346]]){rc.set(new THREE.Vector3(x,60,z),new THREE.Vector3(0,-1,0));
out.push([x,z,rc.intersectObjects(ms,false).filter(q=>q.point.y<0).slice(0,4).map(q=>{const p=[];for(let o=q.object;o&&o!==scene;o=o.parent)p.unshift((o.name||o.type)+'#'+o.id);return [+q.point.y.toFixed(3),p.join('/')]})]);}
return out;})()
