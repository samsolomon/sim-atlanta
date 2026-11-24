#!/usr/bin/env node
/**
 * Lay screenshots out in a captioned grid and save one image, using headless Chrome (no image tools).
 *   node scripts/frame-strip.mjs --out strip.png [--cols 8] [--width 240] [--title text] img[=caption] ...
 * Used for perf-run --strip frames of a pan and for before/after composites.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, basename, extname } from 'node:path';

const args = process.argv.slice(2);
let out = null, cols = 8, width = 240, title = '';
const imgs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out') out = resolve(args[++i]);
  else if (args[i] === '--cols') cols = Number(args[++i]);
  else if (args[i] === '--width') width = Number(args[++i]);
  else if (args[i] === '--title') title = args[++i];
  else {
    const [path, caption] = args[i].split('=');
    imgs.push({ path: resolve(path), caption: caption ?? basename(path, extname(path)) });
  }
}
if (!out || !imgs.length) { console.error('usage: frame-strip.mjs --out file.png [--cols N] [--width px] [--title t] img[=caption]...'); process.exit(2); }

const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const mime = p => (/\.png$/i.test(p) ? 'image/png' : 'image/jpeg');
// Inline the images so the page needs no file access beyond itself.
const cells = imgs.map(({ path, caption }) =>
  `<figure><img src="data:${mime(path)};base64,${readFileSync(path).toString('base64')}"><figcaption>${esc(caption)}</figcaption></figure>`).join('');
const n = Math.min(cols, imgs.length);
const pageW = n * (width + 8) + 8;
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#111;color:#eee;font:13px -apple-system,Helvetica,sans-serif}
h1{font-size:15px;font-weight:600;margin:8px}
main{display:grid;grid-template-columns:repeat(${n},${width}px);gap:8px;padding:0 8px 8px}
figure{margin:0}img{width:${width}px;display:block}figcaption{padding:3px 0 0}
</style>${title ? `<h1>${esc(title)}</h1>` : ''}<main>${cells}</main>`;

const dir = mkdtempSync(join(tmpdir(), 'strip-'));
const page = join(dir, 'strip.html');
writeFileSync(page, html);
// Height: measured from the first image's aspect ratio (all frames come from one viewport).
const first = readFileSync(imgs[0].path);
const dims = (() => {
  if (first[0] === 0x89) return [first.readUInt32BE(16), first.readUInt32BE(20)];
  for (let i = 2; i < first.length;) {
    const len = first.readUInt16BE(i + 2);
    if (first[i + 1] >= 0xc0 && first[i + 1] <= 0xc2) return [first.readUInt16BE(i + 7), first.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  return [9, 16];
})();
const rows = Math.ceil(imgs.length / n);
const pageH = (title ? 34 : 0) + rows * (Math.round((width * dims[1]) / dims[0]) + 28) + 8;
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const r = spawnSync(CHROME, ['--headless=new', `--user-data-dir=${join(dir, 'p')}`, '--hide-scrollbars', '--force-device-scale-factor=1',
  `--window-size=${pageW},${pageH}`, `--screenshot=${out}`, `file://${page}`], { stdio: 'ignore', timeout: 60000 });
rmSync(dir, { recursive: true, force: true });
if (r.status !== 0) { console.error('chrome failed'); process.exit(1); }
console.log(out);
