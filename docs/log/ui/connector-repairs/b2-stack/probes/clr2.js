(async()=>{const THREE=await import('/node_modules/.vite/deps/three.js');const {scene}=__cityDev;
__setView(150,60,200,1115,-595); await new Promise(r=>setTimeout(r,6000));
const ms=[];scene.traverse(o=>{if(o.isMesh&&o.visible)ms.push(o)});const rc=new THREE.Raycaster();const out=[];
for(const [x,z] of [[1079.0, -594.3], [1115.8, -591.0], [1123.4, -592.6], [1150.4, -604.3], [1159.0, -609.6], [1172.4, -618.0], [1186.0, -626.8], [1211.1, -642.7], [1119.1, -602.3], [1136.96, -637.07], [1142.6, -644.8], [1155.6, -659.2], [1158.2, -661.7], [1190.1, -684.6]]){rc.set(new THREE.Vector3(x,60,z),new THREE.Vector3(0,-1,0));
out.push([x,z,rc.intersectObjects(ms,false).filter(q=>q.point.y<0).slice(0,7).map(q=>{const p=[];for(let o=q.object;o&&o!==scene;o=o.parent)p.unshift((o.name||o.type)+'#'+o.id);return [+q.point.y.toFixed(3),p.join('/')]})]);}
return out;})()
