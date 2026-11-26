// City's own follow wiring, in a real browser: a train followed from Brookwood Station into R16
// while that row is still loading. Reverting either City line that tells the mosaic about the
// vehicle (the seek, or the pending row in the follow bounds) fails this.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import type { ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';
import { expect, it } from 'vitest';

const chrome = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium'].find(path => path && existsSync(path));
const staged = existsSync('public/data/scene/square-board/r16/context.json') && existsSync('public/data/ga/timetable.json');

// Gold line, northbound, 2026-11-20: 730 m short of R16 at :25, 490 m at :33, 80 m inside at :55.
const at = (seconds: number) => `2026-11-20T14:01:${seconds}-05:00`;

const page = `
  const until = async (what, test, ms) => {
    for (const end = Date.now() + ms; Date.now() < end; await new Promise(r => setTimeout(r, 100)))
      if (await test()) return;
    throw Error('Timed out waiting for ' + what + ': ' + status());
  };
  // The card words an active follow by what is drawn (tunnel, cover, out of view); the Stop button
  // is what they share.
  const status = () => document.body.innerText.match(/Follow ended[^\\n]*/)?.[0] ??
    ([...document.querySelectorAll('button')].some(b => b.textContent === 'Stop following' && !b.hidden) ? 'following' : 'no follow');
  const jump = time => { window.__clock.baseSim = Date.parse(time); window.__clock.baseReal = performance.now(); };
  const frames = async n => { for (let i = 0; i < n; i++) await new Promise(r => requestAnimationFrame(r)); };
  const r16 = () => window.__cityDev.areas().has('r16');
  const held = async () => Number(await (await fetch('/__held')).text());
  async function check() {
    const seen = {};
    try {
      await until('the follow', () => status() === 'following', 60000);
      // A followed train counts as a moving camera for sliced builds.
      await frames(3);
      seen.movingWhileFollowing = performance.now() - window.__sliceInput.inputAt < 500;
      seen.early = await held();
      jump('${at(33)}');
      await until('R16 to be asked for', held, 20000);
      seen.askedShortOfTheRow = !r16() && status() === 'following';
      jump('${at(55)}');
      // Frames for the follow to judge the new position, and time for the card to say so.
      await frames(30);
      await new Promise(r => setTimeout(r, 1500));
      seen.insideWhileLoading = { mounted: r16(), status: status() };
      await fetch('/__release');
      await until('R16 to mount', r16, 40000);
      await frames(30);
      seen.afterMount = status();
    } catch (e) { seen.error = String(e); }
    await fetch('/__follow-result', { method: 'POST', body: JSON.stringify(seen) });
  }
  check();
`;

it.skipIf(!chrome || !staged)('keeps following a train that crosses into R16 while the row loads', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'follow-north-'));
  let report: (value: string) => void;
  const result = new Promise<string>(resolve => { report = resolve; });
  const waiting: (() => void)[] = [];
  let released = false;
  const server = await createServer({
    configFile: false, cacheDir: join(dir, 'vite'), logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, hmr: false },
    plugins: [{
      name: 'follow-north-test',
      transformIndexHtml() {
        return [{ tag: 'script', attrs: { type: 'module' }, children: page }];
      },
      configureServer(dev) {
        dev.middlewares.use((req, res: ServerResponse, next) => {
          if (released || !req.url?.includes('/square-board/r16/context.json')) return next();
          waiting.push(() => next());
        });
        dev.middlewares.use('/__held', (_req, res) => { res.end(String(waiting.length)); });
        dev.middlewares.use('/__release', (_req, res) => { released = true; waiting.splice(0).forEach(go => go()); res.end(); });
        dev.middlewares.use('/__follow-result', async (req, res) => {
          let body = '';
          for await (const chunk of req) body += chunk;
          report(body);
          res.end();
        });
      },
    }],
  });
  let browser: ReturnType<typeof spawn> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await server.listen();
    const url = server.resolvedUrls!.local[0] +
      `?view=city&q=low&follow=marta:route:GOLD&t=${at(25)}&speed=0&cam=335,-4968,180,40,600`;
    browser = spawn(chrome!, ['--headless=new', '--no-first-run', '--disable-background-timer-throttling',
      '--window-size=1000,700', '--user-data-dir=' + join(dir, 'profile'), url], { stdio: 'ignore' });
    browser.once('error', error => report(error.message));
    browser.once('exit', code => report('Chrome exited ' + code));
    timer = setTimeout(() => report('{"error":"Timed out"}'), 130_000);
    const message = await result;
    expect(JSON.parse(message), message).toEqual({
      early: 0,
      movingWhileFollowing: true,
      askedShortOfTheRow: true,
      insideWhileLoading: { mounted: false, status: 'following' },
      afterMount: 'following',
    });
  } finally {
    clearTimeout(timer);
    if (browser?.pid && browser.exitCode === null && browser.signalCode === null) {
      const stopped = new Promise(resolve => browser!.once('exit', resolve));
      browser.kill();
      await stopped;
    }
    await server.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  }
}, 150_000);
