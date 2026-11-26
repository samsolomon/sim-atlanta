import { writeFileSync } from 'node:fs';
import { launchChrome } from '../../../../../scripts/chrome-cdp.mjs';
const [dir, out, ...items] = process.argv.slice(2); // item = name|title
const b = await launchChrome('cr-compose-', ['--headless=new', '--allow-file-access-from-files']);
const ws = new WebSocket(b.wsUrl); await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0; const p = new Map(); ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && p.has(m.id)) { p.get(m.id)(m); p.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const n = ++id; p.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1640, height: 560, deviceScaleFactor: 1, mobile: false });
  for (const item of items) {
    const [name, title] = item.split('|');
    const html = `<html><body style="margin:0;background:#1b1d22;font:600 20px system-ui;color:#eee"><div style="padding:10px 16px">${title}</div><div style="display:flex;gap:8px;padding:0 8px 8px">${['before','after'].map(k=>`<div style="flex:1;position:relative"><img src="file://${dir}/${k}/${name}.jpg" style="width:100%;display:block"><div style="position:absolute;left:10px;top:10px;background:${k==='before'?'#b33':'#2a7'};padding:4px 10px;border-radius:4px">${k.toUpperCase()}</div></div>`).join('')}</div></body></html>`;
    writeFileSync(`${dir}/${name}.html`, html);
    await send('Page.navigate', { url: `file://${dir}/${name}.html` }); await new Promise(r => setTimeout(r, 1200));
    const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85, captureBeyondViewport: false });
    writeFileSync(`${out}/${name}-before-after.jpg`, Buffer.from(shot.result.data, 'base64')); console.log('wrote', name);
  }
} finally { ws.close(); await b.close(); }
