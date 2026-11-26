// node cap.mjs <origin> <tier> <outdir> <pose>...   pose = name,x,z,bearing,tilt,dist[,zoom]
// env EVAL=<file.js>: run that expression after load and write eval-<tier>.json
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { launchChrome } from '../../../../../scripts/chrome-cdp.mjs';
const W = 1200, H = 720;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const [origin, tier, out, ...poses] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await launchChrome('cr-cap-', ['--headless=new', '--ignore-gpu-blocklist', '--use-angle=metal', `--window-size=${W},${H}`]);
writeFileSync(out + '/.chrome', browser.profile);
const ws = new WebSocket(browser.wsUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id; pending.set(n, m => m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result));
  ws.send(JSON.stringify({ id: n, method, params }));
});
const evaluate = async expression => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 800));
  return r.result.value;
};
try {
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  const first = poses[0]?.split(',') ?? ['x', 565, -1279, 35, 55, 430];
  const url = `${origin}/?view=city&dev&mindist=20&q=${tier}&cam=${first.slice(1, 6).join(',')}&t=2026-11-20T14:00:00-05:00&speed=0&weather=clear`;
  await send('Page.navigate', { url });
  for (let i = 0; i < 600; i++) { if (await evaluate('!!window.__cityDev && !!window.__setView')) break; await sleep(200); }
  await sleep(8000);
  const href = await evaluate('location.href');
  if (!href.startsWith(origin)) throw Error('wrong page ' + href);
  if (process.env.EVAL) {
    const res = await evaluate(readFileSync(process.env.EVAL, 'utf8'));
    writeFileSync(`${out}/eval-${tier}.json`, JSON.stringify(res));
  }
  if (poses.length) await evaluate("document.head.appendChild(Object.assign(document.createElement('style'),{textContent:'body > *:not(#view3d), #view3d > *:not(#view3d-canvas), #view3d-canvas > *:not(canvas){display:none!important}'}));window.dispatchEvent(new Event('resize'));true");
  for (const pose of poses) {
    if (pose.startsWith('freeze:')) {
      // freeze:name,cameraJsonPath — reuse a saved camera's exact matrices.
      const [name, file] = pose.slice(7).split(',');
      const F = JSON.parse(readFileSync(file, 'utf8'));
      await evaluate(`window.__restoreEye?.()`);
      if (F.cam) { const [cx, cz, cb, ct, cd] = F.cam.split(','); await evaluate(`__setView(${cb},${ct},${cd},${cx},${cz},${F.zoom ?? 1})`); }
      else await evaluate(`__setView(0,60,150,${F.position[0]},${F.position[2]})`);
      await sleep(1500);
      await evaluate(`(()=>{const {scene,camera}=__cityDev;const F=${JSON.stringify(F)};
        const prev=scene.onBeforeRender,su=camera.updateMatrixWorld,sw=camera.updateWorldMatrix;
        const lock=()=>{camera.position.fromArray(F.position);camera.matrixWorldInverse.fromArray(F.matrixWorldInverse);camera.matrixWorld.copy(camera.matrixWorldInverse).invert();camera.matrix.copy(camera.matrixWorld);camera.quaternion.setFromRotationMatrix(camera.matrixWorld);camera.projectionMatrix.fromArray(F.projectionMatrix);camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();};
        camera.updateMatrixWorld=lock;camera.updateWorldMatrix=lock;scene.onBeforeRender=function(...a){prev.apply(this,a);if(a[2]===camera)lock();};lock();
        window.__restoreEye=()=>{scene.onBeforeRender=prev;camera.updateMatrixWorld=su;camera.updateWorldMatrix=sw;delete window.__restoreEye;};return true;})()`);
      await sleep(3000);
      const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
      writeFileSync(`${out}/${name}-${tier}.jpg`, Buffer.from(shot.data, 'base64'));
      writeFileSync(`${out}/${name}-${tier}-camera.json`, JSON.stringify({ frozenFrom: file, ...F }));
      await evaluate(`window.__restoreEye?.()`);
      console.log('wrote', name, tier); continue;
    }
    if (pose.startsWith('eye:')) {
      // eye:name,x,z,heightAboveTopSurface,bearingDeg(clockwise from north),pitchDeg,vfovDeg
      const [name, x, z, dh, bearing, pitch, fov] = pose.slice(4).split(',');
      await evaluate(`window.__restoreEye?.()`);
      await evaluate(`__setView(${bearing},60,200,${x},${z})`); await sleep(1500);
      await evaluate(`(async()=>{const THREE=await import('/node_modules/.vite/deps/three.js');const {scene,camera}=__cityDev;
        const decks=[];scene.traverseVisible(m=>{if(!m.isMesh||m.isInstancedMesh)return;const p=[];for(let o=m;o&&o!==scene;o=o.parent)p.unshift(o.name||'');const l=p.join('/');if(l.includes('Decks and embedded rails')||l.includes('bridge approaches')||l.endsWith('Group/Mesh')||m===[...__cityDev.areas().values()].find(a=>a.bounds.minX<=${x}&&a.bounds.maxX>=${x}&&a.bounds.minZ<=${z}&&a.bounds.maxZ>=${z})?.board)decks.push(m);});
        const rc=new THREE.Raycaster(new THREE.Vector3(${x},300,${z}),new THREE.Vector3(0,-1,0));const hit=rc.intersectObjects(decks,false)[0];if(!hit)throw Error('no surface under eye');
        const b=${bearing}*Math.PI/180,pt=${pitch}*Math.PI/180;const pos=new THREE.Vector3(${x},hit.point.y+${dh},${z});
        const c=camera.clone();c.fov=${fov};c.zoom=1;c.near=.1;c.aspect=innerWidth/innerHeight;c.updateProjectionMatrix();c.position.copy(pos);c.lookAt(pos.x+Math.sin(b)*Math.cos(pt)*50,pos.y+Math.sin(pt)*50,pos.z-Math.cos(b)*Math.cos(pt)*50);c.updateMatrixWorld();
        const F={position:c.position.toArray(),pm:c.projectionMatrix.toArray(),mwi:c.matrixWorldInverse.toArray(),surfaceY:hit.point.y,surface:hit.object.name};
        const prev=scene.onBeforeRender,su=camera.updateMatrixWorld,sw=camera.updateWorldMatrix;
        const lock=()=>{camera.position.fromArray(F.position);camera.matrixWorldInverse.fromArray(F.mwi);camera.matrixWorld.copy(camera.matrixWorldInverse).invert();camera.matrix.copy(camera.matrixWorld);camera.quaternion.setFromRotationMatrix(camera.matrixWorld);camera.projectionMatrix.fromArray(F.pm);camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();};
        camera.updateMatrixWorld=lock;camera.updateWorldMatrix=lock;scene.onBeforeRender=function(...a){prev.apply(this,a);if(a[2]===camera)lock();};lock();
        window.__restoreEye=()=>{scene.onBeforeRender=prev;camera.updateMatrixWorld=su;camera.updateWorldMatrix=sw;delete window.__restoreEye;};window.__eyeInfo=F;return true;})()`);
      await sleep(2500);
      const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
      writeFileSync(`${out}/${name}-${tier}.jpg`, Buffer.from(shot.data, 'base64'));
      writeFileSync(`${out}/${name}-${tier}-camera.json`, JSON.stringify(await evaluate('({eye:window.__eyeInfo,fov:__cityDev.camera.fov,viewport:[innerWidth,innerHeight]})')));
      await evaluate(`window.__restoreEye?.()`);
      console.log('wrote', name, tier); continue;
    }
    const [name, x, z, bearing, tilt, dist, zoom = 1] = pose.split(',');
    await evaluate(`__setView(${bearing},${tilt},${dist},${x},${z},${zoom})`);
    await sleep(2500);
    writeFileSync(`${out}/${name}-${tier}-camera.json`, JSON.stringify(await evaluate('({cam:"'+[x,z,bearing,tilt,dist].join(',')+'",zoom:'+zoom+',position:__cityDev.camera.position.toArray(),projectionMatrix:__cityDev.camera.projectionMatrix.toArray(),matrixWorldInverse:__cityDev.camera.matrixWorldInverse.toArray(),fov:__cityDev.camera.fov,viewport:[innerWidth,innerHeight]})')));
    const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
    writeFileSync(`${out}/${name}-${tier}.jpg`, Buffer.from(shot.data, 'base64'));
    console.log('wrote', name, tier);
  }
} finally {
  ws.close();
  await browser.close();
}
