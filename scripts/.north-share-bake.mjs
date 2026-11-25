// Bake City pictures and crawler-readable entry pages into the finished Vite build.
import { launchChrome } from './chrome-cdp.mjs';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';

const web = fileURLToPath(new URL('../web/', import.meta.url));
const { createServer } = await import(createRequire(join(web, 'package.json')).resolve('vite'));
const dist = join(web, '..', '.study', 'diagnostic');
const cameras = JSON.parse(await readFile(join(web, 'src/ui/share-cameras.json')));
const places = JSON.parse(await readFile(join(dist, 'data/ga/neighborhoods.json')));
const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pages = new Map();
for (const { properties: { name } } of places.features) {
  const id = slug(name);
  if (pages.has(id) && pages.get(id).name !== name) throw Error('Duplicate share slug ' + id);
  pages.set(id, { name, cam: cameras.neighborhoods[name] });
}
for (const v of cameras.views) pages.set('view-' + v.id, v);
const template = await readFile(join(dist, 'index.html'), 'utf8');
const escape = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const output = join(dist, 'previews');
await mkdir(output, { recursive: true });
const server = await createServer({root: web, server: {host: '127.0.0.1', port: 0}, logLevel: 'error'});
await server.listen();
try {
  const browser = await launchChrome('share-preview-', ['--headless=new', '--ignore-gpu-blocklist','--enable-unsafe-swiftshader']);
  try {
    const ws = new WebSocket(browser.wsUrl);
    await new Promise(resolve => ws.addEventListener('open', resolve, {once:true}));
    const pending = new Map();
    let seq = 0;
    ws.onmessage = ({data}) => {
      const m = JSON.parse(data);
      if (!pending.has(m.id)) return;
      const {resolve,reject} = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) reject(Error(m.error.message)); else resolve(m.result);
    };
    const send = (method,params) => new Promise((resolve,reject) => {
      pending.set(++seq,{resolve,reject});
      ws.send(JSON.stringify({id:seq,method,params}));
    });
    const evaluate = async expression => {
      const r = await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
      if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    };
    await send('Emulation.setDeviceMetricsOverride',{width:1200,height:630,mobile:false,deviceScaleFactor:1});
    await send('Page.navigate',{url:server.resolvedUrls.local[0]+'?view=city&q=high&perf=1&t=2026-11-20T14:00:00-05:00&speed=0'});
    const deadline = Date.now()+300000;
    while (!await evaluate('window.__cityDev?.areas()?.size === 12 && window.__perf?.phases.some(p=>p.name==="ready")')) {
      if (Date.now()>deadline) throw Error('City failed to load all twelve areas for previews');
      await wait(400);
    }
    function addPreviewCard() {
      const style = document.createElement('style');
      style.textContent = `
        body > *:not(#view3d):not(.preview), #view3d > *:not(#view3d-canvas),
        #view3d-canvas > *:not(canvas) { display: none !important }
        .preview { position: fixed; z-index: 99999; font: 700 52px/1.06 system-ui; color: #171717 }
        .card { bottom: 44px; left: 44px; background: #faf8f0c9; backdrop-filter: blur(18px);
          border: 1px solid #ffffffb0; border-radius: 32px; padding: 24px 30px; max-width: 770px }
        .brand { display: flex; align-items: center; gap: 16px }
        .brand img { width: 46px }
        .eyebrow { font-size: 20px; letter-spacing: .12em; margin-bottom: 12px }
        .eyebrow img { width: 21px }
        .domain { right: 44px; bottom: 44px; font-size: 24px; font-weight: 600; color: white; text-shadow: 0 1px 6px #000 }
      `;
      document.head.append(style);
      document.body.insertAdjacentHTML('beforeend', `
        <div class="preview card">
          <div class="brand"><img src="/favicon-light.svg"><span></span></div>
          <div class="name"></div>
        </div>
        <div class="preview domain">atlanta.solomon.io</div>`);
      return document.querySelector('.brand img').decode();
    }
    function framePreview({ name, cam }) {
      const [x, z, bearing, tilt, distance] = cam.split(',').map(Number);
      window.__setView(bearing, tilt, distance, x, z);
      document.querySelector('.brand').classList.toggle('eyebrow', !!name);
      document.querySelector('.brand span').textContent = name ? 'SIM ATLANTA' : 'Sim Atlanta';
      document.querySelector('.name').textContent = name;
      return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    await evaluate(`(${addPreviewCard.toString()})()`);
    const cover = ['default', { name: '', cam: '160,-380,32,55,1700' }];
    for (const [id, page] of [cover, ...pages]) {
      if (!page.cam) continue;
      await evaluate(`(${framePreview.toString()})(${JSON.stringify(page)})`);
      if (id === 'view-connector-dusk') {
        await evaluate('__scene({offsetMin:200})');
        await wait(400);
      }
      const {data} = await send('Page.captureScreenshot',{format:'jpeg',quality:90});
      await writeFile(join(output,id+'.jpg'),Buffer.from(data,'base64'));
    }
    ws.close();
  } finally { await browser.close(); }
} finally { await server.close(); }
for (const [id,{name,cam}] of pages) {
  const title=escape(name+' · Sim Atlanta');
  const html=template.replaceAll('"https://atlanta.solomon.io/"', '"https://atlanta.solomon.io/s/'+id+'/"')
    .replaceAll('content="Sim Atlanta"', 'content="'+title+'"').replace('<title>Sim Atlanta</title>', '<title>'+title+'</title>').replaceAll('/previews/default.jpg','/previews/'+(cam?id:'default')+'.jpg');
  const dir=join(dist,'s',id);
  await mkdir(dir,{recursive:true});
  await writeFile(join(dir,'index.html'),html);
}
console.log('Built '+pages.size+' static share entries.');
