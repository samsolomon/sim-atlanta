// node export.mjs <origin> <tier> <outdir> <site>...  site = name,x,z,bearing,tilt,dist,xmin,xmax,zmin,zmax,row1+row2
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { launchChrome } from '../../../../../scripts/chrome-cdp.mjs';
const W = 1200, H = 720, sleep = ms => new Promise(r => setTimeout(r, ms));
const [origin, tier, out, ...sites] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await launchChrome('cr-export-', ['--headless=new', '--ignore-gpu-blocklist', '--use-angle=metal', `--window-size=${W},${H}`]);
console.log('chrome profile', browser.profile);
const ws = new WebSocket(browser.wsUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, m => m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 600)); return r.result.value; };
const fn = readFileSync(new URL('./faces-filtered.mjs', import.meta.url), 'utf8');
try {
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  const f = sites[0].split(',');
  await send('Page.navigate', { url: `${origin}/?view=city&dev&mindist=20&q=${tier}&cam=${f.slice(1, 6).join(',')}&t=2026-11-20T14:00:00-05:00&speed=0&weather=clear` });
  for (let i = 0; i < 600; i++) { if (await evaluate('!!window.__cityDev && !!window.__setView')) break; await sleep(200); }
  for (const site of sites) {
    const [name, x, z, bearing, tilt, dist, xmin, xmax, zmin, zmax, rows] = site.split(',');
    await evaluate(`__setView(${bearing},${tilt},${dist},${x},${z})`);
    for (let i = 0; i < 300; i++) { if (await evaluate(`${JSON.stringify(rows.split('+'))}.every(r=>__cityDev.areas()?.has(r))`)) break; await sleep(300); }
    await sleep(+(process.env.SETTLE??7000));
    const mounted = await evaluate('[...__cityDev.areas().keys()]');
    const result = await evaluate('(()=>{const {scene,camera,areas}=__cityDev; const boards=new Map([...areas()].map(([id,a])=>[a.board,id])); const a=areas().values().next().value; a.board.geometry.computeBoundingBox(); const THREE={Vector3:camera.position.constructor,Matrix4:camera.matrixWorld.constructor,Box3:a.board.geometry.boundingBox.constructor};' + fn + ';return crossingFaces(scene,boards,THREE,' + JSON.stringify([+xmin, +xmax, +zmin, +zmax]) + ')})()');
    if (!result?.meshes?.length) throw Error('Missing scene export ' + name);
    writeFileSync(`${out}/faces-${name}-${tier}.json`, JSON.stringify(result));
    console.log(name, tier, result.meshes.length, 'meshes; mounted', mounted.join(' '));
  }
} finally { ws.close(); await browser.close(); }
