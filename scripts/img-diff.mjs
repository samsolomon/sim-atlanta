#!/usr/bin/env node
/**
 * Compare two screenshots of the same view: mean and max per-channel difference, the share of pixels
 * that differ by more than a threshold, and an output sheet with A, B and the difference amplified
 * (default 4x). Uses headless Chrome's canvas, so it needs no image libraries.
 *   node scripts/img-diff.mjs a.jpg b.jpg --out sheet.png [--gain 4] [--crop x,y,w,h] [--title text]
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { launchChrome } from './chrome-cdp.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const files = args.filter((a, i) => !a.startsWith('--') && !['--out', '--gain', '--crop', '--title', '--threshold'].includes(args[i - 1]));
if (files.length !== 2) { console.error('usage: img-diff.mjs a.jpg b.jpg --out sheet.png [--gain 4] [--crop x,y,w,h] [--title t] [--threshold 8]'); process.exit(2); }
const out = resolve(opt('--out', 'diff.png'));
const gain = Number(opt('--gain', 4));
const threshold = Number(opt('--threshold', 8));
const crop = opt('--crop', null)?.split(',').map(Number) ?? null;
const title = opt('--title', '');
const data = f => `data:${/\.png$/i.test(f) ? 'image/png' : 'image/jpeg'};base64,${readFileSync(resolve(f)).toString('base64')}`;

const browser = await launchChrome('imgdiff-chrome-', ['--headless=new']);
const ws = new WebSocket(browser.wsUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, m => (m.error ? rej(new Error(m.error.message)) : res(m.result))); ws.send(JSON.stringify({ id: n, method, params })); });
try {
  const expr = `(async () => {
    const load = src => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = src; });
    const [a, b] = await Promise.all([load(${JSON.stringify(data(files[0]))}), load(${JSON.stringify(data(files[1]))})]);
    const [cx, cy, cw, ch] = ${JSON.stringify(crop)} ?? [0, 0, a.width, a.height];
    const read = img => { const c = new OffscreenCanvas(cw, ch); const g = c.getContext('2d'); g.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch); return g.getImageData(0, 0, cw, ch); };
    const A = read(a), B = read(b), D = new ImageData(cw, ch);
    let sum = 0, max = 0, over = 0, lumA = 0, lumB = 0;
    for (let i = 0; i < A.data.length; i += 4) {
      let px = 0;
      for (let k = 0; k < 3; k++) { const d = Math.abs(A.data[i + k] - B.data[i + k]); sum += d; px = Math.max(px, d); D.data[i + k] = Math.min(255, d * ${gain}); }
      lumA += 0.2126 * A.data[i] + 0.7152 * A.data[i + 1] + 0.0722 * A.data[i + 2];
      lumB += 0.2126 * B.data[i] + 0.7152 * B.data[i + 1] + 0.0722 * B.data[i + 2];
      D.data[i + 3] = 255; max = Math.max(max, px); if (px > ${threshold}) over++;
    }
    const n = A.data.length / 4;
    // Sheet: A | B | difference x gain, with a caption row.
    const sheet = new OffscreenCanvas(cw * 3 + 16, ch + 40);
    const g = sheet.getContext('2d');
    g.fillStyle = '#111'; g.fillRect(0, 0, sheet.width, sheet.height);
    g.putImageData(A, 0, 40); g.putImageData(B, cw + 8, 40); g.putImageData(D, 2 * cw + 16, 40);
    g.fillStyle = '#eee'; g.font = '14px sans-serif';
    g.fillText(${JSON.stringify(title)} + '   mean |d| ' + (sum / n / 3).toFixed(2) + ', max ' + max + ', >${threshold}: ' + (100 * over / n).toFixed(2) + '%, luma ' + (lumA / n).toFixed(1) + ' vs ' + (lumB / n).toFixed(1) + '   (A | B | diff x${gain})', 6, 24);
    const blob = await sheet.convertToBlob({ type: 'image/png' });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return JSON.stringify({ mean: sum / n / 3, max, overShare: over / n, lumaA: lumA / n, lumaB: lumB / n, png: btoa(bin) });
  })()`;
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'evaluate failed');
  const v = JSON.parse(r.result.value);
  writeFileSync(out, Buffer.from(v.png, 'base64'));
  console.log(JSON.stringify({ mean: +v.mean.toFixed(3), max: v.max, overShare: +(100 * v.overShare).toFixed(3), lumaA: +v.lumaA.toFixed(2), lumaB: +v.lumaB.toFixed(2), out }));
  ws.close();
} finally {
  await browser.close();
}
