#!/usr/bin/env node
/**
 * Four-side review sheet for a City skin: day captures from four bearings, the skin outlined in
 * magenta (its footprint ring projected from the ground to its top through the live camera), and
 * the four frames composited into one JPEG with captions.
 *
 *   node scripts/four-side-sheet.mjs --id osm:way:886041059 --ground 310.6 --top 89 \
 *     --out docs/log/ui/lilli-midtown/lilli-midtown-four-sides.jpg [--dist 400] [--tilt 55]
 *     [--bearings 0,90,180,270] [--at 11:30] [--name "Lilli Midtown"] [--x 660 --z -2177]
 *     [--base http://127.0.0.1:5173]
 *
 * Requires a running dev server (`pnpm dev`, passed as --base): production builds have no `__cityDev` hook.
 * The footprint and default target come from the staged scene data; --ground is the street datum in NAVD88 metres (lidar ground) and
 * --top the skin's highest point above it. A bearing can carry its own tilt, e.g. 145:62, when a
 * neighbour hides the building from the default angle.
 *
 * Chrome is started with chrome-cdp launchChrome (its own profile, --remote-debugging-port=0), so
 * the script only ever drives the page it opened, and it closes that Chrome when done.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { launchChrome } from './chrome-cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) =>
  a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? 'true' : all[i + 1]]] : acc, []));
for (const need of ['id', 'ground', 'top', 'out']) if (!args[need]) { console.error(`missing --${need}`); process.exit(2); }
const base = args.base ?? 'http://127.0.0.1:5173';
const dist = Number(args.dist ?? 400), defaultTilt = Number(args.tilt ?? 55), at = args.at ?? '11:30';
const bearings = (args.bearings ?? '0,90,180,270').split(',').map(s => { const [b, t] = s.split(':'); return { b: Number(b), t: Number(t ?? defaultTilt) }; });
const W = 1350, H = 670;

// Find the building in the staged scene data.
function* files(dir) { for (const f of readdirSync(dir)) { const p = join(dir, f); statSync(p).isDirectory() ? yield* files(p) : f.endsWith('.json') && (yield p); } }
let site = null;
for (const f of files('web/public/data/scene')) {
  const text = readFileSync(f, 'utf8');
  if (!text.includes(`"${args.id}"`)) continue;
  const find = o => { if (!o || typeof o !== 'object') return null; if (o.id === args.id && o.rings) return o; for (const v of Object.values(o)) { const r = find(v); if (r) return r; } return null; };
  site = find(JSON.parse(text)); if (site) break;
}
if (!site) { console.error(`${args.id} not found in web/public/data/scene`); process.exit(1); }
const ring = site.rings[0];
const x = Number(args.x ?? ring.reduce((s, p) => s + p[0], 0) / ring.length);
const z = Number(args.z ?? ring.reduce((s, p) => s + p[1], 0) / ring.length);
const name = args.name ?? site.name ?? args.id;
// Scene y = NAVD88 height − sceneZero (one constant for every board's ground.json).
let sceneZero = null;
for (const f of files('web/public/data/scene')) {
  if (!f.endsWith('ground.json')) continue;
  const m = readFileSync(f, 'utf8').match(/"sceneZeroNavd88M":\s*([-\d.]+)/);
  if (m) { sceneZero = Number(m[1]); break; }
}
if (sceneZero === null) { console.error('sceneZeroNavd88M not found in ground.json'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await launchChrome('four-side-', ['--headless=new', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', `--window-size=${W},${H}`]);
const ws = new WebSocket(browser.wsUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id; pending.set(n, m => m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result));
  ws.send(JSON.stringify({ id: n, method, params }));
});
const evaluate = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;

try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  const frames = [];
  for (const { b, t } of bearings) {
    const url = `${base}/?view=city&q=low&t=2026-11-20T${at}:00-05:00&cam=${x.toFixed(0)},${z.toFixed(0)},${b},${t},${dist}`;
    await send('Page.navigate', { url });
    await sleep(3000);
    if (!(await evaluate('location.href')).startsWith(base)) throw new Error('page left the dev server');
    for (let i = 0; i < 120; i++) {
      if (await evaluate('window.__cityDev?.areaCount?.() === 12 && !document.body.innerText.includes("Building the city")')) break;
      await sleep(1000);
    }
    await sleep(14000); // texture upload and shadow settle
    await evaluate('[...document.querySelectorAll("button")].find(b => b.textContent.trim() === "Got it")?.click()');
    await sleep(300);
    const box = await evaluate(`(() => {
      const c = window.__cityDev.camera; c.updateMatrixWorld();
      const v = c.matrixWorldInverse.elements, p = c.projectionMatrix.elements;
      const ys = [${Number(args.ground) - sceneZero}, ${Number(args.ground) + Number(args.top) - sceneZero}];
      let b = [9, 9, -9, -9];
      for (const [x, z] of ${JSON.stringify(ring)}) for (const y of ys) {
        const vx = v[0]*x + v[4]*y + v[8]*z + v[12], vy = v[1]*x + v[5]*y + v[9]*z + v[13], vz = v[2]*x + v[6]*y + v[10]*z + v[14];
        const cx = p[0]*vx + p[4]*vy + p[8]*vz + p[12], cy = p[1]*vx + p[5]*vy + p[9]*vz + p[13], cw = p[3]*vx + p[7]*vy + p[11]*vz + p[15];
        b = [Math.min(b[0], cx/cw), Math.min(b[1], cy/cw), Math.max(b[2], cx/cw), Math.max(b[3], cy/cw)];
      }
      return [(b[0]+1)/2, (1-b[3])/2, (b[2]+1)/2, (1-b[1])/2];
    })()`);
    const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
    frames.push({ b, t, box, data: shot.data });
    console.log(`bearing ${b} tilt ${t}: box ${box.map(n => n.toFixed(2)).join(',')}`);
  }

  // Composite the four frames in the same browser, on a blank page.
  await send('Page.navigate', { url: 'about:blank' }); await sleep(500);
  // Face shown for a view heading (bearing): 0 looks north at the south face, 90 at the west face.
  const face = { 0: 'South', 45: 'South-west', 90: 'West', 135: 'North-west', 145: 'North-west', 180: 'North', 215: 'North-east', 225: 'North-east', 270: 'East', 315: 'South-east' };
  const sheet = await evaluate(`(async () => {
    const frames = ${JSON.stringify(frames.map(f => ({ ...f, data: undefined })))};
    const data = ${JSON.stringify(frames.map(f => f.data))};
    const w = 675, h = 335, pad = 8, cap = 30, head = 34;
    const cv = document.createElement('canvas'); cv.width = w * 2 + pad * 3; cv.height = head + (h + cap + pad) * Math.ceil(frames.length / 2) + pad;
    const g = cv.getContext('2d'); g.fillStyle = '#181818'; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#f0f0f0'; g.font = '22px Helvetica'; g.textBaseline = 'top';
    g.fillText(${JSON.stringify(`${name}: four sides, ${at}, low tier, ${dist} m (cam target ${x.toFixed(0)},${z.toFixed(0)}); magenta box = the skin`)}, pad, 7);
    const face = ${JSON.stringify(face)};
    for (let k = 0; k < frames.length; k++) {
      const img = new Image(); img.src = 'data:image/jpeg;base64,' + data[k]; await img.decode();
      const x = pad + (k % 2) * (w + pad), y = head + pad + Math.floor(k / 2) * (h + cap + pad);
      const f = frames[k];
      g.font = '18px Helvetica'; g.fillStyle = '#e6e6e6';
      // The cam bearing is the view heading: bearing 0 looks north and shows the SOUTH face.
      g.fillText((face[f.b] ?? ('bearing ' + f.b)) + ' face (bearing ' + f.b + ', tilt ' + f.t + '°)', x, y + 6);
      g.drawImage(img, x, y + cap, w, h);
      const [l, t, r, bt] = f.box; g.strokeStyle = '#ff00ff'; g.lineWidth = 3;
      g.strokeRect(x + Math.max(2, l * w), y + cap + Math.max(2, t * h), Math.min(w - 4, (r - l) * w), Math.min(h - 4, (bt - t) * h));
    }
    return cv.toDataURL('image/jpeg', 0.86).split(',')[1];
  })()`);
  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, Buffer.from(sheet, 'base64'));
  console.log(`wrote ${args.out}`);
} finally {
  try { ws.close(); } catch { /* closed */ }
  await browser.close();
}
